import { NextRequest, NextResponse } from 'next/server';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { browserPool } from '../puppeteer/browser-pool';

export const runtime = 'nodejs';
export const maxDuration = 60;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const MAX_CONTENT_LENGTH = 8000;

export interface ReaderResponse {
    url: string;
    content: string;
    title: string;
    error: string | null;
}

// ── Extract readable text from HTML using Mozilla Readability ─────────────────

function extractReadableContent(html: string, url: string): { content: string; title: string } {
    try {
        const dom = new JSDOM(html, { url });
        const reader = new Readability(dom.window.document);
        const article = reader.parse();

        if (article) {
            return {
                title: article.title ?? '',
                content: article.textContent?.trim() ?? '',
            };
        }
    } catch (err) {
        console.warn('Readability parse warning:', err);
    }

    // Fallback: strip all tags and return raw text
    try {
        const dom = new JSDOM(html);
        const text = dom.window.document.body?.textContent ?? '';
        return { title: '', content: text.replace(/\s+/g, ' ').trim() };
    } catch {
        return { title: '', content: '' };
    }
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
    let release: (() => Promise<void>) | null = null;
    let browserRelease: (() => void) | null = null;

    try {
        const body = await request.json();
        const url: string = body?.url?.trim();

        if (!url) {
            return NextResponse.json(
                { url: '', content: '', title: '', error: 'Missing required field: url' } satisfies ReaderResponse,
                { status: 400, headers: corsHeaders }
            );
        }

        // Validate URL
        try {
            new URL(url);
        } catch {
            return NextResponse.json(
                { url, content: '', title: '', error: 'Invalid URL provided' } satisfies ReaderResponse,
                { status: 400, headers: corsHeaders }
            );
        }

        console.log(`📖 Reader request: ${url}`);

        // Acquire a browser + page from the pool
        const browserInfo = await browserPool.getBrowser();
        browserRelease = browserInfo.release;

        const pageInfo = await browserPool.getPage(browserInfo.browserId);
        release = pageInfo.release;

        const page = pageInfo.page;

        // Navigate to the URL
        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 30000,
        });

        // Wait briefly for JS to render key content
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Get the full HTML
        const html = await page.content();

        // Extract readable content
        const { content, title } = extractReadableContent(html, url);

        if (!content) {
            return NextResponse.json(
                { url, content: '', title, error: 'Could not extract readable content from this page' } satisfies ReaderResponse,
                { headers: corsHeaders }
            );
        }

        const truncated = content.slice(0, MAX_CONTENT_LENGTH);
        console.log(`✅ Reader extracted ${truncated.length} chars from ${url}`);

        return NextResponse.json(
            { url, content: truncated, title, error: null } satisfies ReaderResponse,
            { headers: corsHeaders }
        );
    } catch (err) {
        console.error('💥 Reader API error:', err);
        const url = '';
        return NextResponse.json(
            { url, content: '', title: '', error: String(err) } satisfies ReaderResponse,
            { status: 500, headers: corsHeaders }
        );
    } finally {
        // Always release page and browser back to the pool
        try {
            if (release) await release();
        } catch (e) {
            console.warn('Page release error:', e);
        }
        try {
            if (browserRelease) browserRelease();
        } catch (e) {
            console.warn('Browser release error:', e);
        }
    }
}

// CORS preflight
export async function OPTIONS() {
    return new NextResponse(null, { status: 200, headers: corsHeaders });
}
