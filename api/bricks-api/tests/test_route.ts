import { NextRequest } from 'next/server';
import { POST } from '../app/api/fetch-page/route';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
    const req = new NextRequest('http://localhost:3000/api/fetch-page', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            url: 'https://wellfound.com/company/sudowrite/jobs'
        })
    });

    const res = await POST(req);
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Provider:", data.provider);
    console.log("Error:", data.error);
    console.log("Content length:", data.content ? data.content.length : 0);
    console.log("Content preview:", data.content ? data.content.substring(0, 100) : null);
}

run().catch(console.error);
