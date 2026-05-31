// debug_diffbot_shape.js
// Dumps the raw JSON shape of Diffbot responses so we can fix extractContent correctly.
// Run: node tests/debug_diffbot_shape.js

const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8');
for (const line of env.split('\n')) {
    if (line.trim() && !line.startsWith('#')) {
        const [k, ...v] = line.split('=');
        if (k && v.length) process.env[k.trim()] = v.join('=').trim().replace(/^"|"$/g, '');
    }
}

const TOKEN = process.env.DIFFBOT_TOKEN;
if (!TOKEN) { console.error('No DIFFBOT_TOKEN'); process.exit(1); }

const CASES = [
    { label: 'TechCrunch (article endpoint)', endpoint: 'article', url: 'https://techcrunch.com/2024/05/13/openai-releases-gpt-4o/' },
    { label: 'YC blog post (article endpoint)', endpoint: 'article', url: 'https://www.ycombinator.com/blog/a-letter-from-paul-graham' },
    { label: 'HN front page (analyze endpoint)', endpoint: 'analyze', url: 'https://news.ycombinator.com' },
];

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function dump(label, endpoint, url) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  ${label}`);
    console.log(`  ${url}`);
    console.log('═'.repeat(60));

    const apiUrl = `https://api.diffbot.com/v3/${endpoint}?token=${TOKEN}&url=${encodeURIComponent(url)}`;
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(35000) });
    const data = await res.json();

    console.log('HTTP status:', res.status);
    console.log('Top-level keys:', Object.keys(data));

    // Error case
    if (data.error || data.errorCode) {
        console.log('ERROR:', data.errorCode, data.error);
        return;
    }

    // objects[] case (most endpoints)
    if (Array.isArray(data.objects)) {
        console.log('objects.length:', data.objects.length);
        if (data.objects.length > 0) {
            const obj = data.objects[0];
            console.log('objects[0] keys:', Object.keys(obj));
            console.log('  type:       ', obj.type);
            console.log('  title:      ', (obj.title || '').slice(0, 80));
            console.log('  text len:   ', (obj.text || '').length);
            console.log('  html len:   ', (obj.html || '').length);
            console.log('  pageUrl:    ', obj.pageUrl || obj.resolvedPageUrl);
            console.log('  siteName:   ', obj.siteName);
            // list type has items
            if (Array.isArray(obj.items)) {
                console.log('  items.length:', obj.items.length);
                if (obj.items[0]) console.log('  items[0] keys:', Object.keys(obj.items[0]));
            }
            // Preview any text
            const textPreview = (obj.text || obj.description || '').slice(0, 200).replace(/\s+/g, ' ');
            if (textPreview) console.log('  text preview:', textPreview);
        }
    } else {
        // Direct object (some endpoints return without objects wrapper)
        console.log('No objects[] array. Direct keys:', Object.keys(data));
        console.log('type:', data.type);
        console.log('title:', (data.title || '').slice(0, 80));
        console.log('text len:', (data.text || '').length);
        console.log('Raw (first 600):', JSON.stringify(data).slice(0, 600));
    }
}

async function run() {
    for (let i = 0; i < CASES.length; i++) {
        const { label, endpoint, url } = CASES[i];
        await dump(label, endpoint, url);
        if (i < CASES.length - 1) {
            console.log('\n⏳ Waiting 13s (rate limit)...');
            await sleep(13000);
        }
    }
    console.log('\n\nDone!');
}

run().catch(console.error);
