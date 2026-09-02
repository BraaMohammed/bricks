const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.resolve(__dirname, '../.env.local');
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

const apiKey = process.env.TINYFISH_API_KEY;

if (!apiKey) {
    console.error('❌ TINYFISH_API_KEY is not set in .env.local');
    process.exit(1);
}

console.log('🔑 Found TINYFISH_API_KEY (starts with:', apiKey.slice(0, 6) + '...)');

async function testSearch() {
    console.log('\n--- 1. Testing TinyFish Search ---');
    const query = 'Next.js web framework';
    try {
        const url = `https://api.search.tinyfish.ai?query=${encodeURIComponent(query)}`;
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'X-API-Key': apiKey,
            },
        });

        console.log(`Status: ${res.status} ${res.statusText}`);
        if (!res.ok) {
            const err = await res.text();
            console.error('Search error response:', err);
            return;
        }

        const data = await res.json();
        console.log(`Results count: ${data?.results?.length ?? 0}`);
        if (data?.results?.length) {
            console.log('Top result:');
            console.log('  Title:', data.results[0].title);
            console.log('  URL:', data.results[0].url);
            console.log('  Snippet:', (data.results[0].snippet || '').slice(0, 150));
            console.log('✅ TinyFish Search test PASSED');
        } else {
            console.warn('⚠️ No results returned, but response was ok:', data);
        }
    } catch (err) {
        console.error('❌ Search request failed:', err);
    }
}

async function testFetch() {
    console.log('\n--- 2. Testing TinyFish Fetch / Scrape ---');
    const targetUrl = 'https://news.ycombinator.com';
    try {
        const res = await fetch('https://api.fetch.tinyfish.ai', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey,
            },
            body: JSON.stringify({
                urls: [targetUrl],
                format: 'markdown',
            }),
        });

        console.log(`Status: ${res.status} ${res.statusText}`);
        if (!res.ok) {
            const err = await res.text();
            console.error('Fetch error response:', err);
            return;
        }

        const data = await res.json();
        const first = data?.results?.[0];
        if (first && first.text) {
            console.log('Title:', first.title);
            console.log('Text length:', first.text.length, 'chars');
            console.log('Text preview:\n', first.text.slice(0, 200).replace(/\n/g, ' '));
            console.log('✅ TinyFish Fetch test PASSED');
        } else {
            console.warn('⚠️ Unexpected fetch response structure:', data);
        }
    } catch (err) {
        console.error('❌ Fetch request failed:', err);
    }
}

async function run() {
    await testSearch();
    await testFetch();
}

run();
