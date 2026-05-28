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

const url = 'https://wellfound.com/company/sudowrite/jobs';

async function testFirecrawlHtml() {
    console.log('\nTesting Firecrawl with HTML...');
    const apiKey = process.env.FIRECRAWL_KEY;
    if (!apiKey) return console.log('No key');
    try {
        const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({ url, formats: ['html'] })
        });
        console.log('firecrawl status:', res.status);
        const data = await res.json();
        const html = data?.data?.html;
        console.log('firecrawl HTML length:', html ? html.length : 'undefined');
    } catch(e) { console.log('firecrawl error:', e.message); }
}

testFirecrawlHtml();
