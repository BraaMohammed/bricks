/**
 * Phase 3.4: Integration Testing with Frontend
 * End-to-end testing of the complete Puppeteer Mode workflow
 */

// Use built-in fetch (Node.js 18+) or fallback to node-fetch
const fetch = globalThis.fetch || require('node-fetch');

class PuppeteerIntegrationTester {
  constructor() {
    this.baseUrl = 'http://localhost:3000/api';
    this.results = {
      basicPuppeteerJob: null,
      titleExtraction: null,
      textExtraction: null,
      screenCapture: null,
      formInteraction: null,
      multipleJobsQueue: null,
      errorHandling: null,
      queueStatus: null
    };
  }

  // Helper: Submit job and poll for result
  async submitAndPollJob(code, config = {}, timeout = 60000) {
    console.log('📤 Submitting job to queue...');
    
    const submitResponse = await fetch(`${this.baseUrl}/puppeteer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: code,
        config: {
          timeout: 30000,
          headless: true,
          ...config
        },
        rowData: { url: 'https://httpbin.org/html', searchTerm: 'test' }
      })
    });

    if (!submitResponse.ok) {
      throw new Error(`Submit failed: ${submitResponse.status} - ${submitResponse.statusText}`);
    }

    const submitData = await submitResponse.json();
    console.log(`📋 Job queued with ID: ${submitData.jobId}`);

    // Poll for result
    const startTime = Date.now();
    const maxAttempts = Math.floor(timeout / 5000); // 5 second intervals
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      console.log(`⏳ Polling attempt ${attempt + 1}/${maxAttempts}...`);
      
      const statusResponse = await fetch(`${this.baseUrl}/puppeteer/status/${submitData.jobId}`);
      
      if (!statusResponse.ok) {
        throw new Error(`Status check failed: ${statusResponse.status}`);
      }

      const statusData = await statusResponse.json();
      console.log(`📊 Job status: ${statusData.status}`);

      if (statusData.status === 'completed') {
        const duration = Date.now() - startTime;
        console.log(`✅ Job completed in ${duration}ms`);
        return {
          success: true,
          result: statusData.result,
          duration: duration,
          jobId: submitData.jobId
        };
      } else if (statusData.status === 'failed') {
        return {
          success: false,
          error: statusData.error,
          jobId: submitData.jobId
        };
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    return {
      success: false,
      error: 'Timeout - job took longer than expected',
      jobId: submitData.jobId
    };
  }

  // Test 1: Basic Puppeteer Job
  async testBasicPuppeteerJob() {
    console.log('🧪 Test 1: Basic Puppeteer Job');
    
    const code = `
      await page.goto('https://httpbin.org/html');
      await page.waitForSelector('h1', { timeout: 10000 });
      const title = await page.title();
      return title;
    `;

    try {
      const result = await this.submitAndPollJob(code);
      this.results.basicPuppeteerJob = result;
      
      console.log(`  ${result.success ? '✅' : '❌'} Basic job: ${result.success ? 'SUCCESS' : result.error}`);
      if (result.success) {
        console.log(`  📄 Result: ${result.result}`);
      }
    } catch (error) {
      console.log(`  ❌ Basic job failed: ${error.message}`);
      this.results.basicPuppeteerJob = { success: false, error: error.message };
    }
    
    console.log('');
  }

  // Test 2: Title Extraction
  async testTitleExtraction() {
    console.log('🧪 Test 2: Title Extraction');
    
    const code = `
      await page.goto('https://httpbin.org/html');
      await page.waitForSelector('h1', { timeout: 10000 });
      const h1Text = await page.$eval('h1', el => el.textContent);
      return h1Text;
    `;

    try {
      const result = await this.submitAndPollJob(code);
      this.results.titleExtraction = result;
      
      console.log(`  ${result.success ? '✅' : '❌'} Title extraction: ${result.success ? 'SUCCESS' : result.error}`);
      if (result.success) {
        console.log(`  📄 Extracted: "${result.result}"`);
      }
    } catch (error) {
      console.log(`  ❌ Title extraction failed: ${error.message}`);
      this.results.titleExtraction = { success: false, error: error.message };
    }
    
    console.log('');
  }

  // Test 3: Text Content Extraction
  async testTextExtraction() {
    console.log('🧪 Test 3: Text Content Extraction');
    
    const code = `
      await page.goto('https://httpbin.org/html');
      await page.waitForSelector('p', { timeout: 10000 });
      const paragraphs = await page.$$eval('p', elements => 
        elements.map(el => el.textContent.trim()).filter(text => text.length > 0)
      );
      return paragraphs.join(' | ');
    `;

    try {
      const result = await this.submitAndPollJob(code);
      this.results.textExtraction = result;
      
      console.log(`  ${result.success ? '✅' : '❌'} Text extraction: ${result.success ? 'SUCCESS' : result.error}`);
      if (result.success) {
        console.log(`  📄 Extracted: "${result.result.substring(0, 100)}${result.result.length > 100 ? '...' : ''}"`);
      }
    } catch (error) {
      console.log(`  ❌ Text extraction failed: ${error.message}`);
      this.results.textExtraction = { success: false, error: error.message };
    }
    
    console.log('');
  }

  // Test 4: Screen Capture
  async testScreenCapture() {
    console.log('🧪 Test 4: Screen Capture');
    
    const code = `
      await page.goto('https://httpbin.org/html');
      await page.setViewport({ width: 1200, height: 800 });
      await page.waitForSelector('body', { timeout: 10000 });
      const screenshot = await page.screenshot({ 
        encoding: 'base64',
        type: 'png',
        clip: { x: 0, y: 0, width: 400, height: 300 }
      });
      return \`data:image/png;base64,\${screenshot.substring(0, 50)}...[truncated]\`;
    `;

    try {
      const result = await this.submitAndPollJob(code);
      this.results.screenCapture = result;
      
      console.log(`  ${result.success ? '✅' : '❌'} Screen capture: ${result.success ? 'SUCCESS' : result.error}`);
      if (result.success) {
        console.log(`  📸 Screenshot: ${result.result}`);
      }
    } catch (error) {
      console.log(`  ❌ Screen capture failed: ${error.message}`);
      this.results.screenCapture = { success: false, error: error.message };
    }
    
    console.log('');
  }

  // Test 5: Form Interaction
  async testFormInteraction() {
    console.log('🧪 Test 5: Form Interaction');
    
    const code = `
      await page.goto('https://httpbin.org/forms/post');
      await page.waitForSelector('form', { timeout: 10000 });
      
      // Fill out the form
      await page.type('input[name="custname"]', 'Test Customer');
      await page.type('input[name="custtel"]', '123-456-7890');
      await page.type('input[name="custemail"]', 'test@example.com');
      
      // Check if form was filled
      const customerName = await page.$eval('input[name="custname"]', el => el.value);
      
      return \`Form filled with customer: \${customerName}\`;
    `;

    try {
      const result = await this.submitAndPollJob(code);
      this.results.formInteraction = result;
      
      console.log(`  ${result.success ? '✅' : '❌'} Form interaction: ${result.success ? 'SUCCESS' : result.error}`);
      if (result.success) {
        console.log(`  📝 Result: ${result.result}`);
      }
    } catch (error) {
      console.log(`  ❌ Form interaction failed: ${error.message}`);
      this.results.formInteraction = { success: false, error: error.message };
    }
    
    console.log('');
  }

  // Test 6: Multiple Jobs Queue Test
  async testMultipleJobsQueue() {
    console.log('🧪 Test 6: Multiple Jobs Queue Test');
    
    const jobs = [
      {
        name: 'Job A - Quick Title',
        code: `
          await page.goto('https://httpbin.org/html');
          return await page.title();
        `
      },
      {
        name: 'Job B - Get Headers',
        code: `
          await page.goto('https://httpbin.org/headers');
          await page.waitForSelector('pre', { timeout: 10000 });
          const content = await page.$eval('pre', el => el.textContent);
          return 'Headers: ' + content.substring(0, 50) + '...';
        `
      },
      {
        name: 'Job C - User Agent',
        code: `
          await page.goto('https://httpbin.org/user-agent');
          await page.waitForSelector('pre', { timeout: 10000 });
          const ua = await page.$eval('pre', el => el.textContent);
          return 'UA: ' + JSON.parse(ua)['user-agent'].substring(0, 50) + '...';
        `
      }
    ];

    try {
      console.log('  📤 Submitting 3 jobs simultaneously...');
      
      const startTime = Date.now();
      const jobPromises = jobs.map(async job => {
        try {
          const result = await this.submitAndPollJob(job.code, {}, 45000);
          return { name: job.name, ...result };
        } catch (error) {
          return { name: job.name, success: false, error: error.message };
        }
      });

      const results = await Promise.all(jobPromises);
      const totalTime = Date.now() - startTime;
      
      const successCount = results.filter(r => r.success).length;
      
      this.results.multipleJobsQueue = {
        success: successCount === jobs.length,
        totalJobs: jobs.length,
        successfulJobs: successCount,
        results: results,
        totalTime: totalTime
      };
      
      console.log(`  📊 Queue test results:`);
      console.log(`    Total jobs: ${jobs.length}`);
      console.log(`    Successful: ${successCount}`);
      console.log(`    Total time: ${totalTime}ms`);
      
      results.forEach(result => {
        console.log(`    ${result.success ? '✅' : '❌'} ${result.name}: ${result.success ? 'SUCCESS' : result.error}`);
        if (result.success && result.result) {
          console.log(`      📄 ${result.result.substring(0, 80)}${result.result.length > 80 ? '...' : ''}`);
        }
      });
      
    } catch (error) {
      console.log(`  ❌ Queue test failed: ${error.message}`);
      this.results.multipleJobsQueue = { success: false, error: error.message };
    }
    
    console.log('');
  }

  // Test 7: Error Handling
  async testErrorHandling() {
    console.log('🧪 Test 7: Error Handling');
    
    const code = `
      // This should cause an error - invalid selector
      await page.goto('https://httpbin.org/html');
      await page.waitForSelector('nonexistent-element', { timeout: 2000 });
      return 'This should not be reached';
    `;

    try {
      const result = await this.submitAndPollJob(code, {}, 30000);
      this.results.errorHandling = result;
      
      // We expect this to fail
      const expectedToFail = !result.success;
      console.log(`  ${expectedToFail ? '✅' : '❌'} Error handling: ${expectedToFail ? 'SUCCESS (properly caught error)' : 'UNEXPECTED SUCCESS'}`);
      if (!result.success) {
        console.log(`  ⚠️ Expected error: ${result.error}`);
      }
    } catch (error) {
      console.log(`  ✅ Error handling: SUCCESS (caught at request level)`);
      this.results.errorHandling = { success: true, expectedError: error.message };
    }
    
    console.log('');
  }

  // Test 8: Queue Status
  async testQueueStatus() {
    console.log('🧪 Test 8: Queue Status');
    
    try {
      const response = await fetch(`${this.baseUrl}/puppeteer/queue-status`);
      
      if (!response.ok) {
        throw new Error(`Queue status failed: ${response.status}`);
      }

      const queueData = await response.json();
      this.results.queueStatus = { success: true, data: queueData };
      
      console.log(`  ✅ Queue status: SUCCESS`);
      console.log(`  📊 Queue info:`);
      console.log(`    Pending: ${queueData.pending || 0}`);
      console.log(`    Processing: ${queueData.processing || 0}`);
      console.log(`    Completed: ${queueData.completed || 0}`);
      console.log(`    Failed: ${queueData.failed || 0}`);
      
    } catch (error) {
      console.log(`  ❌ Queue status failed: ${error.message}`);
      this.results.queueStatus = { success: false, error: error.message };
    }
    
    console.log('');
  }

  // Generate integration test report
  generateReport() {
    const tests = Object.keys(this.results);
    const successful = tests.filter(test => this.results[test]?.success).length;
    const failed = tests.length - successful;
    
    const report = {
      testSuite: 'Puppeteer Mode Integration Testing',
      phase: 'Phase 3.4',
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: tests.length,
        successful: successful,
        failed: failed,
        successRate: tests.length > 0 ? ((successful / tests.length) * 100).toFixed(1) + '%' : '0%',
        status: successful === tests.length ? 'ALL_PASSED' : 
                successful >= tests.length * 0.8 ? 'MOSTLY_PASSED' : 
                successful >= tests.length * 0.5 ? 'PARTIALLY_PASSED' : 'MOSTLY_FAILED'
      },
      results: this.results,
      recommendations: {
        readyForProduction: successful >= tests.length * 0.8,
        criticalIssues: failed > tests.length * 0.3,
        nextSteps: successful === tests.length ? 
          'Phase 3.4 COMPLETED - Ready for Phase 4: Polish and Optimization' :
          'Address failed tests before proceeding to Phase 4'
      }
    };

    return report;
  }

