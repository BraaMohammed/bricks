import { NextRequest, NextResponse } from 'next/server';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';
import { browserPool } from '../puppeteer/browser-pool';

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

export interface ReaderResponse {
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
                content: turndownService.turndown(article.content || '') ?? '',
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

// ── Provider 1: Plain fetch + Readability (fastest, no cost) ─────────────────
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
        // Throw so the fallback chain moves on to ScraperAPI / Puppeteer.
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
// Requires SCRAPER_API_KEY in env. Handles CAPTCHAs and bot detection.

async function readWithScraperAPI(url: string, apiKey: string): Promise<{ content: string; title: string }> {
    const scraperUrl = `https://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(url)}&render=true`;

    const res = await fetch(scraperUrl, {
        signal: AbortSignal.timeout(45000),
    });

    if (!res.ok) {
        throw new Error(`ScraperAPI failed: ${res.status} ${res.statusText}`);
    }

    const html = await res.text();
    return extractReadableContent(html, url);
}

// ── Provider 3: Puppeteer pool (full browser, most reliable) ─────────────────
// Slowest but handles anything a real browser can.

async function readWithPuppeteer(url: string): Promise<{ content: string; title: string; release: () => Promise<void>; browserRelease: () => void }> {
    const browserInfo = await browserPool.getBrowser();
    const pageInfo = await browserPool.getPage(browserInfo.browserId);
    const page = pageInfo.page;

    await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
    });

    const html = await page.content();
    const extracted = extractReadableContent(html, url);

    return {
        ...extracted,
        release: pageInfo.release,
        browserRelease: browserInfo.release,
    };
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
    // ── Env flag: forward to /fetch-page (no-Puppeteer stack) ────────────────
    // Set READER_USE_FETCH_PAGE=true in .env.local to route all /reader traffic
    // through the puppeteer-free waterfall (fetch → ScraperAPI → scrape.do →
    // Tavily → Scrapfly → Firecrawl).
    if (process.env.READER_USE_FETCH_PAGE === 'true') {
        const baseUrl = process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : process.env.NEXT_PUBLIC_API_URL
            ?? 'http://localhost:3000';

        const body = await request.json();
        const forwardRes = await fetch(`${baseUrl}/api/fetch-page`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        const data = await forwardRes.json();
        return NextResponse.json(data, { status: forwardRes.status, headers: corsHeaders });
    }

    // Puppeteer release handles — kept here so finally block can always clean up.
    let puppeteerRelease: (() => Promise<void>) | null = null;
    let puppeteerBrowserRelease: (() => void) | null = null;

    try {
        const body = await request.json();
        const url: string = body?.url?.trim();

        if (!url) {
            return NextResponse.json(
                { url: '', content: '', title: '', provider: 'none', error: 'Missing required field: url' } satisfies ReaderResponse,
                { status: 400, headers: corsHeaders }
            );
        }

        try {
            new URL(url);
        } catch {
            return NextResponse.json(
                { url, content: '', title: '', provider: 'none', error: 'Invalid URL provided' } satisfies ReaderResponse,
                { status: 400, headers: corsHeaders }
            );
        }

        console.log(`📖 Reader request: ${url}`);

        // ── Fallback chain ────────────────────────────────────────────────────
        // Each provider is tried in order. We move to the next one only when:
        //   (a) it throws, OR
        //   (b) the extracted content is shorter than MIN_USEFUL_CHARS.
        //
        // Order rationale:
        //   1. fetch      — free, instant, works for static/SSR pages
        //   2. Puppeteer  — full browser with tracker blocking + networkidle2,
        //                   handles JS SPAs reliably without spending API credits
        //   3. ScraperAPI — paid last resort for pages Puppeteer can't crack
        //                   (heavy Cloudflare bot management, etc.)

        // 1️⃣ Plain fetch (free, instant)
        try {
            console.log(`  ↳ [1/3] Trying plain fetch...`);
            const { content, title } = await readWithFetch(url);
            if (content.length >= MIN_USEFUL_CHARS) {
                const truncated = content.slice(0, MAX_CONTENT_LENGTH);
                console.log(`  ✅ fetch extracted ${truncated.length} chars from ${url}`);
                return NextResponse.json(
                    { url, content: truncated, title, provider: 'fetch', error: null } satisfies ReaderResponse,
                    { headers: corsHeaders }
                );
            }
            console.warn(`  ⚠️ fetch returned only ${content.length} chars (below threshold) — falling through`);
        } catch (err) {
            console.warn(`  ⚠️ fetch failed: ${err} — falling through`);
        }

        // 2️⃣ Puppeteer pool (full browser, tracker-blocked, networkidle2)
        try {
            console.log(`  ↳ [2/3] Trying Puppeteer...`);
            const puppeteerResult = await readWithPuppeteer(url);
            puppeteerRelease = puppeteerResult.release;
            puppeteerBrowserRelease = puppeteerResult.browserRelease;

            const { content, title } = puppeteerResult;

            if (content.length >= MIN_USEFUL_CHARS) {
                const truncated = content.slice(0, MAX_CONTENT_LENGTH);
                console.log(`  ✅ Puppeteer extracted ${truncated.length} chars from ${url}`);
                return NextResponse.json(
                    { url, content: truncated, title, provider: 'puppeteer', error: null } satisfies ReaderResponse,
                    { headers: corsHeaders }
                );
            }
            console.warn(`  ⚠️ Puppeteer returned only ${content.length} chars — falling through`);
        } catch (err) {
            console.warn(`  ⚠️ Puppeteer failed: ${err} — falling through`);
        }

        // 3️⃣ ScraperAPI (paid, last resort — only spent when Puppeteer itself fails)
        const scraperApiKey = process.env.SCRAPER_API_KEY;
        if (scraperApiKey) {
            try {
                console.log(`  ↳ [3/3] Trying ScraperAPI...`);
                const { content, title } = await readWithScraperAPI(url, scraperApiKey);
                if (content.length >= MIN_USEFUL_CHARS) {
                    const truncated = content.slice(0, MAX_CONTENT_LENGTH);
                    console.log(`  ✅ ScraperAPI extracted ${truncated.length} chars from ${url}`);
                    return NextResponse.json(
                        { url, content: truncated, title, provider: 'scraperapi', error: null } satisfies ReaderResponse,
                        { headers: corsHeaders }
                    );
                }
                console.warn(`  ⚠️ ScraperAPI returned only ${content.length} chars — all providers exhausted`);
            } catch (err) {
                console.warn(`  ⚠️ ScraperAPI failed: ${err} — all providers exhausted`);
            }
        } else {
            console.log(`  ↳ [3/3] ScraperAPI skipped (no SCRAPER_API_KEY) — all providers exhausted`);
        }

        return NextResponse.json(
            { url, content: '', title: '', provider: 'none', error: 'Could not extract useful content after trying all providers' } satisfies ReaderResponse,
            { headers: corsHeaders }
        );


    } catch (err) {
        console.error('💥 Reader API error:', err);
        return NextResponse.json(
            { url: '', content: '', title: '', provider: 'error', error: String(err) } satisfies ReaderResponse,
            { status: 500, headers: corsHeaders }
        );
    } finally {
        // Always release Puppeteer resources if they were acquired
        try {
            if (puppeteerRelease) await puppeteerRelease();
        } catch (e) {
            console.warn('Page release error:', e);
        }
        try {
            if (puppeteerBrowserRelease) puppeteerBrowserRelease();
        } catch (e) {
            console.warn('Browser release error:', e);
        }
    }
}

// CORS preflight
export async function OPTIONS() {
    return new NextResponse(null, { status: 200, headers: corsHeaders });
}
