import puppeteer, { Browser, Page } from 'puppeteer';

// Note: Using regular puppeteer for now to avoid stealth plugin compatibility issues
// Stealth features are implemented manually in browser configuration
console.log('🔧 Using regular Puppeteer with manual stealth configuration');

interface BrowserInstance {
  id: string;
  browser: Browser;
  lastUsed: Date;
  memoryUsage: number;
  requestCount: number;
}

interface PageInstance {
  page: Page;
  browserId: string;
  inUse: boolean;
}

class BrowserPool {
  private browsers: Map<string, BrowserInstance> = new Map();
  private pages: PageInstance[] = [];
  private maxBrowsers = 3;
  private browserIdleTimeout = 600000; // 10 minutes
  private maxMemoryPerBrowser = 500; // MB
  private requestDelay = 2000; // 2 seconds between requests
  private lastRequestTime = 0;

  private userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ];

  private generateBrowserId(): string {
    return `browser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getRandomUserAgent(): string {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  private getRandomViewport() {
    const widths = [1200, 1366, 1440, 1536, 1920];
    const heights = [800, 768, 900, 1024, 1080];
    return {
      width: widths[Math.floor(Math.random() * widths.length)],
      height: heights[Math.floor(Math.random() * heights.length)]
    };
  }

  async createBrowser(): Promise<BrowserInstance> {
    console.log('🚀 Creating new browser instance...');
    
    const browser = await puppeteer.launch({
      headless: true, // Use headless mode
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=VizDisplayCompositor',
        '--disable-ipc-flooding-protection',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        '--disable-background-timer-throttling',
        '--disable-background-networking',
        '--disable-breakpad',
        '--disable-client-side-phishing-detection',
        '--disable-component-update',
        '--disable-default-apps',
        '--disable-domain-reliability',
        '--disable-extensions',
        '--disable-features=TranslateUI',
        '--disable-hang-monitor',
        '--disable-ipc-flooding-protection',
        '--disable-popup-blocking',
        '--disable-prompt-on-repost',
        '--disable-sync',
        '--disable-web-security',
        '--enable-automation=false',
        '--exclude-switches=enable-automation',
        '--no-default-browser-check',
        '--no-first-run',
        '--no-pings',
        '--password-store=basic',
        '--use-mock-keychain',
        '--hide-scrollbars',
        '--mute-audio'
      ],
      ignoreDefaultArgs: ['--enable-automation'],
      defaultViewport: null
    });

    // Additional stealth measures at browser level
    const pages = await browser.pages();
    if (pages.length > 0) {
      const page = pages[0];
      await page.evaluateOnNewDocument(() => {
        // More aggressive webdriver removal
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
          configurable: true
        });
        
        // Remove all automation-related properties safely
        try {
          const navProto = Object.getPrototypeOf(navigator) as Navigator;
          delete (navProto as unknown as Record<string, unknown>).webdriver;
        } catch (e) {
          // Ignore if property is not configurable
        }
      });
    }

    const id = this.generateBrowserId();
    const instance: BrowserInstance = {
      id,
      browser,
      lastUsed: new Date(),
      memoryUsage: 0,
      requestCount: 0
    };

    this.browsers.set(id, instance);
    console.log(`✅ Browser created with ID: ${id}`);
    
    return instance;
  }

  async getBrowser(): Promise<{ browser: Browser; browserId: string; release: () => void }> {
    // Respect rate limiting
    await this.enforceRateLimit();

    // Clean up old browsers first
    await this.cleanupIdleBrowsers();

    // Try to find an available browser
    let selectedInstance: BrowserInstance | null = null;

    for (const instance of this.browsers.values()) {
      if (instance.memoryUsage < this.maxMemoryPerBrowser) {
        selectedInstance = instance;
        break;
      }
    }

    // Create new browser if none available and under limit
    if (!selectedInstance && this.browsers.size < this.maxBrowsers) {
      selectedInstance = await this.createBrowser();
    }

    // If still no browser, wait and retry
    if (!selectedInstance) {
      console.log('⏳ All browsers busy, waiting for one to become available...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      return this.getBrowser(); // Recursive retry
    }

    // Update usage stats
    selectedInstance.lastUsed = new Date();
    selectedInstance.requestCount++;

    const browserId = selectedInstance.id;
    const browser = selectedInstance.browser;

    console.log(`🔄 Using browser ${browserId} (requests: ${selectedInstance.requestCount})`);

    const release = () => {
      console.log(`🔓 Released browser ${browserId}`);
      // Browser is automatically available for next request
    };

    return { browser, browserId, release };
  }

  async getPage(browserId: string): Promise<{ page: Page; release: () => void }> {
    const browserInstance = this.browsers.get(browserId);
    if (!browserInstance) {
      throw new Error(`Browser ${browserId} not found`);
    }

    // Try to find an available page
    let availablePage = this.pages.find(p => p.browserId === browserId && !p.inUse);

    if (!availablePage) {
      // Create new page
      const page = await browserInstance.browser.newPage();
      
      // Set random user agent and viewport
      await page.setUserAgent(this.getRandomUserAgent());
      const viewport = this.getRandomViewport();
      await page.setViewport(viewport);

      // Remove webdriver traces
      await page.evaluateOnNewDocument(() => {
        // Remove webdriver property
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });
        
        // Mock chrome object
        (window as unknown as { chrome: object }).chrome = {
          runtime: {},
          loadTimes: function() {},
          csi: function() {},
          app: {}
        };
        
        // Mock permissions (simplified to avoid type issues)
        try {
          const originalQuery = window.navigator.permissions.query;
          if (originalQuery) {
            window.navigator.permissions.query = (parameters: PermissionDescriptor) => {
              if ('name' in parameters && parameters.name === 'notifications') {
                return Promise.resolve({
                  state: 'granted' as PermissionState,
                  name: 'notifications' as PermissionName,
                  onchange: null,
                  addEventListener: () => {},
                  removeEventListener: () => {},
                  dispatchEvent: () => false
                } as PermissionStatus);
              }
              return originalQuery.call(window.navigator.permissions, parameters);
            };
          }
        } catch (e) {
          // Ignore permission query errors
        }
        
        // Mock plugins
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5],
        });
        
        // Mock languages
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en'],
        });
      });

      // Set realistic headers
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/avif,*/*;q=0.8',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
      });

      availablePage = {
        page,
        browserId,
        inUse: false
      };

      this.pages.push(availablePage);
      console.log(`📄 Created new page for browser ${browserId}`);
    }

    availablePage.inUse = true;

    const release = () => {
      if (availablePage) {
        availablePage.inUse = false;
        console.log(`📄 Released page for browser ${browserId}`);
      }
    };

    return { page: availablePage.page, release };
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.requestDelay) {
      const waitTime = this.requestDelay - timeSinceLastRequest;
      console.log(`⏱️ Rate limiting: waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  private async cleanupIdleBrowsers(): Promise<void> {
    const now = new Date();
    const browsersToRemove: string[] = [];

    for (const [id, instance] of this.browsers.entries()) {
      const idleTime = now.getTime() - instance.lastUsed.getTime();
      
      if (idleTime > this.browserIdleTimeout) {
        browsersToRemove.push(id);
      }
    }

    for (const id of browsersToRemove) {
      await this.closeBrowser(id);
    }
  }

  private async closeBrowser(browserId: string): Promise<void> {
    const instance = this.browsers.get(browserId);
    if (!instance) return;

    try {
      // Remove associated pages
      this.pages = this.pages.filter(p => p.browserId !== browserId);
      
      // Close browser
      await instance.browser.close();
      this.browsers.delete(browserId);
      
      console.log(`🗑️ Closed idle browser ${browserId}`);
    } catch (error) {
      console.error(`Error closing browser ${browserId}:`, error);
    }
  }

  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up browser pool...');
    
    for (const [id, instance] of this.browsers.entries()) {
      try {
        await instance.browser.close();
        console.log(`🗑️ Closed browser ${id}`);
      } catch (error) {
        console.error(`Error closing browser ${id}:`, error);
      }
    }
    
    this.browsers.clear();
    this.pages = [];
  }

  getStats() {
    return {
      activeBrowsers: this.browsers.size,
      totalPages: this.pages.length,
      busyPages: this.pages.filter(p => p.inUse).length,
      browserDetails: Array.from(this.browsers.values()).map(b => ({
        id: b.id,
        requestCount: b.requestCount,
        lastUsed: b.lastUsed,
        memoryUsage: b.memoryUsage
      }))
    };
  }
}

// Singleton instance
export const browserPool = new BrowserPool();

// Cleanup on process exit
process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, cleaning up browsers...');
  await browserPool.cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, cleaning up browsers...');
  await browserPool.cleanup();
  process.exit(0);
});