import { NextRequest } from 'next/server';
import { POST as searchPOST } from '../app/api/search/route';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function test() {
    const req = new NextRequest('http://localhost:3000/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'TinyFish AI web scraping' })
    });
    const res = await searchPOST(req);
    const data = await res.json();
    console.log('Search Status:', res.status);
    console.log('Provider used:', data.provider);
    console.log('Results count:', data.results?.length);
    if (data.results?.length) {
        console.log('Top result title:', data.results[0].title);
        console.log('Top result url:', data.results[0].url);
    }
}

test().catch(console.error);
