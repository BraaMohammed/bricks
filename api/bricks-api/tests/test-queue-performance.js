// Queue System Performance Test
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testQueuePerformance() {
  console.log('🚀 Starting Queue Performance Tests...\n');

  // Test 1: Multiple concurrent job submissions
  await testConcurrentJobs();
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Test 2: Queue capacity and processing order
  await testQueueCapacity();
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Test 3: Browser pool efficiency
  await testBrowserPoolEfficiency();
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Test 4: Rate limiting validation
  await testRateLimiting();
  
  console.log('\n✅ All queue performance tests completed!');
}

async function testConcurrentJobs() {
  console.log('🧪 Test 1: Concurrent Job Submissions (10 jobs simultaneously)');
  
  const startTime = Date.now();
  const jobs = [];
  
  // Submit 10 jobs simultaneously
  for (let i = 0; i < 10; i++) {
    const jobPromise = fetch('http://localhost:3000/api/puppeteer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: `
          await page.goto('https://httpbin.org/delay/${Math.floor(Math.random() * 3) + 1}');
          const response = await page.evaluate(() => document.body.innerText);
          return \`Job ${i + 1}: \${JSON.parse(response).url}\`;
        `,
        config: { timeout: 15000, headless: true },
        rowData: { jobNumber: i + 1 }
      })
    }).then(res => res.json());
    
    jobs.push(jobPromise);
  }
  
  try {
    const submissions = await Promise.all(jobs);
    const submissionTime = Date.now() - startTime;
    
    console.log(`📤 All 10 jobs submitted in ${submissionTime}ms`);
    console.log('📋 Job IDs:', submissions.map(s => s.jobId?.slice(-8) || 'FAILED'));
    
    // Poll all jobs for completion
    const completionPromises = submissions
      .filter(s => s.jobId)
      .map(s => pollJobCompletion(s.jobId));
    
    const results = await Promise.allSettled(completionPromises);
    const totalTime = Date.now() - startTime;
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`✅ Results: ${successful} successful, ${failed} failed`);
    console.log(`⏱️ Total execution time: ${totalTime}ms`);
    console.log(`📊 Average time per job: ${Math.round(totalTime / 10)}ms`);
    
  } catch (error) {
    console.error('💥 Concurrent jobs test failed:', error.message);
  }
}

async function testQueueCapacity() {
  console.log('🧪 Test 2: Queue Capacity and Processing Order');
  
  try {
    // Get initial queue status
    const initialStatus = await fetch('http://localhost:3000/api/puppeteer/queue-status')
      .then(res => res.json());
    
    console.log('📊 Initial queue state:');
    console.log(`   Pending: ${initialStatus.queue.pending}`);
    console.log(`   Processing: ${initialStatus.queue.processing}`);
    console.log(`   Active browsers: ${initialStatus.browsers.activeBrowsers}`);
    
    // Submit 5 more jobs to test queue behavior
    const jobPromises = [];
    for (let i = 0; i < 5; i++) {
      const promise = fetch('http://localhost:3000/api/puppeteer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: `
            console.log('Starting job ${i + 1}');
            await page.goto('https://httpbin.org/delay/2');
            return 'Queue test job ${i + 1} completed';
          `,
          config: { timeout: 10000, headless: true },
          rowData: { testNumber: i + 1 }
        })
      }).then(res => res.json());
      
      jobPromises.push(promise);
      
      // Small delay between submissions to observe queuing
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const jobs = await Promise.all(jobPromises);
    console.log('📤 Submitted 5 test jobs');
    
    // Monitor queue status every 2 seconds
    console.log('👀 Monitoring queue status...');
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const status = await fetch('http://localhost:3000/api/puppeteer/queue-status')
        .then(res => res.json());
      
      console.log(`   [${i * 2}s] Pending: ${status.queue.pending}, Processing: ${status.queue.processing}, Browsers: ${status.browsers.activeBrowsers}`);
      
      if (status.queue.pending === 0 && status.queue.processing === 0) {
        console.log('✅ All jobs completed');
        break;
      }
    }
    
  } catch (error) {
    console.error('💥 Queue capacity test failed:', error.message);
  }
}

async function testBrowserPoolEfficiency() {
  console.log('🧪 Test 3: Browser Pool Efficiency');
  
  try {
    // Test browser reuse by submitting jobs with delays
    const startTime = Date.now();
    
    for (let batch = 0; batch < 3; batch++) {
      console.log(`🔄 Batch ${batch + 1}: Submitting 2 jobs...`);
      
      const batchJobs = [];
      for (let i = 0; i < 2; i++) {
        const job = fetch('http://localhost:3000/api/puppeteer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: `
              await page.goto('https://httpbin.org/get');
              const userAgent = await page.evaluate(() => navigator.userAgent);
              return \`Batch ${batch + 1}, Job ${i + 1}: \${userAgent.slice(0, 50)}...\`;
            `,
            config: { timeout: 8000, headless: true },
            rowData: { batch: batch + 1, job: i + 1 }
          })
        }).then(res => res.json());
        
        batchJobs.push(job);
      }
      
      const submissions = await Promise.all(batchJobs);
      
      // Wait for this batch to complete before next batch
      await Promise.all(
        submissions
          .filter(s => s.jobId)
          .map(s => pollJobCompletion(s.jobId, 15))
      );
      
      // Check browser stats
      const status = await fetch('http://localhost:3000/api/puppeteer/queue-status')
        .then(res => res.json());
      
      console.log(`   📊 After batch ${batch + 1}: ${status.browsers.activeBrowsers} browsers, ${status.browsers.totalPages} pages`);
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    const totalTime = Date.now() - startTime;
    console.log(`⏱️ Browser pool test completed in ${totalTime}ms`);
    
  } catch (error) {
    console.error('💥 Browser pool test failed:', error.message);
  }
}

