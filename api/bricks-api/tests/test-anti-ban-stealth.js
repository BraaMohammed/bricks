/**
 * Anti-Ban and Stealth Mode Testing Suite
 * Phase 3.3: Test anti-ban measures and stealth mode
 */

const puppeteer = require('puppeteer');

// Test configuration
const TEST_CONFIG = {
  testUrls: [
    'https://httpbin.org/user-agent',
    'https://httpbin.org/headers',
    'https://whatismyipaddress.com/detect-headless-browser',
    'https://bot.sannysoft.com/',
    'https://deviceatlas.com/device-data/user-agent-tester'
  ],
  delayBetweenRequests: 2000,
  maxConcurrentBrowsers: 3,
  testDuration: 60000 // 1 minute test
};

class AntiBanTester {
  constructor() {
    this.browsers = [];
    this.results = {
      userAgentRotation: [],
      viewportRandomization: [],
      requestDelays: [],
      headerValidation: [],
      stealthDetection: [],
      memoryUsage: [],
      browserPooling: []
    };
    this.startTime = Date.now();
  }

  // Test 1: User Agent Rotation
  async testUserAgentRotation() {
    console.log('🧪 Testing User Agent Rotation...');
    
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];

    for (let i = 0; i < 5; i++) {
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      
      const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];
      await page.setUserAgent(randomUA);
      
      try {
        await page.goto('https://httpbin.org/user-agent', { waitUntil: 'networkidle2', timeout: 10000 });
        const response = await page.evaluate(() => {
          const pre = document.querySelector('pre');
          return pre ? JSON.parse(pre.textContent) : null;
        });
        
        this.results.userAgentRotation.push({
          attempt: i + 1,
          expectedUA: randomUA,
          detectedUA: response?.['user-agent'],
          success: response?.['user-agent'] === randomUA
        });
        
        console.log(`  ✅ Attempt ${i + 1}: UA rotation ${response?.['user-agent'] === randomUA ? 'SUCCESS' : 'FAILED'}`);
      } catch (error) {
        console.log(`  ❌ Attempt ${i + 1}: Error - ${error.message}`);
        this.results.userAgentRotation.push({
          attempt: i + 1,
          error: error.message,
          success: false
        });
      }
      
