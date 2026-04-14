import { NextRequest, NextResponse } from 'next/server';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';

export const runtime = 'nodejs';
export const maxDuration = 60;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const MAX_CONTENT_LENGTH = 8000;

// If extracted text is below this threshold we consider it a failed/skeleton page
// and fall through to the next provider.
const MIN_USEFUL_CHARS = 300;

export interface FetchPageResponse {
    url: string;
    content: string;
    title: string;
    provider: string;
    error: string | null;
}

// ── Shared: HTML → readable text via Mozilla Readability ─────────────────────
//
// readabilityParsed = true  → Readability found a real article (static/SSR page)
// readabilityParsed = false → Readability got nothing (JS shell / SPA) — the
//   "content" is raw textContent which is typically JavaScript source code.
//   Callers SHOULD NOT treat this as usable content.

function extractReadableContent(
    html: string,
    url: string,
): { content: string; title: string; readabilityParsed: boolean } {
    try {
        const dom = new JSDOM(html, { url });
        const reader = new Readability(dom.window.document);
        const article = reader.parse();

        if (article) {
            const turndownService = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
            return {
                title: article.title ?? '',
                content: turndownService.turndown(article.content) ?? '',
                readabilityParsed: true,
            };
        }
    } catch (err) {
        console.warn('Readability parse warning:', err);
    }

    // Readability couldn't parse — fall back to raw textContent.
    // Flag readabilityParsed=false so callers know this is likely JS code, not prose.
    try {
        const dom = new JSDOM(html);
        const text = dom.window.document.body?.textContent ?? '';
        return { title: '', content: text.replace(/\s+/g, ' ').trim(), readabilityParsed: false };
    } catch {
        return { title: '', content: '', readabilityParsed: false };
    }
}

// ── Provider 1: Plain fetch + Readability (fastest, free, no cost) ────────────
// Works well for static/SSR pages. Fails for JS-heavy SPAs.
//
// Hardening strategy:
//  - Rotate UA across real Chrome versions/platforms so repeated requests look different
//  - Send full Sec-CH-UA + Sec-Fetch-* headers (Cloudflare/WAFs flag their absence)
//  - Add a Google Referer to simulate organic search traffic
//  - Retry once with a fresh UA on 403 (many soft-blocks are per-UA, not per-IP)

const FETCH_USER_AGENTS = [
    // Windows Chrome
    {
        ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        secChUa: '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        platform: '"Windows"',
    },
    {
        ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        secChUa: '"Chromium";v="122", "Google Chrome";v="122", "Not-A.Brand";v="24"',
        platform: '"Windows"',
    },
    // macOS Chrome
    {
        ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        secChUa: '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        platform: '"macOS"',
    },
    // macOS Safari
    {
        ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15',
        secChUa: '"Safari";v="17"',
        platform: '"macOS"',
    },
];

function pickRandomUA() {
    return FETCH_USER_AGENTS[Math.floor(Math.random() * FETCH_USER_AGENTS.length)];
}

function buildFetchHeaders(uaEntry: typeof FETCH_USER_AGENTS[0], url: string): Record<string, string> {
    const hostname = new URL(url).hostname;
    return {
        'User-Agent': uaEntry.ua,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        // Sec-CH-UA — fingerprinted by Cloudflare; missing = instant bot flag
        'Sec-CH-UA': uaEntry.secChUa,
        'Sec-CH-UA-Mobile': '?0',
        'Sec-CH-UA-Platform': uaEntry.platform,
        // Sec-Fetch-* — set by real browsers on every navigation request
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'cross-site',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        // Referer: simulate arriving from a Google search result
        'Referer': `https://www.google.com/search?q=${encodeURIComponent(hostname)}`,
        'Cache-Control': 'max-age=0',
    };
}