  // Run all integration tests
  async runAllTests() {
    console.log('🔬 Starting Puppeteer Mode Integration Testing');
    console.log('🎯 Phase 3.4: End-to-end frontend integration testing');
    console.log('📡 Testing complete workflow: Frontend → API → Queue → Puppeteer → Results\n');
    
    // Check if API is running
    console.log('🔍 Checking API availability...');
    try {
      const healthCheck = await fetch(`${this.baseUrl}`);
      if (healthCheck.ok) {
        console.log('✅ API is running and accessible\n');
      } else {
        console.log('❌ API returned non-200 status\n');
      }
    } catch (error) {
      console.log('❌ API is not accessible - make sure to start the Next.js server');
      console.log('💡 Run: cd api/bricks-api && npm run dev\n');
      return;
    }

    try {
      await this.testBasicPuppeteerJob();
      await this.testTitleExtraction();
      await this.testTextExtraction();
      await this.testScreenCapture();
      await this.testFormInteraction();
      await this.testMultipleJobsQueue();
      await this.testErrorHandling();
      await this.testQueueStatus();
      
    } catch (error) {
      console.error('💥 Integration test suite error:', error);
    }
    
    const report = this.generateReport();
    
    console.log('📋 INTEGRATION TEST REPORT');
    console.log('=' .repeat(60));
    console.log(`Phase: ${report.phase}`);
    console.log(`Overall Status: ${report.summary.status}`);
    console.log(`Success Rate: ${report.summary.successRate} (${report.summary.successful}/${report.summary.totalTests})`);
    console.log(`Ready for Production: ${report.recommendations.readyForProduction ? '✅ YES' : '❌ NO'}`);
    console.log('');
    console.log('Test Results:');
    
    Object.keys(this.results).forEach(testName => {
      const result = this.results[testName];
      const status = result?.success ? '✅ PASS' : '❌ FAIL';
      console.log(`  ${status} ${testName.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
    });
    
    console.log('');
    console.log(`Next Steps: ${report.recommendations.nextSteps}`);
    
    // Save detailed report
    const fs = require('fs');
    fs.writeFileSync('integration-test-report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Detailed report saved to: integration-test-report.json');
    
    // Update implementation plan
    if (report.summary.successful >= report.summary.totalTests * 0.8) {
      console.log('\n✅ Phase 3.4 COMPLETED: Integration testing successful!');
      console.log('🎯 Ready to proceed to Phase 4: Polish and Optimization');
    } else {
      console.log('\n⚠️ Phase 3.4 NEEDS ATTENTION: Some integration tests failed');
      console.log('🔧 Review failed tests before proceeding to Phase 4');
    }
    
    return report;
  }
}

// Run integration tests
if (require.main === module) {
  const tester = new PuppeteerIntegrationTester();
  tester.runAllTests()
    .then(() => {
      console.log('\n🏁 Integration testing completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Integration test suite failed:', error);
      process.exit(1);
    });
}

module.exports = PuppeteerIntegrationTester;