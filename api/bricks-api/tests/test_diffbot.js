// test_diffbot.js
// Diffbot Extract API test — /v3/article and /v3/analyze endpoints
// across a diverse set of real-world URLs to evaluate quality.
//
// Usage:   node tests/test_diffbot.js
// Requires: DIFFBOT_TOKEN in .env.local
// Free:    10,000 credits/month, resets monthly, no credit card needed
// Docs:    https://docs.diffbot.com/reference/article
//
// Key learnings from debug run:
//  - API returns HTTP 200 even for errors; check body for { errorCode, error }
//  - "article" type → content in objects[0].text
//  - "list" type    → content in objects[0].items[].summary + .title
//  - "discussion"   → content in objects[0].posts[].text
//  - Free tier rate limit: 5 req/min → 13s delay between calls

const fs = require('fs');

// ── Load .env.local ───────────────────────────────────────────────────────────
const envPath = '.env.local';
if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf-8');
    for (const line of env.split('\n')) {
        if (line.trim() && !line.startsWith('#')) {
            const [key, ...vals] = line.split('=');
            if (key && vals.length) {
                process.env[key.trim()] = vals.join('=').trim().replace(/^"|"$/g, '');
            }
        }
    }
}

const TOKEN = process.env.DIFFBOT_TOKEN;
if (!TOKEN) {
    console.error('❌  DIFFBOT_TOKEN not set in .env.local');
    console.error('   Get a free token at https://app.diffbot.com/get-started');
    process.exit(1);
}

// ── Test URLs — all verified live as of 2026 ──────────────────────────────────
const TEST_CASES = [
    // ── Articles (static SSR sites, no paywall) ───────────────────────────────
    {
        label: 'Wikipedia — AI article (dense, baseline)',
        url: 'https://en.wikipedia.org/wiki/OpenAI',
        endpoint: 'article',
        expectFields: ['title', 'text'],
    },
    {
        label: 'BBC News — tech article (static HTML)',
        url: 'https://www.bbc.com/news/technology-68265038',
        endpoint: 'article',
        expectFields: ['title', 'text'],
    },
    {
        label: 'The Guardian — open article',
        url: 'https://www.theguardian.com/technology/2024/feb/21/google-gemini-ai-under-fire',
        endpoint: 'article',
        expectFields: ['title', 'text', 'author'],
    },

    // ── Hacker News ───────────────────────────────────────────────────────────
    {
        label: 'HN front page (list type — items[])',
        url: 'https://news.ycombinator.com',
        endpoint: 'analyze',
        expectFields: ['title', 'items'],
        note: 'Should return type:list with items[]. Text extracted from items[].summary',
    },
    {
        label: 'HN discussion thread (item page)',
        url: 'https://news.ycombinator.com/item?id=39898)098',
        endpoint: 'analyze',
        expectFields: ['title'],
        note: 'Discussion/comment thread',
    },

    // ── Wellfound (formerly AngelList) — JS SPA ───────────────────────────────
    {
        label: 'Wellfound — startup profile (JS SPA)',
        url: 'https://wellfound.com/company/openai',
        endpoint: 'analyze',
        expectFields: ['title'],
        note: 'SPA — Diffbot headless renders JS. Will show if it can break through.',
    },

    // ── Y Combinator ─────────────────────────────────────────────────────────
    {
        label: 'YC — companies listing (list type)',
        url: 'https://www.ycombinator.com/companies',
        endpoint: 'analyze',
        expectFields: ['title'],
        note: 'YC company directory',
    },
    {
        label: 'YC — about page (static)',
        url: 'https://www.ycombinator.com/about',
        endpoint: 'article',
        expectFields: ['title', 'text'],
    },

    // ── Mixed ─────────────────────────────────────────────────────────────────
    {
        label: 'GitHub repo (list/non-article)',
        url: 'https://github.com/vercel/next.js',
        endpoint: 'analyze',
        expectFields: ['title'],
    },
    {
        label: 'ProductHunt — product page (SPA)',
        url: 'https://www.producthunt.com/posts/claude-3-5-sonnet',
        endpoint: 'analyze',
        expectFields: ['title'],
        note: 'SPA stress test',
    },
];