async function readWithFetch(url: string): Promise<{ content: string; title: string }> {
    async function attemptFetch(uaEntry: typeof FETCH_USER_AGENTS[0]): Promise<{ content: string; title: string }> {
        const res = await fetch(url, {
            headers: buildFetchHeaders(uaEntry, url),
            signal: AbortSignal.timeout(12000),
        });

        if (!res.ok) {
            throw new Error(`fetch failed: ${res.status} ${res.statusText}`);
        }

        const html = await res.text();
        const extracted = extractReadableContent(html, url);

        // If Readability couldn't parse, the page is a JS shell (React SPA etc.).
        // The raw textContent will be JavaScript source — not useful at all.
        // Throw so the fallback chain moves on to the next provider.
        if (!extracted.readabilityParsed) {
            throw new Error('fetch got a JS-rendered SPA — Readability could not parse readable content');
        }

        return extracted;
    }

    // First attempt
    try {
        return await attemptFetch(pickRandomUA());
    } catch (err) {
        const msg = String(err);
        // Only retry on soft HTTP blocks — not on the SPA detection above
        if (msg.includes('403') || msg.includes('429')) {
            console.warn(`  ⚠️ fetch got a block — retrying with different UA...`);
            return await attemptFetch(pickRandomUA());
        }
        throw err;
    }
}

// ── Provider 2: ScraperAPI (renders JS, bypasses blocks) ─────────────────────
//
// GET http://api.scraperapi.com?api_key=KEY&url=URL&render=true
// Returns raw HTML of the rendered page.
// Free: 1,000 requests/month
// Docs: https://docs.scraperapi.com/

