import { NextRequest, NextResponse } from 'next/server';
import dns from 'dns/promises';
import { extractReadableContent } from '@/lib/content-extractor';
import { pickRandomUA, buildFetchHeaders } from '@/lib/fetch-headers';

export const runtime = 'nodejs';
export const maxDuration = 60;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const MAX_CONTENT_LENGTH = 8000;

// Minimum chars to consider a result "useful". Below this we fall through.
const MIN_USEFUL_CHARS = 100;

export interface FetchPageResponse {
    url: string;
    content: string;
    title: string;
    provider: string;
    error: string | null;
}

// ── Provider 1: Plain fetch + Readability ─────────────────────────────────────
// Free, no API key, works for static/SSR pages.
// Retries once on 403 with a different UA before giving up.

async function readWithFetch(url: string): Promise<{ content: string; title: string }> {
    async function attempt(): Promise<{ content: string; title: string }> {
        const res = await fetch(url, {
            headers: buildFetchHeaders(pickRandomUA(), url),
            signal: AbortSignal.timeout(12000),
        });
        if (!res.ok) throw new Error(`fetch failed: ${res.status} ${res.statusText}`);

        const html = await res.text();
        const extracted = extractReadableContent(html, url);

        if (!extracted.readabilityParsed) {
            throw new Error('fetch got a JS-rendered SPA — Readability could not parse readable content');
        }
        return extracted;
    }

    try {
        return await attempt();
    } catch (err) {
        const msg = String(err);
        if (msg.includes('403') || msg.includes('429')) {
            console.warn(`  ⚠️ fetch got a block — retrying with different UA...`);
            return await attempt();
        }
        throw err;
    }
}

// ── Provider 2: TinyFish ──────────────────────────────────────────────────────
//
// POST https://api.fetch.tinyfish.ai
// Returns Markdown natively via format:"markdown".
// Real browser rendering, JS/SPA support, stealth handling.
//
// Limits: 150 requests/min (Free), 300 req/min (Starter), 600 req/min (Pro)
// Docs: https://docs.tinyfish.ai
// Requires: TINYFISH_API_KEY in env
//

async function readWithTinyFish(url: string, apiKey: string): Promise<{ content: string; title: string }> {
    const res = await fetch('https://api.fetch.tinyfish.ai', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey,
        },
        body: JSON.stringify({
            urls: [url],
            format: 'markdown',
        }),
        signal: AbortSignal.timeout(35000),
    });

    if (res.status === 401) throw new Error('TinyFish: 401 — API key invalid or expired');
    if (res.status === 429) throw new Error('TinyFish: 429 — rate limit exceeded');
    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`TinyFish failed: ${res.status} ${res.statusText} - ${errorText}`);
    }

    const data = await res.json();
    const result = data?.results?.[0];
    if (!result || !result.text?.trim()) {
        const errorMsg = data?.errors?.[0] ? JSON.stringify(data.errors[0]) : 'empty markdown response';
        throw new Error(`TinyFish: ${errorMsg}`);
    }

    return { content: result.text.trim(), title: result.title ?? '' };
}

// ── Provider 3: Firecrawl ─────────────────────────────────────────────────────
//
// POST https://api.firecrawl.dev/v1/scrape
// Returns native Markdown — no Readability/DOM processing needed.
// onlyMainContent: false → keeps full page content (important for React SPAs
//   like Wellfound where the "main" heuristic strips too much).
//
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
            onlyMainContent: false,   // include full page — critical for React SPAs
            blockAds: true,
            removeBase64Images: true,
        }),
        signal: AbortSignal.timeout(35000),
    });

    if (res.status === 402) throw new Error('Firecrawl: insufficient credits (402)');
    if (res.status === 429) throw new Error('Firecrawl: rate limit exceeded (429)');
    if (!res.ok) throw new Error(`Firecrawl failed: ${res.status} ${res.statusText}`);

    const data = await res.json();

    if (!data.success) {
        throw new Error(`Firecrawl: API returned success=false — ${data.error ?? 'unknown error'}`);
    }

    const markdown: string = data?.data?.markdown ?? '';
    if (!markdown) throw new Error('Firecrawl: empty markdown in response');

    const title: string = data?.data?.metadata?.title ?? '';
    return { content: markdown, title };
}