// ── Diffbot API call ──────────────────────────────────────────────────────────

async function callDiffbot(endpoint, url, useProxy = false) {
    let apiUrl = `https://api.diffbot.com/v3/${endpoint}?token=${TOKEN}&url=${encodeURIComponent(url)}&timeout=30000`;
    if (useProxy) apiUrl += '&proxy';

    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(40000) });

    if (res.status === 401) throw new Error('401 Unauthorized — check DIFFBOT_TOKEN');
    if (res.status === 429) throw new Error('429 Rate limit — wait before retrying');

    const data = await res.json();

    // Diffbot returns HTTP 200 even for errors — check the body
    if (data.errorCode || data.error) {
        if (!useProxy && data.errorCode === 404) {
            console.log(`      ⚠️  Blocked by target site (404) — retrying with Diffbot proxy...`);
            return callDiffbot(endpoint, url, true);
        }
        throw new Error(`Diffbot error ${data.errorCode}: ${data.error}`);
    }

    return data;
}

// ── Content extraction — handles all Diffbot response shapes ─────────────────
//
//  article/product  → objects[0].text  (or .description)
//  list             → objects[0].items[].summary  +  .title
//  discussion       → objects[0].posts[].text
//  analyze          → auto-detects, same fields apply per type

function extractContent(data, url) {
    const obj = data.objects?.[0] ?? {};
    const type = obj.type ?? data.type ?? '(no type)';
    const title = obj.title ?? data.title ?? '(no title)';

    let text = '';

    if (type === 'list' && Array.isArray(obj.items) && obj.items.length > 0) {
        // List pages: build a digest from items (title + summary)
        text = obj.items
            .slice(0, 30)
            .map(item => {
                const parts = [];
                if (item.title) parts.push(item.title);
                if (item.summary) parts.push(item.summary);
                if (item.link) parts.push(`[${item.link}]`);
                return parts.join(' — ');
            })
            .join('\n');
    } else if (type === 'discussion' && Array.isArray(obj.posts) && obj.posts.length > 0) {
        // Discussion threads: join top-level posts
        text = obj.posts
            .slice(0, 20)
            .map(p => `${p.author ?? 'anon'}: ${p.text ?? ''}`)
            .filter(s => s.length > 10)
            .join('\n\n');
    } else {
        // Article, product, or anything else with a direct text field
        text = obj.text ?? obj.description ?? obj.html ?? '';
    }

    return {
        type,
        title,
        text,
        author: obj.author ?? obj.byline ?? '(no author)',
        date: obj.date ?? obj.estimatedDate ?? '(no date)',
        siteName: obj.siteName ?? obj.pageUrl ? new URL(obj.pageUrl || url).hostname : '(no siteName)',
        tags: (obj.tags ?? []).slice(0, 5).map(t => t.label ?? t.name ?? String(t)).join(', ') || '(no tags)',
        itemCount: type === 'list' ? (obj.items?.length ?? 0) : 0,
        postCount: type === 'discussion' ? (obj.posts?.length ?? 0) : 0,
    };
}

// ── Run all tests ─────────────────────────────────────────────────────────────

