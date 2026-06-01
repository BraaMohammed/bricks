import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const runtime = 'nodejs';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ── Shared types ──────────────────────────────────────────────────────────────

export interface SearchResult {
    title: string;
    url: string;
    snippet: string;
}

export interface SearchResponse {
    results: SearchResult[];
    provider: string;
    error: string | null;
}

// ── Provider: Serper.dev ──────────────────────────────────────────────────────

async function searchWithSerper(query: string, apiKey: string): Promise<SearchResult[]> {
    const res = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': apiKey,
        },
        body: JSON.stringify({ q: query, num: 5 }),
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Serper error: ${res.status} ${res.statusText} - ${errorText}`);
    }

    const data = await res.json();
    const organic: Array<Record<string, string>> = data?.organic ?? [];

    return organic.slice(0, 5).map((r) => ({
        title: r.title ?? '',
        url: r.link ?? '',
        snippet: r.snippet ?? '',
    }));
}

// ── Provider: Tavily ─────────────────────────────────────────────────────────

async function searchWithTavily(query: string, apiKey: string): Promise<SearchResult[]> {
    const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            api_key: apiKey,
            query,
            max_results: 5,
            search_depth: 'basic',
            include_answer: false,
        }),
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Tavily error: ${res.status} ${res.statusText} - ${errorText}`);
    }

    const data = await res.json();
    const items: Array<Record<string, string>> = data?.results ?? [];

    return items.slice(0, 5).map((r) => ({
        title: r.title ?? '',
        url: r.url ?? '',
        snippet: r.content ? r.content.slice(0, 300) : '',
    }));
}

// ── Provider: DuckDuckGo (HTML scrape, no key) ────────────────────────────────

// ── Provider: Exa (formerly Metaphor) ─────────────────────────────────────────

async function searchWithExa(query: string, apiKey: string): Promise<SearchResult[]> {
    const res = await fetch('https://api.exa.ai/search', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
        },
        body: JSON.stringify({
            query,
            numResults: 5,
            contents: { text: true }
        }),
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Exa error: ${res.status} ${res.statusText} - ${errorText}`);
    }

    const data = await res.json();
    const items: Array<Record<string, any>> = data?.results ?? [];

    return items.slice(0, 5).map((r) => ({
        title: r.title ?? '',
        url: r.url ?? '',
        snippet: r.text ? r.text.slice(0, 300) : '',
    }));
}

// ── Provider: DuckDuckGo (HTML scrape, no key) ────────────────────────────────

async function searchWithDuckDuckGo(query: string): Promise<SearchResult[]> {
    const url = `https://html.duckduckgo.com/html?q=${encodeURIComponent(query)}`;

    const res = await fetch(url, {
        headers: {
            'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
        },
    });

    if (!res.ok) {
        throw new Error(`DuckDuckGo error: ${res.status} ${res.statusText}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const results: SearchResult[] = [];

    // DuckDuckGo HTML structure: .result__body contains .result__title and .result__snippet
    $('.result__body').each((_, el) => {
        if (results.length >= 5) return false; // break

        const titleEl = $(el).find('.result__title a');
        const snippetEl = $(el).find('.result__snippet');

        const title = titleEl.text().trim();
        const href = titleEl.attr('href') ?? '';
        const snippet = snippetEl.text().trim();

        // DDG wraps links — extract real URL from uddg param or use href directly
        let finalUrl = href;
        try {
            if (href.startsWith('/') || href.includes('duckduckgo.com')) {
                const parsed = new URL('https://html.duckduckgo.com' + href);
                finalUrl = parsed.searchParams.get('uddg') ?? href;
            }
        } catch {
            // keep original href
        }

        if (title && finalUrl) {
            results.push({ title, url: finalUrl, snippet });
        }
    });

    return results;
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const query: string = body?.query?.trim();

        if (!query) {
            return NextResponse.json(
                { results: [], provider: 'none', error: 'Missing required field: query' },
                { status: 400, headers: corsHeaders }
            );
        }

        console.log(`🔍 Search request: "${query}"`);

        const serperKey = process.env.SERPER_API_KEY;
        const tavilyKey = process.env.TAVILY_API_KEY;
        const exaKey = process.env.EXA_API_KEY;

        // Try each provider in order
        const providers: Array<{ name: string; fn: () => Promise<SearchResult[]> }> = [];

        if (serperKey) {
            providers.push({ name: 'serper', fn: () => searchWithSerper(query, serperKey) });
        }
        if (exaKey) {
            providers.push({ name: 'exa', fn: () => searchWithExa(query, exaKey) });
        }
        if (tavilyKey) {
            providers.push({ name: 'tavily', fn: () => searchWithTavily(query, tavilyKey) });
        }
        // DuckDuckGo is always available as final fallback
        providers.push({ name: 'duckduckgo', fn: () => searchWithDuckDuckGo(query) });

        let lastError = '';
        for (const provider of providers) {
            try {
                console.log(`  ↳ Trying provider: ${provider.name}`);
                const results = await provider.fn();
                if (results.length > 0) {
                    console.log(`  ✅ ${provider.name} returned ${results.length} results`);
                    return NextResponse.json(
                        { results, provider: provider.name, error: null } satisfies SearchResponse,
                        { headers: corsHeaders }
                    );
                }
                lastError = `${provider.name} returned 0 results`;
            } catch (err) {
                lastError = String(err);
                console.warn(`  ⚠️ ${provider.name} failed: ${lastError}`);
            }
        }

        // All providers failed — return empty results gracefully
        console.error(`❌ All search providers failed. Last error: ${lastError}`);
        return NextResponse.json(
            { results: [], provider: 'none', error: lastError } satisfies SearchResponse,
            { headers: corsHeaders }
        );
    } catch (err) {
        console.error('💥 Search API error:', err);
        return NextResponse.json(
            { results: [], provider: 'none', error: String(err) } satisfies SearchResponse,
            { status: 500, headers: corsHeaders }
        );
    }
}

// CORS preflight
export async function OPTIONS() {
    return new NextResponse(null, { status: 200, headers: corsHeaders });
}