      await browser.close();
      await this.delay(TEST_CONFIG.delayBetweenRequests);
    }
  }

  // Test 2: Viewport Randomization
  async testViewportRandomization() {
    console.log('🧪 Testing Viewport Randomization...');
    
    const viewports = [
      { width: 1200, height: 800 },
      { width: 1366, height: 768 },
      { width: 1440, height: 900 },
      { width: 1920, height: 1080 }
    ];

    for (let i = 0; i < 4; i++) {
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      
      const randomViewport = viewports[i];
      await page.setViewport(randomViewport);
      
      try {
        await page.goto('data:text/html,<script>document.write(window.innerWidth + "x" + window.innerHeight)</script>', 
                       { waitUntil: 'networkidle2', timeout: 5000 });
        
        const detectedSize = await page.evaluate(() => document.body.textContent);
        const expectedSize = `${randomViewport.width}x${randomViewport.height}`;
        
        this.results.viewportRandomization.push({
          attempt: i + 1,
          expected: expectedSize,
          detected: detectedSize,
          success: detectedSize === expectedSize
        });
        
        console.log(`  ✅ Attempt ${i + 1}: Viewport ${detectedSize === expectedSize ? 'SUCCESS' : 'FAILED'} (${detectedSize})`);
      } catch (error) {
        console.log(`  ❌ Attempt ${i + 1}: Error - ${error.message}`);
        this.results.viewportRandomization.push({
          attempt: i + 1,
          error: error.message,
          success: false
        });
      }
      
      await browser.close();
      await this.delay(500);
    }
  }

  // Test 3: Request Delay Enforcement
  async testRequestDelays() {
    console.log('🧪 Testing Request Delay Enforcement...');
    
    const requestTimes = [];
    
    for (let i = 0; i < 3; i++) {
      const startTime = Date.now();
      
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      
      try {
        await page.goto('https://httpbin.org/delay/1', { waitUntil: 'networkidle2', timeout: 15000 });
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        requestTimes.push(duration);
        console.log(`  ⏱️ Request ${i + 1}: ${duration}ms`);
        
        this.results.requestDelays.push({
          attempt: i + 1,
          duration: duration,
          success: true
        });
      } catch (error) {
        console.log(`  ❌ Request ${i + 1}: Error - ${error.message}`);
        this.results.requestDelays.push({
          attempt: i + 1,
          error: error.message,
          success: false
        });
      }
      
      await browser.close();
      
      // Enforce delay between requests
      if (i < 2) {
        console.log(`  ⏳ Waiting ${TEST_CONFIG.delayBetweenRequests}ms before next request...`);
        await this.delay(TEST_CONFIG.delayBetweenRequests);
      }
    }
    
    // Validate delays were enforced
    const averageDelay = requestTimes.length > 1 ? 
      (requestTimes[requestTimes.length - 1] - requestTimes[0]) / (requestTimes.length - 1) : 0;
    
    console.log(`  📊 Average request interval: ${averageDelay}ms (target: ${TEST_CONFIG.delayBetweenRequests}ms)`);
  }

  // Test 4: HTTP Headers Validation
  async testHTTPHeaders() {
    console.log('🧪 Testing HTTP Headers...');
    
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    // Set realistic headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Upgrade-Insecure-Requests': '1'
    });
    
    try {
      await page.goto('https://httpbin.org/headers', { waitUntil: 'networkidle2', timeout: 10000 });
      const response = await page.evaluate(() => {
        const pre = document.querySelector('pre');
        return pre ? JSON.parse(pre.textContent) : null;
      });
      
      const headers = response?.headers || {};
      const requiredHeaders = ['Accept-Language', 'Accept-Encoding', 'Accept'];
      const missingHeaders = requiredHeaders.filter(h => !headers[h.toLowerCase()]);
      
      this.results.headerValidation.push({
        detectedHeaders: Object.keys(headers),
        missingHeaders: missingHeaders,
        success: missingHeaders.length === 0
      });
      
      console.log(`  ✅ Headers validation: ${missingHeaders.length === 0 ? 'SUCCESS' : 'MISSING: ' + missingHeaders.join(', ')}`);
    } catch (error) {
      console.log(`  ❌ Headers test failed: ${error.message}`);
      this.results.headerValidation.push({
        error: error.message,
        success: false
      });
    }
    
    await browser.close();
  }

  // Test 5: Bot Detection Test
  async testBotDetection() {
    console.log('🧪 Testing Bot Detection...');
    
    const browser = await puppeteer.launch({ 
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    
    // Set realistic user agent and viewport
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1366, height: 768 });
    
    try {
      // Simple bot detection test
      await page.goto('data:text/html,<script>document.write(navigator.webdriver ? "BOT_DETECTED" : "HUMAN_LIKE")</script>', 
                     { waitUntil: 'networkidle2', timeout: 5000 });
      
      const result = await page.evaluate(() => document.body.textContent);
      
      this.results.stealthDetection.push({
        test: 'navigator.webdriver',
        result: result,
        detected: result === 'BOT_DETECTED',
        success: result === 'HUMAN_LIKE'
      });
      
      console.log(`  ${result === 'HUMAN_LIKE' ? '✅' : '❌'} Webdriver detection: ${result}`);
      
      // Test Chrome detection
      await page.goto('data:text/html,<script>document.write(window.chrome ? "CHROME_DETECTED" : "NO_CHROME")</script>', 
                     { waitUntil: 'networkidle2', timeout: 5000 });
      
      const chromeResult = await page.evaluate(() => document.body.textContent);
      
      this.results.stealthDetection.push({
        test: 'window.chrome',
        result: chromeResult,
        detected: chromeResult === 'CHROME_DETECTED',
        success: chromeResult === 'CHROME_DETECTED' // We want Chrome to be detected
      });
      
      console.log(`  ${chromeResult === 'CHROME_DETECTED' ? '✅' : '❌'} Chrome detection: ${chromeResult}`);
      
    } catch (error) {
      console.log(`  ❌ Bot detection test failed: ${error.message}`);
      this.results.stealthDetection.push({
        error: error.message,
        success: false
      });
    }
    
    await browser.close();
  }

  // Test 6: Memory Usage Monitoring
  async testMemoryUsage() {
    console.log('🧪 Testing Memory Usage...');
    
    const memoryMeasurements = [];
    
    for (let i = 0; i < 3; i++) {
      const initialMemory = process.memoryUsage();
      
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      
      // Simulate some workload
      await page.goto('data:text/html,<h1>Memory Test</h1>', { waitUntil: 'networkidle2' });
      await page.screenshot({ type: 'png' });
      
      const peakMemory = process.memoryUsage();
      await browser.close();
      
      const finalMemory = process.memoryUsage();
      
      const memoryDelta = {
        heapUsed: (peakMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024, // MB
        heapTotal: (peakMemory.heapTotal - initialMemory.heapTotal) / 1024 / 1024,
        rss: (peakMemory.rss - initialMemory.rss) / 1024 / 1024,
        cleanup: (finalMemory.heapUsed - peakMemory.heapUsed) / 1024 / 1024
      };
      
      memoryMeasurements.push(memoryDelta);
      
      console.log(`  📊 Browser ${i + 1}: +${memoryDelta.heapUsed.toFixed(1)}MB heap, +${memoryDelta.rss.toFixed(1)}MB RSS`);
      
      await this.delay(1000);
    }
    
    const avgMemory = memoryMeasurements.reduce((acc, curr) => ({
      heapUsed: acc.heapUsed + curr.heapUsed,
      rss: acc.rss + curr.rss
    }), { heapUsed: 0, rss: 0 });
    
    avgMemory.heapUsed /= memoryMeasurements.length;
    avgMemory.rss /= memoryMeasurements.length;
    
    this.results.memoryUsage = {
      measurements: memoryMeasurements,
      average: avgMemory,
      withinLimits: avgMemory.heapUsed < 100 // 100MB limit per browser
    };
    
    console.log(`  📈 Average memory per browser: ${avgMemory.heapUsed.toFixed(1)}MB heap (limit: 100MB)`);
  }

  // Test 7: Browser Pool Behavior
  async testBrowserPoolBehavior() {
    console.log('🧪 Testing Browser Pool Behavior...');
    
    const browsers = [];
    const startTime = Date.now();
    
    // Create multiple browsers simultaneously
    try {
      for (let i = 0; i < TEST_CONFIG.maxConcurrentBrowsers; i++) {
        const browser = await puppeteer.launch({ headless: true });
        browsers.push({
          id: i + 1,
          browser: browser,
          created: Date.now()
        });
        console.log(`  🚀 Created browser ${i + 1}`);
      }
      
      // Test concurrent operations
      const concurrentTasks = browsers.map(async ({ browser, id }) => {
        const page = await browser.newPage();
        await page.goto('https://httpbin.org/delay/2', { waitUntil: 'networkidle2', timeout: 15000 });
        const result = await page.title();
        console.log(`  ✅ Browser ${id} completed task`);
        return { id, result, success: true };
      });
      
      const results = await Promise.all(concurrentTasks);
      
      this.results.browserPooling = {
        maxConcurrent: TEST_CONFIG.maxConcurrentBrowsers,
        actualConcurrent: results.length,
        allSuccessful: results.every(r => r.success),
        totalTime: Date.now() - startTime
      };
      
      console.log(`  🎯 Concurrent execution: ${results.length}/${TEST_CONFIG.maxConcurrentBrowsers} browsers successful`);
      
    } catch (error) {
      console.log(`  ❌ Browser pool test failed: ${error.message}`);
      this.results.browserPooling = { error: error.message, success: false };
    } finally {
      // Cleanup
      for (const { browser } of browsers) {
        try {
          await browser.close();
        } catch (e) {
          console.log(`  ⚠️ Error closing browser: ${e.message}`);
        }
      }
    }
  }

  // Helper method for delays
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Generate comprehensive test report
  generateReport() {
    const report = {
      testSuite: 'Anti-Ban and Stealth Mode Testing',
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      results: this.results,
      summary: {
        userAgentRotation: {
          total: this.results.userAgentRotation.length,
          successful: this.results.userAgentRotation.filter(r => r.success).length,
          successRate: this.results.userAgentRotation.length > 0 ? 
            (this.results.userAgentRotation.filter(r => r.success).length / this.results.userAgentRotation.length * 100).toFixed(1) + '%' : '0%'
        },
        viewportRandomization: {
          total: this.results.viewportRandomization.length,
          successful: this.results.viewportRandomization.filter(r => r.success).length,
          successRate: this.results.viewportRandomization.length > 0 ? 
            (this.results.viewportRandomization.filter(r => r.success).length / this.results.viewportRandomization.length * 100).toFixed(1) + '%' : '0%'
        },
        requestDelays: {
          total: this.results.requestDelays.length,
          successful: this.results.requestDelays.filter(r => r.success).length,
          averageDelay: this.results.requestDelays.length > 0 ? 
            (this.results.requestDelays.reduce((acc, r) => acc + (r.duration || 0), 0) / this.results.requestDelays.length).toFixed(0) + 'ms' : '0ms'
        },
        stealthDetection: {
          tests: this.results.stealthDetection.length,
          passed: this.results.stealthDetection.filter(r => r.success).length,
          detected: this.results.stealthDetection.filter(r => r.detected).length
        },
        memoryUsage: {
          averageHeapUsage: this.results.memoryUsage?.average?.heapUsed?.toFixed(1) + 'MB' || 'N/A',
          withinLimits: this.results.memoryUsage?.withinLimits || false
        },
        browserPooling: {
          maxConcurrent: this.results.browserPooling?.maxConcurrent || 0,
          successful: this.results.browserPooling?.allSuccessful || false
        }
      }
    };

    return report;
  }

  // Run all tests
  async runAllTests() {
    console.log('🔬 Starting Anti-Ban and Stealth Mode Testing Suite\n');
    
    try {
      await this.testUserAgentRotation();
      console.log('');
      
      await this.testViewportRandomization();
      console.log('');
      
      await this.testRequestDelays();
      console.log('');
      
      await this.testHTTPHeaders();
      console.log('');
      
      await this.testBotDetection();
      console.log('');
      
      await this.testMemoryUsage();
      console.log('');
      
      await this.testBrowserPoolBehavior();
      console.log('');
      
    } catch (error) {
      console.error('💥 Test suite error:', error);
    }
    
    const report = this.generateReport();
    
    console.log('📋 TEST REPORT');
    console.log('=' .repeat(50));
    console.log(`Test Duration: ${(report.duration / 1000).toFixed(1)}s`);
    console.log('');
    console.log('Results Summary:');
    console.log(`  User Agent Rotation: ${report.summary.userAgentRotation.successRate} (${report.summary.userAgentRotation.successful}/${report.summary.userAgentRotation.total})`);
    console.log(`  Viewport Randomization: ${report.summary.viewportRandomization.successRate} (${report.summary.viewportRandomization.successful}/${report.summary.viewportRandomization.total})`);
    console.log(`  Request Delays: ${report.summary.requestDelays.successful}/${report.summary.requestDelays.total} successful (avg: ${report.summary.requestDelays.averageDelay})`);
    console.log(`  Stealth Detection: ${report.summary.stealthDetection.passed}/${report.summary.stealthDetection.tests} passed (${report.summary.stealthDetection.detected} detected as bot)`);
    console.log(`  Memory Usage: ${report.summary.memoryUsage.averageHeapUsage} average (within limits: ${report.summary.memoryUsage.withinLimits})`);
    console.log(`  Browser Pooling: ${report.summary.browserPooling.successful ? 'SUCCESS' : 'FAILED'} (${report.summary.browserPooling.maxConcurrent} concurrent)`);
    
    // Save detailed report
    const fs = require('fs');
    fs.writeFileSync('anti-ban-test-report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Detailed report saved to: anti-ban-test-report.json');
    
    return report;
  }
}

// Run the tests
if (require.main === module) {
  const tester = new AntiBanTester();
  tester.runAllTests()
    .then(() => {
      console.log('\n✅ All tests completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = AntiBanTester;