async function readWithScraperAPI(url: string, apiKey: string): Promise<{ content: string; title: string }> {
    const scraperUrl = `http://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(url)}&render=true`;

    const res = await fetch(scraperUrl, {
        signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
        throw new Error(`ScraperAPI failed: ${res.status} ${res.statusText}`);
    }

    const html = await res.text();
    const extracted = extractReadableContent(html, url);

    if (!extracted.readabilityParsed) {
        throw new Error('ScraperAPI returned a JS-rendered SPA — Readability could not parse readable content');
    }

    return extracted;
}

// ── Provider 3: scrape.do ─────────────────────────────────────────────────────
//
// GET https://api.scrape.do/?token=KEY&url=URL
// Returns raw HTML of the target page.
// Free: 1,000 requests/month
// Docs: https://scrape.do/docs

async function readWithScrapeDo(url: string, apiKey: string): Promise<{ content: string; title: string }> {
    const scrapeDoUrl = `https://api.scrape.do/?token=${apiKey}&url=${encodeURIComponent(url)}&output=markdown`;

    const res = await fetch(scrapeDoUrl, {
        signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
        throw new Error(`scrape.do failed: ${res.status} ${res.statusText}`);
    }

    const markdown = await res.text();

    if (!markdown || markdown.trim().length === 0) {
        throw new Error('scrape.do returned empty markdown');
    }

    return { content: markdown, title: '' };
}

// ── Provider 4: Tavily Extract ────────────────────────────────────────────────
//
// POST https://api.tavily.com/extract
// Auth: Authorization: Bearer tvly-YOUR_API_KEY
// Body: { urls: [url], extract_depth: "basic", format: "markdown" }
// Response: { results: [{ url, raw_content, ... }], failed_results: [...] }
// Free: 1,000 requests/month (API plan)
// Docs: https://docs.tavily.com/

async function readWithTavily(url: string, apiKey: string): Promise<{ content: string; title: string }> {
    const res = await fetch('https://api.tavily.com/extract', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            urls: [url],
            extract_depth: 'basic',
            format: 'markdown',
            include_images: false,
        }),
        signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
        throw new Error(`Tavily Extract failed: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();

    // If the URL ended up in failed_results instead of results
    if (!data.results || data.results.length === 0) {
        const reason = data.failed_results?.[0]?.error ?? 'no results returned';
        throw new Error(`Tavily Extract: URL failed — ${reason}`);
    }

    const raw: string = data.results[0]?.raw_content ?? '';
    if (!raw) {
        throw new Error('Tavily Extract: empty raw_content in response');
    }

    return { content: raw, title: '' };
}

// ── Provider 5: Scrapfly ──────────────────────────────────────────────────────
//
// GET https://api.scrapfly.io/scrape?key=KEY&url=URL&format=markdown
// Returns JSON: { result: { content: "<markdown>", status_code: 200, ... } }
// Free: 200 requests/month (Trial plan)
// Docs: https://scrapfly.io/docs/scrape-api/getting-started

async function readWithScrapfly(url: string, apiKey: string): Promise<{ content: string; title: string }> {
    const scrapflyUrl = `https://api.scrapfly.io/scrape?key=${apiKey}&url=${encodeURIComponent(url)}&format=markdown`;

    const res = await fetch(scrapflyUrl, {
        signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
        throw new Error(`Scrapfly failed: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();

    // Scrapfly wraps all payload inside result{}
    const content: string = data?.result?.content ?? '';
    if (!content) {
        throw new Error(`Scrapfly: empty content in response (status_code=${data?.result?.status_code ?? 'unknown'})`);
    }

    return { content, title: '' };
}

// ── Provider 6: Firecrawl ─────────────────────────────────────────────────────
//
// POST https://api.firecrawl.dev/v1/scrape
// Auth: Authorization: Bearer YOUR_API_KEY
// Body: { url, formats: ["markdown"] }
// Response: { success: true, data: { markdown: "...", metadata: { title } } }
// Free: 500 total credits
// Docs: https://docs.firecrawl.dev/api-reference/endpoint/scrape

async function readWithFirecrawl(url: string, apiKey: string): Promise<{ content: string; title: string }> {
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            url,
            formats: ['markdown'],
        }),
        signal: AbortSignal.timeout(30000),
    });

    if (res.status === 402) {
        throw new Error('Firecrawl: insufficient credits (402)');
    }
    if (res.status === 429) {
        throw new Error('Firecrawl: rate limit exceeded (429)');
    }
    if (!res.ok) {
        throw new Error(`Firecrawl failed: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();

    if (!data.success) {
        throw new Error(`Firecrawl: API returned success=false — ${data.error ?? 'unknown error'}`);
    }

    const content: string = data?.data?.markdown ?? '';
    const title: string = data?.data?.metadata?.title ?? '';

    if (!content) {
        throw new Error('Firecrawl: empty markdown in response');
    }

    return { content, title };
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const url: string = body?.url?.trim();

        if (!url) {
            return NextResponse.json(
                { url: '', content: '', title: '', provider: 'none', error: 'Missing required field: url' } satisfies FetchPageResponse,
                { status: 400, headers: corsHeaders }
            );
        }

        try {
            new URL(url);
        } catch {
            return NextResponse.json(
                { url, content: '', title: '', provider: 'none', error: 'Invalid URL provided' } satisfies FetchPageResponse,
                { status: 400, headers: corsHeaders }
            );
        }

        console.log(`📄 Fetch-page request: ${url}`);

        // ── Stack 1: Free tier — plain fetch + Readability ────────────────────
        // No API keys required, completely free.
        // Works for static/SSR pages. Fails for JS-heavy SPAs.
        try {
            console.log(`  ↳ [1/7] Trying plain fetch + Readability...`);
            const { content, title } = await readWithFetch(url);
            if (content.length >= MIN_USEFUL_CHARS) {
                const truncated = content.slice(0, MAX_CONTENT_LENGTH);
                console.log(`  ✅ fetch extracted ${truncated.length} chars from ${url}`);
                return NextResponse.json(
                    { url, content: truncated, title, provider: 'fetch', error: null } satisfies FetchPageResponse,
                    { headers: corsHeaders }
                );
            }
            console.warn(`  ⚠️ fetch returned only ${content.length} chars (below threshold) — falling through`);
        } catch (err) {
            console.warn(`  ⚠️ fetch failed: ${err} — falling through`);
        }

        // ── Stack 2: Paid waterfall (API services) ────────────────────────────
        // Each service is tried in order of credits available per month.
        // Any service without its key is silently skipped.

        type ServiceDef = { name: string; fn: () => Promise<{ content: string; title: string }>; credits: string };
        const services: ServiceDef[] = [];

        const scraperApiKey  = process.env.SCRAPER_API_KEY;
        const scrapeDoKey    = process.env.SCRAPE_DO_KEY;
        const tavilyKey      = process.env.TAVILY_API_KEY;
        const scrapflyKey    = process.env.SCRAPFLY_KEY;
        const firecrawlKey   = process.env.FIRECRAWL_KEY;

        if (scraperApiKey) {
            services.push({ name: 'scraperapi', credits: '1000/month', fn: () => readWithScraperAPI(url, scraperApiKey) });
        }
        if (scrapeDoKey) {
            services.push({ name: 'scrape.do', credits: '1000/month', fn: () => readWithScrapeDo(url, scrapeDoKey) });
        }
        if (tavilyKey) {
            services.push({ name: 'tavily', credits: '1000/month', fn: () => readWithTavily(url, tavilyKey) });
        }
        if (scrapflyKey) {
            services.push({ name: 'scrapfly', credits: '200/month', fn: () => readWithScrapfly(url, scrapflyKey) });
        }
        if (firecrawlKey) {
            services.push({ name: 'firecrawl', credits: '500 total', fn: () => readWithFirecrawl(url, firecrawlKey) });
        }

        if (services.length === 0) {
            console.warn('  ⚠️ No paid fetch-page services configured — all stacks exhausted');
            return NextResponse.json(
                {
                    url, content: '', title: '', provider: 'none',
                    error: 'Plain fetch failed and no scraping API keys are configured. Add at least one key (SCRAPER_API_KEY, SCRAPE_DO_KEY, TAVILY_API_KEY, SCRAPFLY_KEY, or FIRECRAWL_KEY) to .env.local',
                } satisfies FetchPageResponse,
                { headers: corsHeaders }
            );
        }

        let lastError = '';

        for (let i = 0; i < services.length; i++) {
            const svc = services[i];

            try {
                const providerIndex = i + 2; // 1 = fetch, 2+ = paid services
                const total = services.length + 1;
                console.log(`  ↳ [${providerIndex}/${total}] Trying ${svc.name} (${svc.credits})...`);

                const { content, title } = await svc.fn();

                if (content.length >= MIN_USEFUL_CHARS) {
                    const truncated = content.slice(0, MAX_CONTENT_LENGTH);
                    console.log(`  ✅ ${svc.name} extracted ${truncated.length} chars from ${url}`);
                    return NextResponse.json(
                        { url, content: truncated, title, provider: svc.name, error: null } satisfies FetchPageResponse,
                        { headers: corsHeaders }
                    );
                }
                lastError = `${svc.name} returned ${content.length} chars (below ${MIN_USEFUL_CHARS} threshold)`;
                console.warn(`  ⚠️ ${lastError}${i < services.length - 1 ? ' — trying next service' : ''}`);
            } catch (err) {
                lastError = String(err);
                console.warn(`  ⚠️ ${svc.name} failed: ${lastError}${i < services.length - 1 ? ' — trying next service' : ''}`);
            }
        }

        // All providers exhausted
        console.error(`❌ All providers exhausted for ${url}. Last error: ${lastError}`);
        return NextResponse.json(
            {
                url, content: '', title: '', provider: 'none',
                error: `Could not extract useful content after trying all providers. Last error: ${lastError}`,
            } satisfies FetchPageResponse,
            { headers: corsHeaders }
        );

    } catch (err) {
        console.error('💥 Fetch-page API error:', err);
        return NextResponse.json(
            { url: '', content: '', title: '', provider: 'error', error: String(err) } satisfies FetchPageResponse,
            { status: 500, headers: corsHeaders }
        );
    }
}

// CORS preflight
export async function OPTIONS() {
    return new NextResponse(null, { status: 200, headers: corsHeaders });
}
