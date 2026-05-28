const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8');
for (const line of env.split('\n')) {
  if (line.trim() && !line.startsWith('#')) {
    const [key, ...vals] = line.split('=');
    if (key && vals.length) {
      process.env[key.trim()] = vals.join('=').trim().replace(/^"|"$/g, '');
    }
  }
}

const url = 'https://en.wikipedia.org/wiki/Artificial_intelligence';

async function testTavilyNormal() {
    console.log(`\nTesting Tavily on ${url}...`);
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) return console.log('No key');
    try {
        const res = await fetch('https://api.tavily.com/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({ urls: [url], extract_depth: 'basic', format: 'markdown' })
        });
        console.log('tavily status:', res.status);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
            console.log('Tavily succeeded! Extracted raw_content length:', data.results[0].raw_content.length);
            console.log('Preview:', data.results[0].raw_content.substring(0, 150).replace(/\n/g, ' '));
        } else {
            console.log('Tavily failed:', data.failed_results);
        }
    } catch(e) { console.log('tavily error:', e.message); }
}

testTavilyNormal();
