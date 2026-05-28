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

async function testFetch() {
    console.log('Testing fetch...');
    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            }
        });
        console.log('fetch status:', res.status);
        const text = await res.text();
        console.log('fetch length:', text.length);
    } catch(e) { console.log('fetch error:', e.message); }
}

async function testScraperAPI() {
    console.log('\nTesting ScraperAPI...');
    const apiKey = process.env.SCRAPER_API_KEY;
    if (!apiKey) return console.log('No key');
    try {
        const scraperUrl = `https://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(url)}&render=true`;
        const res = await fetch(scraperUrl);
        console.log('scraperapi status:', res.status);
        const text = await res.text();
        console.log('scraperapi length:', text.length);
    } catch(e) { console.log('scraperapi error:', e.message); }
}

async function testScrapeDo() {
    console.log('\nTesting scrape.do...');
    const apiKey = process.env.SCRAPE_DO_KEY;
    if (!apiKey) return console.log('No key');
    try {
        const scrapeDoUrl = `https://api.scrape.do/?token=${apiKey}&url=${encodeURIComponent(url)}&output=markdown&render=true&super=true`;
        const res = await fetch(scrapeDoUrl);
        console.log('scrape.do status:', res.status);
        const text = await res.text();
        console.log('scrape.do length:', text.length);
        console.log('scrape.do preview:', text.substring(0, 100).replace(/\n/g, ' '));
    } catch(e) { console.log('scrape.do error:', e.message); }
}

async function testTavily() {
    console.log('\nTesting Tavily...');
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) return console.log('No key');
    try {
        const res = await fetch('https://api.tavily.com/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({ urls: [url], extract_depth: 'basic', format: 'markdown' })
        });
        console.log('tavily status:', res.status);
        const text = await res.text();
        console.log('tavily preview:', text.substring(0, 100).replace(/\n/g, ' '));
    } catch(e) { console.log('tavily error:', e.message); }
}

async function testFirecrawl() {
    console.log('\nTesting Firecrawl...');
    const apiKey = process.env.FIRECRAWL_KEY;
    if (!apiKey) return console.log('No key');
    try {
        const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({ url, formats: ['markdown'] })
        });
        console.log('firecrawl status:', res.status);
        const text = await res.text();
        console.log('firecrawl preview:', text.substring(0, 100).replace(/\n/g, ' '));
    } catch(e) { console.log('firecrawl error:', e.message); }
}

async function run() {
    await testFetch();
    await testScraperAPI();
    await testScrapeDo();
    await testTavily();
    await testFirecrawl();
}

run();
