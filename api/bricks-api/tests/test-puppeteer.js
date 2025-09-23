// Simple test script for Puppeteer API
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testBasicPuppeteerExecution() {
  console.log('🧪 Testing basic Puppeteer automation...');
  
  try {
    // Test 1: Submit a simple job
    console.log('📤 Submitting job to queue...');
    const response = await fetch('http://localhost:3000/api/puppeteer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: `
          await page.goto('https://example.com');
          const title = await page.title();
          return title;
        `,
        config: {
          timeout: 30000,
          headless: true
        },
        rowData: {}
      })
    });

    const jobData = await response.json();
    console.log('✅ Job submitted:', jobData);

    if (!jobData.queued || !jobData.jobId) {
      throw new Error('Invalid job submission response');
    }

    // Test 2: Poll for job status
    console.log('🔍 Polling for job completion...');
    let attempts = 0;
    const maxAttempts = 20; // 100 seconds max

    while (attempts < maxAttempts) {
      const statusResponse = await fetch(`http://localhost:3000/api/puppeteer/status/${jobData.jobId}`);
      const statusData = await statusResponse.json();
      
      console.log(`📊 Job status (attempt ${attempts + 1}):`, statusData.status);
      
      if (statusData.status === 'completed') {
        console.log('🎉 Job completed successfully!');
        console.log('📄 Result:', statusData.result);
        break;
      } else if (statusData.status === 'failed') {
        console.log('❌ Job failed:', statusData.error);
        break;
      }
      
      // Wait 5 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    }

    if (attempts >= maxAttempts) {
      console.log('⏰ Job timeout - took longer than expected');
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

async function testQueueStatus() {
  console.log('🧪 Testing queue status endpoint...');
  
  try {
    const response = await fetch('http://localhost:3000/api/puppeteer/queue-status');
    const queueData = await response.json();
    
    console.log('📊 Queue Status:', queueData);
    
  } catch (error) {
    console.error('💥 Queue status test failed:', error.message);
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting Puppeteer API tests...\n');
  
  await testQueueStatus();
  console.log('\n' + '='.repeat(50) + '\n');
  await testBasicPuppeteerExecution();
  
  console.log('\n✅ Tests completed!');
}

runTests().catch(console.error);