// ── Provider 3: scrape.do ─────────────────────────────────────────────────────
//
// GET https://api.scrape.do/?token=KEY&url=URL&render=true&super=true&output=markdown
// Returns Markdown natively via output=markdown.
//
// Free: 1,000 requests/month
// Docs: https://scrape.do/docs

async function readWithScrapeDo(url: string, apiKey: string): Promise<{ content: string; title: string }> {
    const apiUrl = `https://api.scrape.do/?token=${apiKey}&url=${encodeURIComponent(url)}&render=true&super=true&output=markdown`;

    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(35000) });

    if (res.status === 401) throw new Error('scrape.do: 401 — API key invalid or expired');
    if (res.status === 402) throw new Error('scrape.do: 402 — credits exhausted');
    if (res.status === 429) throw new Error('scrape.do: 429 — rate limit exceeded');
    if (!res.ok) throw new Error(`scrape.do failed: ${res.status} ${res.statusText}`);

    const markdown = await res.text();
    if (!markdown.trim()) throw new Error('scrape.do: empty markdown response');

    return { content: markdown, title: '' };
}

// ── Provider 4: ScraperAPI ────────────────────────────────────────────────────
//
// GET https://api.scraperapi.com?api_key=KEY&url=URL&output_format=markdown
// Returns Markdown natively via output_format=markdown.
//
// IMPORTANT: ScraperAPI charges a credit the moment the request is accepted,
// not when we receive the response. We use a generous 45 s timeout so the
// render completes before we abort — aborting early wastes a credit.
//
// Free: 1,000 requests/month
// Docs: https://docs.scraperapi.com/responses-and-formats/output-formats/llm-output-formats

async function readWithScraperAPI(url: string, apiKey: string): Promise<{ content: string; title: string }> {
    const apiUrl = `https://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(url)}&output_format=markdown`;

    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(45000) });

    if (res.status === 401 || res.status === 403) throw new Error(`ScraperAPI: ${res.status} — API key invalid or expired`);
    if (res.status === 429) throw new Error('ScraperAPI: 429 — rate limit exceeded');
    if (!res.ok) throw new Error(`ScraperAPI failed: ${res.status} ${res.statusText}`);

    const markdown = await res.text();
    if (!markdown.trim()) throw new Error('ScraperAPI: empty markdown response');

    return { content: markdown, title: '' };
}

// ── Provider 5: Diffbot Analyze API ──────────────────────────────────────────
//
// GET https://api.diffbot.com/v3/analyze?token=KEY&url=URL
// Returns structured JSON — handles articles, lists and discussions natively.
// Retries once with &proxy when the target site blocks Diffbot (404/403/500).
//
// Free: 10,000 requests/month
// Docs: https://docs.diffbot.com/reference/extract-analyze

