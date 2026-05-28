const URL_TO_TEST = 'https://wellfound.com/company/sudowrite/jobs';
const API_ENDPOINT = 'http://localhost:3000/api/fetch-page';

async function testFetchPageRoute() {
    console.log(`Sending POST request to ${API_ENDPOINT}...`);
    console.log(`URL to fetch: ${URL_TO_TEST}\n`);

    const startTime = Date.now();

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: URL_TO_TEST }),
        });

        const data = await response.json();
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        console.log(`⏱️  Request finished in ${duration} seconds`);
        console.log(`🟢 Status: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
            console.error('\n❌ Error response:', data);
            return;
        }

        console.log('\n✅ Success! Data returned:');
        console.log(`- Provider used: ${data.provider}`);
        console.log(`- Title extracted: "${data.title}"`);
        console.log(`- Content length: ${data.content?.length || 0} characters`);
        console.log(`- Error (if any): ${data.error}`);
        
        console.log('\n📖 Content Preview (first 500 characters):');
        console.log('--------------------------------------------------');
        console.log(data.content ? data.content.substring(0, 500) + '...' : 'No content');
        console.log('--------------------------------------------------');

    } catch (error) {
        console.error('\n💥 Network Error:', error.message);
        console.log('Make sure your Next.js development server is running on port 3000!');
    }
}

testFetchPageRoute();
