/**
 * Offline tests for the Scavio provider in /api/search and /api/fetch-page.
 * fetch and DNS are mocked; responses come from real captured fixtures.
 *
 * Run: npx tsx --test tests/test_scavio.ts
 */
import { test, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import dns from 'dns/promises';
import { NextRequest } from 'next/server';
import { POST as searchPOST } from '../app/api/search/route';
import { POST as fetchPagePOST } from '../app/api/fetch-page/route';

const fixture = (name: string) =>
    JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf-8'));

const googleFixture = fixture('scavio-google.json');
const extractFixture = fixture('scavio-extract.json');

const PROVIDER_KEYS = [
    'SERPER_API_KEY', 'TINYFISH_API_KEY', 'EXA_API_KEY', 'TAVILY_API_KEY', 'SCAVIO_API_KEY',
    'FIRECRAWL_KEY', 'SCRAPE_DO_KEY', 'SCRAPER_API_KEY', 'DIFFBOT_TOKEN', 'SCRAPFLY_KEY',
];

type Call = { url: string; init?: RequestInit };
let calls: Call[] = [];
const realFetch = globalThis.fetch;
const savedEnv: Record<string, string | undefined> = {};

function mockFetch(handler: (url: string, init?: RequestInit) => Response) {
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        calls.push({ url, init });
        return handler(url, init);
    }) as typeof fetch;
}

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const post = (url: string, body: unknown) =>
    new NextRequest(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

beforeEach(() => {
    calls = [];
    for (const key of PROVIDER_KEYS) {
        savedEnv[key] = process.env[key];
        delete process.env[key];
    }
    mock.method(dns, 'lookup', async () => ({ address: '93.184.216.34', family: 4 }));
    mock.method(console, 'log', () => {});
    mock.method(console, 'warn', () => {});
    mock.method(console, 'error', () => {});
});

afterEach(() => {
    globalThis.fetch = realFetch;
    mock.restoreAll();
    for (const key of PROVIDER_KEYS) {
        if (savedEnv[key] === undefined) delete process.env[key];
        else process.env[key] = savedEnv[key];
    }
});

// ── /api/search ──────────────────────────────────────────────────────────────

test('search: uses Scavio when SCAVIO_API_KEY is set and maps organic_results', async () => {
    process.env.SCAVIO_API_KEY = 'sk_test';
    mockFetch(() => json(googleFixture));

    const res = await searchPOST(post('http://localhost/api/search', { query: 'Stripe latest funding round' }));
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.provider, 'scavio');
    assert.equal(data.error, null);
    assert.equal(data.results.length, 5);
    assert.deepEqual(data.results[0], {
        title: googleFixture.organic_results[0].title,
        url: googleFixture.organic_results[0].link,
        snippet: googleFixture.organic_results[0].snippet.slice(0, 300),
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://api.scavio.dev/api/v2/google');
    assert.equal(calls[0].init?.method, 'POST');
    assert.equal((calls[0].init?.headers as Record<string, string>).Authorization, 'Bearer sk_test');
    assert.deepEqual(JSON.parse(String(calls[0].init?.body)), { query: 'Stripe latest funding round' });
});

test('search: Scavio runs after Tavily, not before', async () => {
    process.env.TAVILY_API_KEY = 'tvly_test';
    process.env.SCAVIO_API_KEY = 'sk_test';
    mockFetch((url) => (url.startsWith('https://api.tavily.com') ? json({ error: 'down' }, 500) : json(googleFixture)));

    const data = await (await searchPOST(post('http://localhost/api/search', { query: 'q' }))).json();

    assert.equal(data.provider, 'scavio');
    assert.deepEqual(calls.map((c) => new URL(c.url).hostname), ['api.tavily.com', 'api.scavio.dev']);
});

test('search: a Scavio error falls through to DuckDuckGo', async () => {
    process.env.SCAVIO_API_KEY = 'sk_bad';
    mockFetch((url) => (url.startsWith('https://api.scavio.dev') ? json({ error: 'Invalid API key' }, 401) : new Response('<html></html>')));

    const data = await (await searchPOST(post('http://localhost/api/search', { query: 'q' }))).json();

    assert.equal(data.provider, 'none');
    assert.deepEqual(calls.map((c) => new URL(c.url).hostname), ['api.scavio.dev', 'html.duckduckgo.com']);
});

test('search: Scavio is skipped without SCAVIO_API_KEY', async () => {
    mockFetch(() => new Response('<html></html>'));

    await searchPOST(post('http://localhost/api/search', { query: 'q' }));

    assert.ok(calls.every((c) => !c.url.includes('scavio')));
});

// ── /api/fetch-page ──────────────────────────────────────────────────────────

test('fetch-page: Scavio extracts the page when plain fetch is blocked', async () => {
    process.env.SCAVIO_API_KEY = 'sk_test';
    mockFetch((url) => (url.startsWith('https://api.scavio.dev') ? json(extractFixture) : new Response('blocked', { status: 403 })));

    const res = await fetchPagePOST(post('http://localhost/api/fetch-page', { url: 'https://news.ycombinator.com/' }));
    const data = await res.json();

    assert.equal(data.provider, 'scavio');
    assert.equal(data.error, null);
    assert.equal(data.title, 'Hacker News');
    assert.equal(data.content, extractFixture.data.content);

    const scavioCall = calls.find((c) => c.url === 'https://api.scavio.dev/api/v1/extract');
    assert.ok(scavioCall);
    assert.equal((scavioCall.init?.headers as Record<string, string>).Authorization, 'Bearer sk_test');
    assert.deepEqual(JSON.parse(String(scavioCall.init?.body)), {
        url: 'https://news.ycombinator.com/',
        format: 'markdown',
        mode: 'advanced',
    });
});

test('fetch-page: Scavio is tried last, after Scrapfly', async () => {
    process.env.SCRAPFLY_KEY = 'scp_test';
    process.env.SCAVIO_API_KEY = 'sk_test';
    mockFetch((url) => (url.startsWith('https://api.scavio.dev') ? json(extractFixture) : new Response('blocked', { status: 403 })));

    const data = await (await fetchPagePOST(post('http://localhost/api/fetch-page', { url: 'https://news.ycombinator.com/' }))).json();

    assert.equal(data.provider, 'scavio');
    const hosts = calls.map((c) => new URL(c.url).hostname);
    assert.deepEqual(hosts.slice(-2), ['api.scrapfly.io', 'api.scavio.dev']);
});

test('fetch-page: a Scavio 402 is reported, not thrown', async () => {
    process.env.SCAVIO_API_KEY = 'sk_test';
    mockFetch((url) => (url.startsWith('https://api.scavio.dev') ? json({ error: 'Insufficient credits' }, 402) : new Response('blocked', { status: 403 })));

    const data = await (await fetchPagePOST(post('http://localhost/api/fetch-page', { url: 'https://news.ycombinator.com/' }))).json();

    assert.equal(data.provider, 'none');
    assert.match(data.error, /Scavio: 402/);
});