async function readWithDiffbot(url: string, apiKey: string, useProxy = false): Promise<{ content: string; title: string }> {
    let apiUrl = `https://api.diffbot.com/v3/analyze?token=${apiKey}&url=${encodeURIComponent(url)}&timeout=30000`;
    if (useProxy) apiUrl += '&proxy';

    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(40000) });

    if (res.status === 401) throw new Error('Diffbot: 401 Unauthorized');
    if (res.status === 429) throw new Error('Diffbot: 429 Rate limit exceeded');

    const data = await res.json();

    if (data.errorCode || data.error) {
        if (!useProxy && (data.errorCode === 404 || data.errorCode === 403 || data.errorCode === 500)) {
            console.log(`  ⚠️ Diffbot blocked by target site (${data.errorCode}) — retrying with proxy...`);
            return readWithDiffbot(url, apiKey, true);
        }
        throw new Error(`Diffbot error ${data.errorCode}: ${data.error}`);
    }

    const obj = data.objects?.[0] ?? {};
    const type = obj.type ?? data.type ?? '(no type)';
    const title = obj.title ?? data.title ?? '';

    let text = '';
    if (type === 'list' && Array.isArray(obj.items) && obj.items.length > 0) {
        text = obj.items
            .slice(0, 30)
            .map((item: Record<string, string>) => {
                const parts: string[] = [];
                if (item.title) parts.push(item.title);
                if (item.summary) parts.push(item.summary);
                return parts.join(' — ');
            })
            .join('\n');
    } else if (type === 'discussion' && Array.isArray(obj.posts) && obj.posts.length > 0) {
        text = obj.posts
            .slice(0, 20)
            .map((p: Record<string, string>) => `${p.author ?? 'anon'}: ${p.text ?? ''}`)
            .filter((s: string) => s.length > 10)
            .join('\n\n');
    } else {
        // Use Diffbot's pre-extracted plain text fields directly — no custom parsing needed
        text = obj.text ?? obj.description ?? '';
    }

    if (!text) throw new Error(`Diffbot returned empty text for type: ${type}`);
    return { content: text, title };
}

// ── Provider 6: Tavily Extract ────────────────────────────────────────────────
//
// POST https://api.tavily.com/extract
// Returns Markdown natively via format:"markdown".
//
// Free: 1,000 requests/month
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

    if (!res.ok) throw new Error(`Tavily Extract failed: ${res.status} ${res.statusText}`);

    const data = await res.json();

    if (!data.results || data.results.length === 0) {
        const reason = data.failed_results?.[0]?.error ?? 'no results returned';
        throw new Error(`Tavily Extract: URL failed — ${reason}`);
    }

    const raw: string = data.results[0]?.raw_content ?? '';
    if (!raw) throw new Error('Tavily Extract: empty raw_content in response');

    return { content: raw, title: '' };
}

// ── Provider 7: Scrapfly ──────────────────────────────────────────────────────
//
// GET https://api.scrapfly.io/scrape?key=KEY&url=URL&format=markdown&render_js=true
// Returns Markdown natively via format=markdown.
// The result.content field contains the markdown string directly.
//
// Free: 200 requests/month (Trial)
// Docs: https://scrapfly.io/docs/scrape-api/getting-started

