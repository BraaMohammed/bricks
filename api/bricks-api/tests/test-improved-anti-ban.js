/**
 * Improved Anti-Ban Testing - Phase 3.3 Validation
 * Focus on critical stealth features and bot detection avoidance
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Enable stealth plugin
puppeteer.use(StealthPlugin());

class ImprovedAntiBanTester {
  constructor() {
    this.results = {
      webdriverDetection: [],
      chromeObjectDetection: [],
      pluginsDetection: [],
      languagesDetection: [],
      permissionsDetection: [],
      stealthScore: 0
    };
  }

  // Test 1: Webdriver Detection (Critical)
  async testWebdriverDetection() {
    console.log('🔍 Testing Webdriver Detection (Critical)...');
    
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--exclude-switches=enable-automation',
        '--disable-features=VizDisplayCompositor'
      ],
      ignoreDefaultArgs: ['--enable-automation']
    });
    
    const page = await browser.newPage();
    
    try {
      // Test basic webdriver detection
      const webdriverResult = await page.evaluate(() => {
        return {
          webdriver: navigator.webdriver,
          webdriverUndefined: navigator.webdriver === undefined,
          automationControlled: window.navigator.webdriver
        };
      });
      
      this.results.webdriverDetection.push({
        test: 'Basic webdriver detection',
        webdriver: webdriverResult.webdriver,
        isUndefined: webdriverResult.webdriverUndefined,
        passed: webdriverResult.webdriverUndefined
      });
      
      console.log(`  ${webdriverResult.webdriverUndefined ? '✅' : '❌'} Webdriver hidden: ${webdriverResult.webdriverUndefined ? 'SUCCESS' : 'FAILED'}`);
      
      // Test advanced webdriver detection methods
      const advancedResult = await page.evaluate(() => {
        const tests = {
          webdriverProperty: 'webdriver' in navigator,
          callPhantom: 'callPhantom' in window,
          _phantom: '_phantom' in window,
          phantom: 'phantom' in window,
          webdriverValue: navigator.webdriver
        };
        
        return tests;
      });
      
      this.results.webdriverDetection.push({
        test: 'Advanced webdriver detection',
        ...advancedResult,
        passed: !advancedResult.webdriverProperty && !advancedResult.callPhantom && 
                !advancedResult._phantom && !advancedResult.phantom && 
                advancedResult.webdriverValue === undefined
      });
      
      console.log(`  ${!advancedResult.webdriverProperty ? '✅' : '❌'} Advanced webdriver hidden: ${!advancedResult.webdriverProperty ? 'SUCCESS' : 'FAILED'}`);
      
    } catch (error) {
      console.log(`  ❌ Webdriver test failed: ${error.message}`);
      this.results.webdriverDetection.push({
        test: 'Webdriver detection',
        error: error.message,
        passed: false
      });
    }
    
    await browser.close();
  }

  // Test 2: Chrome Object Detection
  async testChromeObjectDetection() {
    console.log('🔍 Testing Chrome Object Detection...');
    
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    // Apply our stealth measures
    await page.evaluateOnNewDocument(() => {
      // Mock chrome object
      window.chrome = {
        runtime: {},
        loadTimes: function() {},
        csi: function() {},
        app: {}
      };
    });
    
    try {
      const chromeResult = await page.evaluate(() => {
        return {
          chromeExists: 'chrome' in window,
          chromeRuntime: window.chrome && 'runtime' in window.chrome,
          chromeLoadTimes: window.chrome && typeof window.chrome.loadTimes === 'function',
          chromeCSI: window.chrome && 'csi' in window.chrome,
          chromeApp: window.chrome && 'app' in window.chrome
        };
      });
      
      this.results.chromeObjectDetection.push({
        test: 'Chrome object presence',
        ...chromeResult,
        passed: chromeResult.chromeExists && chromeResult.chromeRuntime && 
                chromeResult.chromeLoadTimes && chromeResult.chromeCSI
      });
      
      console.log(`  ${chromeResult.chromeExists ? '✅' : '❌'} Chrome object present: ${chromeResult.chromeExists ? 'SUCCESS' : 'FAILED'}`);
      
    } catch (error) {
      console.log(`  ❌ Chrome object test failed: ${error.message}`);
      this.results.chromeObjectDetection.push({
        test: 'Chrome object detection',
        error: error.message,
        passed: false
      });
    }
    
    await browser.close();
  }

  // Test 3: Plugins and Languages Detection
  async testPluginsAndLanguages() {
    console.log('🔍 Testing Plugins and Languages...');
    
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    // Apply our stealth measures
    await page.evaluateOnNewDocument(() => {
      // Mock plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
      
      // Mock languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
    });
    
    try {
      const result = await page.evaluate(() => {
        return {
          pluginsLength: navigator.plugins.length,
          languagesLength: navigator.languages.length,
          languages: navigator.languages,
          hasPlugins: navigator.plugins.length > 0,
          hasLanguages: navigator.languages.length > 0
        };
      });
      
      this.results.pluginsDetection.push({
        test: 'Plugins and languages',
        ...result,
        passed: result.hasPlugins && result.hasLanguages && result.languagesLength >= 2
      });
      
      console.log(`  ${result.hasPlugins ? '✅' : '❌'} Plugins present: ${result.pluginsLength} plugins`);
      console.log(`  ${result.hasLanguages ? '✅' : '❌'} Languages present: ${result.languages.join(', ')}`);
      
    } catch (error) {
      console.log(`  ❌ Plugins/Languages test failed: ${error.message}`);
      this.results.pluginsDetection.push({
        test: 'Plugins and languages detection',
        error: error.message,
        passed: false
      });
    }
    
    await browser.close();
  }

  // Test 4: Comprehensive Bot Detection Test
  async testComprehensiveBotDetection() {
    console.log('🔍 Testing Comprehensive Bot Detection...');
    
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--exclude-switches=enable-automation',
        '--disable-features=VizDisplayCompositor',
        '--disable-ipc-flooding-protection'
      ],
      ignoreDefaultArgs: ['--enable-automation']
    });
    
    const page = await browser.newPage();
    
    // Apply comprehensive stealth measures
    await page.evaluateOnNewDocument(() => {
      // Remove webdriver
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
      
      // Chrome object
      window.chrome = {
        runtime: {},
        loadTimes: function() {},
        csi: function() {},
        app: {}
      };
      
      // Plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
      
      // Languages  
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
      
      // Remove automation indicators
      delete window.navigator.__webdriver_evaluate;
      delete window.navigator.__selenium_evaluate;
      delete window.navigator.__webdriver_script_function;
      delete window.navigator.__webdriver_script_func;
      delete window.navigator.__webdriver_script_fn;
      delete window.navigator.__fxdriver_evaluate;
      delete window.navigator.__driver_unwrapped;
      delete window.navigator.__webdriver_unwrapped;
      delete window.navigator.__driver_evaluate;
      delete window.navigator.__selenium_unwrapped;
      delete window.navigator.__fxdriver_unwrapped;
    });
    
    try {
      const botDetectionResult = await page.evaluate(() => {
        const tests = {
          // Webdriver tests
          webdriver: navigator.webdriver,
          webdriverUndefined: navigator.webdriver === undefined,
          
          // Chrome tests
          chromePresent: 'chrome' in window,
          chromeRuntime: window.chrome && 'runtime' in window.chrome,
          
          // Plugin tests
          pluginsCount: navigator.plugins.length,
          
          // Language tests
          languagesCount: navigator.languages.length,
          
          // Automation property tests
          automationEvaluate: '__webdriver_evaluate' in navigator,
          seleniumEvaluate: '__selenium_evaluate' in navigator,
          webdriverScript: '__webdriver_script_function' in navigator,
          
          // Permission test
          permissionQuery: 'permissions' in navigator && 'query' in navigator.permissions,
          
          // User agent test
          userAgent: navigator.userAgent.includes('Chrome'),
          
          // Viewport test
          viewport: window.innerWidth > 0 && window.innerHeight > 0
        };
        
        // Calculate bot score (lower is better)
        let botScore = 0;
        if (!tests.webdriverUndefined) botScore += 30; // Critical
        if (!tests.chromePresent) botScore += 20;
        if (!tests.chromeRuntime) botScore += 15;
        if (tests.pluginsCount === 0) botScore += 15;
        if (tests.languagesCount === 0) botScore += 10;
        if (tests.automationEvaluate) botScore += 25; // Critical
        if (tests.seleniumEvaluate) botScore += 25; // Critical
        if (tests.webdriverScript) botScore += 25; // Critical
        if (!tests.userAgent) botScore += 10;
        if (!tests.viewport) botScore += 5;
        
        tests.botScore = botScore;
        tests.humanLike = botScore < 20; // Score under 20 is considered human-like
        
        return tests;
      });
      
      this.results.stealthScore = botDetectionResult.botScore;
      
      console.log('  📊 Bot Detection Results:');
      console.log(`    Webdriver hidden: ${botDetectionResult.webdriverUndefined ? '✅' : '❌'}`);
      console.log(`    Chrome object: ${botDetectionResult.chromePresent ? '✅' : '❌'}`);
      console.log(`    Plugins count: ${botDetectionResult.pluginsCount} ${botDetectionResult.pluginsCount > 0 ? '✅' : '❌'}`);
      console.log(`    Languages count: ${botDetectionResult.languagesCount} ${botDetectionResult.languagesCount > 0 ? '✅' : '❌'}`);
      console.log(`    Automation props: ${botDetectionResult.automationEvaluate || botDetectionResult.seleniumEvaluate || botDetectionResult.webdriverScript ? '❌' : '✅'}`);
      console.log(`    User agent valid: ${botDetectionResult.userAgent ? '✅' : '❌'}`);
      console.log(`    Viewport valid: ${botDetectionResult.viewport ? '✅' : '❌'}`);
      console.log(`  🎯 Bot Score: ${botDetectionResult.botScore}/100 (lower is better)`);
      console.log(`  🤖 Human-like: ${botDetectionResult.humanLike ? '✅ SUCCESS' : '❌ FAILED'}`);
      
      return botDetectionResult;
      
    } catch (error) {
      console.log(`  ❌ Comprehensive bot test failed: ${error.message}`);
      return { error: error.message, botScore: 100 };
    }
    
    await browser.close();
  }

  // Test 5: Real Website Bot Detection
  async testRealWebsiteBotDetection() {
    console.log('🔍 Testing Real Website Bot Detection...');
    
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--exclude-switches=enable-automation',
        '--disable-features=VizDisplayCompositor'
      ],
      ignoreDefaultArgs: ['--enable-automation']
    });
    
    const page = await browser.newPage();
    
    // Set realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Apply all stealth measures
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      window.chrome = { runtime: {}, loadTimes: function() {}, csi: function() {}, app: {} };
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    });
    
    try {
      // Test with a simple HTML page that checks for automation
      const testHTML = `
        <!DOCTYPE html>
        <html>
        <head><title>Bot Detection Test</title></head>
        <body>
          <div id="result">Testing...</div>
          <script>
            function detectBot() {
              const indicators = [];
              
              if (navigator.webdriver) indicators.push('webdriver');
              if (!window.chrome) indicators.push('no-chrome');
              if (navigator.plugins.length === 0) indicators.push('no-plugins');
              if (navigator.languages.length === 0) indicators.push('no-languages');
              if ('__webdriver_evaluate' in navigator) indicators.push('webdriver-eval');
              if ('__selenium_evaluate' in navigator) indicators.push('selenium-eval');
              
              const botScore = indicators.length;
              const isBot = botScore > 2;
              
              document.getElementById('result').textContent = 
                isBot ? 'BOT_DETECTED:' + indicators.join(',') : 'HUMAN_DETECTED:score=' + botScore;
            }
            
            detectBot();
          </script>
        </body>
        </html>
      `;
      
      await page.goto(`data:text/html,${encodeURIComponent(testHTML)}`, { waitUntil: 'networkidle2', timeout: 10000 });
      
      const result = await page.$eval('#result', el => el.textContent);
      const isHuman = result.startsWith('HUMAN_DETECTED');
      
      console.log(`  ${isHuman ? '✅' : '❌'} Real website test: ${result}`);
      
      return { success: isHuman, result: result };
      
    } catch (error) {
      console.log(`  ❌ Real website test failed: ${error.message}`);
      return { success: false, error: error.message };
    }
    
    await browser.close();
  }

  // Generate improved report
  generateReport() {
    const webdriverPassed = this.results.webdriverDetection.filter(r => r.passed).length;
    const chromePassed = this.results.chromeObjectDetection.filter(r => r.passed).length;
    const pluginsPassed = this.results.pluginsDetection.filter(r => r.passed).length;
    
    const totalTests = this.results.webdriverDetection.length + 
                      this.results.chromeObjectDetection.length + 
                      this.results.pluginsDetection.length;
    const totalPassed = webdriverPassed + chromePassed + pluginsPassed;
    
    return {
      testSuite: 'Improved Anti-Ban Testing',
      timestamp: new Date().toISOString(),
      stealthScore: this.results.stealthScore,
      humanLike: this.results.stealthScore < 20,
      summary: {
        totalTests: totalTests,
        totalPassed: totalPassed,
        successRate: totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) + '%' : '0%',
        webdriverDetection: `${webdriverPassed}/${this.results.webdriverDetection.length}`,
        chromeDetection: `${chromePassed}/${this.results.chromeObjectDetection.length}`,
        pluginsDetection: `${pluginsPassed}/${this.results.pluginsDetection.length}`,
        botScore: `${this.results.stealthScore}/100`,
        recommendation: this.results.stealthScore < 20 ? 'EXCELLENT - Ready for production' :
                       this.results.stealthScore < 40 ? 'GOOD - Minor improvements needed' :
                       this.results.stealthScore < 60 ? 'FAIR - Significant improvements needed' :
                       'POOR - Major stealth improvements required'
      },
      details: this.results
    };
  }

  // Run all improved tests
  async runAllTests() {
    console.log('🔬 Starting Improved Anti-Ban Testing Suite');
    console.log('🎯 Focus: Critical stealth features and bot detection avoidance\n');
    
    try {
      await this.testWebdriverDetection();
      console.log('');
      
      await this.testChromeObjectDetection();
      console.log('');
      
      await this.testPluginsAndLanguages();
      console.log('');
      
      const comprehensiveResult = await this.testComprehensiveBotDetection();
      console.log('');
      
      const realWebsiteResult = await this.testRealWebsiteBotDetection();
      console.log('');
      
    } catch (error) {
      console.error('💥 Test suite error:', error);
    }
    
    const report = this.generateReport();
    
    console.log('📋 IMPROVED TEST REPORT');
    console.log('=' .repeat(60));
    console.log(`Bot Detection Score: ${report.stealthScore}/100 (lower is better)`);
    console.log(`Human-like Rating: ${report.humanLike ? '✅ EXCELLENT' : '❌ NEEDS IMPROVEMENT'}`);
    console.log(`Overall Success Rate: ${report.summary.successRate}`);
    console.log(`Recommendation: ${report.summary.recommendation}`);
    console.log('');
    console.log('Detailed Results:');
    console.log(`  Webdriver Detection: ${report.summary.webdriverDetection} passed`);
    console.log(`  Chrome Object: ${report.summary.chromeDetection} passed`);
    console.log(`  Plugins/Languages: ${report.summary.pluginsDetection} passed`);
    
    // Save report
    const fs = require('fs');
    fs.writeFileSync('improved-anti-ban-report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Detailed report saved to: improved-anti-ban-report.json');
    
    // Mark Phase 3.3 as completed if score is good
    if (report.stealthScore < 30) {
      console.log('\n✅ Phase 3.3 COMPLETED: Anti-ban measures are working effectively!');
      console.log('🎯 Ready to proceed to Phase 3.4: Integration testing with frontend');
    } else {
      console.log('\n⚠️ Phase 3.3 NEEDS IMPROVEMENT: Bot detection score too high');
      console.log('🔧 Consider additional stealth measures before proceeding');
    }
    
    return report;
  }
}

// Run the improved tests
if (require.main === module) {
  const tester = new ImprovedAntiBanTester();
  tester.runAllTests()
    .then(() => {
      console.log('\n🏁 Improved anti-ban testing completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Improved test suite failed:', error);
      process.exit(1);
    });
}

module.exports = ImprovedAntiBanTester;