async function testRateLimiting() {
  console.log('🧪 Test 4: Rate Limiting Validation');
  
  try {
    console.log('📏 Testing request spacing (should have ~2s delays)...');
    
    const timestamps = [];
    
    // Submit 4 jobs quickly and measure actual execution timing
    for (let i = 0; i < 4; i++) {
      const startTime = Date.now();
      
      const response = await fetch('http://localhost:3000/api/puppeteer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: `
            const start = Date.now();
            await page.goto('https://httpbin.org/get');
            return \`Rate limit test ${i + 1} - took \${Date.now() - start}ms\`;
          `,
          config: { timeout: 5000, headless: true },
          rowData: { rateLimitTest: i + 1 }
        })
      });
      
      const jobData = await response.json();
      timestamps.push({
        submission: startTime,
        jobId: jobData.jobId
      });
      
      console.log(`   📤 Job ${i + 1} submitted at +${startTime - timestamps[0].submission}ms`);
    }
    
    // Monitor when jobs actually start processing
    console.log('👀 Monitoring processing start times...');
    
    for (const timestamp of timestamps) {
      if (timestamp.jobId) {
        const startMonitoring = Date.now();
        
        while (true) {
          const statusResponse = await fetch(`http://localhost:3000/api/puppeteer/status/${timestamp.jobId}`);
          const status = await statusResponse.json();
          
          if (status.status === 'processing') {
            const processingDelay = Date.now() - startMonitoring;
            console.log(`   🔄 Job ${timestamp.jobId.slice(-8)} started processing after ${processingDelay}ms`);
            break;
          }
          
          if (status.status === 'completed' || status.status === 'failed') {
            console.log(`   ✅ Job ${timestamp.jobId.slice(-8)} completed without seeing processing state`);
            break;
          }
          
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
    
  } catch (error) {
    console.error('💥 Rate limiting test failed:', error.message);
  }
}

async function pollJobCompletion(jobId, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`http://localhost:3000/api/puppeteer/status/${jobId}`);
      const data = await response.json();
      
      if (data.status === 'completed') {
        return data.result;
      } else if (data.status === 'failed') {
        throw new Error(`Job failed: ${data.error}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      if (i === maxAttempts - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  throw new Error('Job timeout');
}

// Run the performance tests
testQueuePerformance().catch(console.error);