async function readWithScrapfly(url: string, apiKey: string): Promise<{ content: string; title: string }> {
    const apiUrl = `https://api.scrapfly.io/scrape?key=${apiKey}&url=${encodeURIComponent(url)}&render_js=true&format=markdown`;

    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(35000) });
    if (!res.ok) throw new Error(`Scrapfly failed: ${res.status} ${res.statusText}`);

    const data = await res.json();

    // With format=markdown, result.content is already the markdown string
    const markdown: string = data?.result?.content ?? '';
    if (!markdown.trim()) {
        throw new Error(`Scrapfly: empty markdown (status_code=${data?.result?.status_code ?? 'unknown'})`);
    }

    return { content: markdown, title: '' };
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

        let hostname = '';
        try {
            hostname = new URL(url).hostname;
        } catch {
            return NextResponse.json(
                { url, content: '', title: '', provider: 'none', error: 'Invalid URL provided' } satisfies FetchPageResponse,
                { status: 400, headers: corsHeaders }
            );
        }

        try {
            await dns.lookup(hostname);
        } catch {
            return NextResponse.json(
                { url, content: '', title: '', provider: 'none', error: `DNS resolution failed for "${hostname}". The website may not exist or is offline.` } satisfies FetchPageResponse,
                { status: 400, headers: corsHeaders }
            );
        }

        console.log(`📄 Fetch-page request: ${url}`);

        // ── Stack 1: Free — plain fetch + Readability ─────────────────────────
        try {
            console.log(`  ↳ [1/?] Trying plain fetch + Readability...`);
            const { content, title } = await readWithFetch(url);
            if (content.length >= MIN_USEFUL_CHARS) {
                const truncated = content.slice(0, MAX_CONTENT_LENGTH);
                console.log(`  ✅ fetch extracted ${truncated.length} chars`);
                return NextResponse.json(
                    { url, content: truncated, title, provider: 'fetch', error: null } satisfies FetchPageResponse,
                    { headers: corsHeaders }
                );
            }
            console.warn(`  ⚠️ fetch: only ${content.length} chars — falling through`);
        } catch (err) {
            console.warn(`  ⚠️ fetch failed: ${err} — falling through`);
        }

        // ── Stack 2: Paid waterfall ───────────────────────────────────────────
        // Order reflects reliability for JS-heavy sites like Wellfound:
        //   Firecrawl (best quality, native markdown) → scrape.do → ScraperAPI
        //   → Diffbot → Tavily → Scrapfly
        // Services without a configured key are silently skipped.

        type ServiceDef = { name: string; credits: string; fn: () => Promise<{ content: string; title: string }> };
        const services: ServiceDef[] = [];

        const firecrawlKey  = process.env.FIRECRAWL_KEY;
        const tinyfishKey   = process.env.TINYFISH_API_KEY;
        const scrapeDoKey   = process.env.SCRAPE_DO_KEY;
        const scraperApiKey = process.env.SCRAPER_API_KEY;
        const diffbotKey    = process.env.DIFFBOT_TOKEN;
        const tavilyKey     = process.env.TAVILY_API_KEY;
        const scrapflyKey   = process.env.SCRAPFLY_KEY;

        if (firecrawlKey)  services.push({ name: 'firecrawl',  credits: '500 total',    fn: () => readWithFirecrawl(url, firecrawlKey) });
        if (tinyfishKey)   services.push({ name: 'tinyfish',   credits: 'free tier',    fn: () => readWithTinyFish(url, tinyfishKey) });
        if (scrapeDoKey)   services.push({ name: 'scrape.do',  credits: '1000/month',   fn: () => readWithScrapeDo(url, scrapeDoKey) });
        if (scraperApiKey) services.push({ name: 'scraperapi', credits: '1000/month',   fn: () => readWithScraperAPI(url, scraperApiKey) });
        if (diffbotKey)    services.push({ name: 'diffbot',    credits: '10000/month',  fn: () => readWithDiffbot(url, diffbotKey) });
        if (tavilyKey)     services.push({ name: 'tavily',     credits: '1000/month',   fn: () => readWithTavily(url, tavilyKey) });
        if (scrapflyKey)   services.push({ name: 'scrapfly',   credits: '200/month',    fn: () => readWithScrapfly(url, scrapflyKey) });

        if (services.length === 0) {
            console.warn('  ⚠️ No paid fetch-page services configured');
            return NextResponse.json(
                {
                    url, content: '', title: '', provider: 'none',
                    error: 'Plain fetch failed and no scraping API keys are configured. Add at least one key to .env.local.',
                } satisfies FetchPageResponse,
                { headers: corsHeaders }
            );
        }

        let lastError = '';

        for (let i = 0; i < services.length; i++) {
            const svc = services[i];
            const idx = i + 2;
            const total = services.length + 1;

            try {
                console.log(`  ↳ [${idx}/${total}] Trying ${svc.name} (${svc.credits})...`);
                const { content, title } = await svc.fn();

                if (content.length >= MIN_USEFUL_CHARS) {
                    const truncated = content.slice(0, MAX_CONTENT_LENGTH);
                    console.log(`  ✅ ${svc.name} extracted ${truncated.length} chars`);
                    return NextResponse.json(
                        { url, content: truncated, title, provider: svc.name, error: null } satisfies FetchPageResponse,
                        { headers: corsHeaders }
                    );
                }

                lastError = `${svc.name} returned ${content.length} chars (below ${MIN_USEFUL_CHARS} threshold)`;
                console.warn(`  ⚠️ ${lastError}${i < services.length - 1 ? ' — trying next' : ''}`);
            } catch (err) {
                lastError = String(err);
                console.warn(`  ⚠️ ${svc.name} failed: ${lastError}${i < services.length - 1 ? ' — trying next' : ''}`);
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
