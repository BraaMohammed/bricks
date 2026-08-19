import type { Browser, Page } from 'puppeteer';

// Note: Using regular Puppeteer for now to avoid stealth plugin compatibility issues
// Stealth features are implemented manually in browser configuration
console.log('🔧 Using regular Puppeteer with manual stealth configuration');

// Lazy-load puppeteer — on Cloudflare Workers this package is not available
async function getPuppeteer() {
  const puppeteer = await import('puppeteer');
  return puppeteer.default ?? puppeteer;
}

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
  // PUPPETEER_MAX_BROWSERS — max concurrent browser instances (default: 5)
  private maxBrowsers = parseInt(process.env.PUPPETEER_MAX_BROWSERS || '5', 10);
  private browserIdleTimeout = 600000; // 10 minutes
  private maxMemoryPerBrowser = 500; // MB
  // Fix #4: Per-domain rate limiting — replaces global single-timestamp lock.
  // Different domains run freely in parallel; same domain waits 1s between requests.
  private domainRateLimits: Map<string, number> = new Map();
  private domainDelay = 1000; // 1 second between requests to the same domain

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

    // PUPPETEER_BROWSER_PATH — optional path to a custom Chromium-based browser
    // (Chrome, Edge, Brave, Chromium, etc.). Omit to use Puppeteer's bundled Chromium.
    // The browser is always launched in headless mode regardless of which binary is used.
    const executablePath = process.env.PUPPETEER_BROWSER_PATH || undefined;
    if (executablePath) {
      console.log(`🌐 Using custom browser binary: ${executablePath}`);
    }
    
    const browser = await (await getPuppeteer()).launch({
      headless: true, // Always headless — even when using a custom browser path
      ...(executablePath ? { executablePath } : {}),
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

  async getPage(browserId: string): Promise<{ page: Page; release: () => Promise<void> }> {
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

      // ── Universal request interception ─────────────────────────────────────
      // Applied once at page creation — covers every URL this page ever loads.
      //
      // Two goals:
      //  1. Block tracker/analytics domains so they can't keep the network busy
      //     and prevent networkidle2 from settling (the PostHog problem).
      //  2. Block resource types useless for text extraction (images, fonts,
      //     media) to speed up every page load.
      //
      // The tracker list covers the entire internet — no per-site configuration needed.
      await page.setRequestInterception(true);

      // Domains whose requests are blocked unconditionally.
      // These are analytics, tracking, ads, error-reporting, session-recording tools.
      const BLOCKED_TRACKER_DOMAINS = [
        // Analytics
        'google-analytics.com', 'googletagmanager.com', 'googlesyndication.com',
        'doubleclick.net', 'googleadservices.com',
        // PostHog (used by workatastartup + many others)
        'posthog.com', 'posthog.io', 'posthogcdn.com', 'app.posthog.com',
        // Segment
        'segment.com', 'segment.io', 'cdn.segment.com', 'api.segment.io',
        // Mixpanel
        'mixpanel.com', 'cdn.mxpnl.com',
        // Amplitude
        'amplitude.com', 'cdn.amplitude.com',
        // Hotjar
        'hotjar.com', 'static.hotjar.com', 'vc.hotjar.io',
        // FullStory
        'fullstory.com', 'rs.fullstory.com',
        // Heap
        'heap.io', 'heapanalytics.com',
        // LogRocket
        'logrocket.com', 'cdn.logrocket.io',
        // Microsoft Clarity
        'clarity.ms',
        // Intercom (widget + analytics)
        'intercom.io', 'intercom.com', 'intercomcdn.com', 'widget.intercom.io',
        // Crisp
        'crisp.chat',
        // HubSpot analytics
        'hs-analytics.net', 'hs-scripts.com', 'hsforms.com', 'hubspot.com',
        // Facebook Pixel
        'facebook.net', 'facebook.com/tr',
        // Twitter/X Pixel
        'ads-twitter.com', 't.co',
        // LinkedIn Insight
        'ads.linkedin.com', 'snap.licdn.com',
        // Snapchat Pixel
        'tr.snapchat.com',
        // TikTok Pixel
        'analytics.tiktok.com',
        // Amazon Ads
        'adsystem.amazon.com', 'fls-na.amazon.com',
        // Error/crash tracking (keep persistent connections open)
        'ingest.sentry.io', 'sentry.io', 'browser.sentry-cdn.com',
        'bugsnag.com', 'notify.bugsnag.com',
        'rollbar.com', 'api.rollbar.com',
        // Datadog RUM
        'datadoghq.com', 'browser-intake-datadoghq.com',
        // New Relic
        'newrelic.com', 'bam.nr-data.net',
        // Cloudflare Insights (not the CDN, just the analytics beacon)
        'cloudflareinsights.com',
        // Mouseflow / Smartlook
        'mouseflow.com', 'smartlook.com',
        // Drift chat
        'drift.com', 'js.driftt.com',
        // Zendesk widget
        'zdassets.com', 'ekr.zdassets.com',
      ];

      // Resource types that are never needed for text extraction.
      const BLOCKED_RESOURCE_TYPES = new Set(['image', 'media', 'font']);

      page.on('request', (req) => {
        // Block useless resource types first (cheapest check)
        if (BLOCKED_RESOURCE_TYPES.has(req.resourceType())) {
          req.abort();
          return;
        }

        // Block tracker/analytics domains
        const reqUrl = req.url();
        const isTracker = BLOCKED_TRACKER_DOMAINS.some(domain => reqUrl.includes(domain));
        if (isTracker) {
          req.abort();
          return;
        }

        req.continue();
      });

      availablePage = {
        page,
        browserId,
        inUse: false
      };

      this.pages.push(availablePage);
      console.log(`📄 Created new page for browser ${browserId} (request interception active)`);
    }

    availablePage.inUse = true;

    const release = async () => {
      if (availablePage) {
        try {
          // Clean page state for reuse instead of closing
          const page = availablePage.page;
          
          // Clear cookies and storage
          const client = await page.target().createCDPSession();
          await client.send('Network.clearBrowserCookies');
          await client.send('Network.clearBrowserCache');
          await page.evaluateOnNewDocument(() => {
            localStorage.clear();
            sessionStorage.clear();
          });
          
          // Navigate to blank page to clear state
          await page.goto('about:blank', { timeout: 5000 }).catch(() => {});
          
          availablePage.inUse = false;
          console.log(`📄 Cleaned and released page for browser ${browserId}`);
        } catch (error) {
          // If cleanup fails, close the page
          console.warn(`⚠️ Page cleanup failed, closing page:`, error);
          try {
            await availablePage.page.close();
            this.pages = this.pages.filter(p => p !== availablePage);
          } catch (closeError) {
            console.error(`Error closing page:`, closeError);
          }
        }
      }
    };

    return { page: availablePage.page, release };
  }

  // Fix #4: Per-domain rate limiter.
  // Called by the queue before executing user code on a page.
  // - Jobs hitting the same domain wait 1s from the previous hit (anti-ban).
  // - Jobs hitting different domains have zero artificial delay (full concurrency).
  async enforceRateLimitForDomain(domain: string): Promise<void> {
    if (!domain) return;

    const lastTime = this.domainRateLimits.get(domain) || 0;
    const now = Date.now();
    const elapsed = now - lastTime;

    if (elapsed < this.domainDelay) {
      const waitTime = this.domainDelay - elapsed;
      console.log(`⏱️ Rate limiting domain "${domain}": waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.domainRateLimits.set(domain, Date.now());
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