const DELAY_MS = 13000; // 5 req/min limit → ~12s + buffer

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function runTests() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  Diffbot API Test Suite  (v2 — fixed response parsing)');
    console.log(`  Token:  ${TOKEN.slice(0, 8)}...`);
    console.log(`  Tests:  ${TEST_CASES.length} URLs`);
    console.log(`  Delay:  ${DELAY_MS / 1000}s between calls (5 req/min free limit)`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    const results = [];
    const total = TEST_CASES.length;

    for (let i = 0; i < total; i++) {
        const tc = TEST_CASES[i];
        console.log(`[${i + 1}/${total}] ${tc.label}`);
        console.log(`      URL:      ${tc.url}`);
        console.log(`      Endpoint: /v3/${tc.endpoint}`);
        if (tc.note) console.log(`      Note:     ${tc.note}`);

        const start = Date.now();

        try {
            const data = await callDiffbot(tc.endpoint, tc.url);
            const elapsed = ((Date.now() - start) / 1000).toFixed(1);
            const c = extractContent(data, tc.url);

            const textLen = c.text.length;
            const textPreview = c.text.slice(0, 220).replace(/\s+/g, ' ').trim();

            console.log(`      ─────────────────────────────────────────`);
            console.log(`      ✅ ${elapsed}s`);
            console.log(`      Type:      ${c.type}`);
            console.log(`      Title:     ${c.title.slice(0, 80)}`);
            console.log(`      Author:    ${String(c.author).slice(0, 60)}`);
            console.log(`      Date:      ${c.date}`);
            console.log(`      Site:      ${c.siteName}`);
            console.log(`      Tags:      ${c.tags}`);
            if (c.type === 'list')       console.log(`      Items:     ${c.itemCount}`);
            if (c.type === 'discussion') console.log(`      Posts:     ${c.postCount}`);
            console.log(`      TextLen:   ${textLen} chars`);
            if (textLen > 0) {
                console.log(`      Preview:   "${textPreview}${textLen > 220 ? '...' : ''}"`);
            } else {
                console.log(`      Preview:   ⚠️  No text extracted`);
            }

            results.push({ label: tc.label, url: tc.url, status: 'ok', type: c.type, title: c.title, textLen, elapsed });

        } catch (err) {
            const elapsed = ((Date.now() - start) / 1000).toFixed(1);
            console.log(`      ─────────────────────────────────────────`);
            console.log(`      ❌ ${elapsed}s — ${err.message}`);
            results.push({ label: tc.label, url: tc.url, status: 'error', error: err.message, elapsed });
        }

        console.log('');

        if (i < total - 1) {
            console.log(`      ⏳ ${DELAY_MS / 1000}s delay (rate limit)...\n`);
            await sleep(DELAY_MS);
        }
    }

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  FINAL SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');

    const ok   = results.filter(r => r.status === 'ok');
    const fail = results.filter(r => r.status === 'error');
    const rich = ok.filter(r => r.textLen > 200);

    console.log(`  Total:        ${total}`);
    console.log(`  ✅ Succeeded: ${ok.length}   ❌ Failed: ${fail.length}`);
    console.log(`  Rich text:    ${rich.length} / ${ok.length} (>200 chars)`);
    console.log('');
    console.log('  ┌──────────────────────────────────────────────────────────┐');
    console.log('  │  # │ Status │   TextLen │ Time  │ Type       │ Label     │');
    console.log('  ├──────────────────────────────────────────────────────────┤');
    results.forEach((r, i) => {
        const icon  = r.status === 'ok' ? (r.textLen > 200 ? ' ✅' : ' ⚠️ ') : ' ❌';
        const tl    = r.status === 'ok' ? `${r.textLen}c`.padStart(9) : '    err  ';
        const type  = (r.type ?? 'error').slice(0, 10).padEnd(10);
        const label = r.label.slice(0, 22).padEnd(22);
        const time  = `${r.elapsed}s`.padStart(5);
        console.log(`  │${String(i + 1).padStart(3)} │${icon}  │${tl} │${time} │ ${type} │ ${label}│`);
    });
    console.log('  └──────────────────────────────────────────────────────────┘');

    if (fail.length > 0) {
        console.log('\n  ❌ Failures:');
        fail.forEach(r => console.log(`   • ${r.label}\n     → ${r.error}`));
    }

    const empty = ok.filter(r => r.textLen <= 200);
    if (empty.length > 0) {
        console.log('\n  ⚠️  Succeeded but thin text:');
        empty.forEach(r => console.log(`   • ${r.label}  (${r.type}, ${r.textLen}c)`));
    }

    console.log(`\n  Credits used: ${total} / 10,000 free monthly`);
    console.log('  Done!\n');
}

runTests().catch(err => {
    console.error('💥 Fatal error:', err);
    process.exit(1);
});
