# Bricks Backend API

The headless Next.js API backend for Bricks.

Runs separately from the Vite frontend. Handles anything that can't run client-side: Puppeteer instances, browser queues, background agent proxying, email validation cascades, and multi-provider web reading.

---

## Capabilities

- **Puppeteer Stealth Engine (`/api/puppeteer`)** — Queue-based browser pool. Handles JS-heavy pages, bot-detection bypass, screenshot tasks, and bulk automations with memory management.
- **Autonomous Web Search (`/api/search`)** — Routes queries through Serper → Tavily → DuckDuckGo (free fallback). Used as the search layer for web research agents.
- **Web Content Reader (`/api/reader`)** — 3-layer fallback chain that converts any URL into clean, AI-ready markdown, including JS-rendered SPAs.
- **Serverless Page Fetcher (`/api/fetch-page`)** — Puppeteer-free URL reading waterfall: Fetch → ScraperAPI → Diffbot → scrape.do → Tavily → Scrapfly → Firecrawl.
- **Email Validation Cascade (`/api/validate-email`)** — Routes email validation through Hunter → MillionVerifier → QuickEmailVerification in sequence to maximize accuracy and stay within free tiers.

---

## Environment Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables (`.env.local`)
Create `.env.local` at the root of `api/bricks-api`.

AI provider keys (OpenAI, Gemini, Groq) are set in the frontend UI. This file handles backend-only keys for scraping, search, and email validation.

```env
# ── Web Search Providers ─────────────────────────────────────────────────────
# Falls back to free DuckDuckGo scraping if neither is set.
SERPER_API_KEY=your_serper_key_here
TAVILY_API_KEY=your_tavily_key_here

# ── Web Reader — ScraperAPI (Optional) ───────────────────────────────────────
# Last-resort fallback in /api/reader when Puppeteer fails.
# Free tier available at https://www.scraperapi.com
# Leave blank to skip — Puppeteer handles the vast majority of cases.
SCRAPER_API_KEY=your_scraperapi_key_here

# ── Serverless Page Fetcher (/api/fetch-page) ─────────────────────────────────
# Diffbot — 10,000 free requests/month (Smart AI extraction)
DIFFBOT_TOKEN=your_diffbot_token_here
SCRAPE_DO_KEY=your_scrape_do_key_here
SCRAPFLY_KEY=your_scrapfly_key_here
FIRECRAWL_KEY=your_firecrawl_key_here

# ── /api/reader Feature Flag ──────────────────────────────────────────────────
# Set to "true" to route all /reader traffic through /fetch-page (no Puppeteer).
READER_USE_FETCH_PAGE="false"

# ── Email Validation (/api/validate-email) ────────────────────────────────────
HUNTER_KEY=your_hunter_key_here
MILLION_VERIFIER_KEY=your_million_verifier_key_here
QUICK_EMAIL_VERIFICATION_KEY=your_key_here

# ── Puppeteer Settings ────────────────────────────────────────────────────────
# Max concurrent browser instances (default: 5)
PUPPETEER_MAX_BROWSERS=5

# Optional: path to a local Chromium-based binary (Chrome, Edge, Brave).
# Leave commented to use Puppeteer's bundled Chromium.
# PUPPETEER_BROWSER_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
```

### 3. Run the Dev Server
```bash
npm run dev
# Binds to http://localhost:3000
```

---

## API Endpoints

### Web Reading and Search
- **`POST /api/search`** — Takes `{ query }`, returns URL and snippet results. Tries Serper → Tavily → DuckDuckGo.
- **`POST /api/reader`** — Takes `{ url }`, returns `{ content, title, provider, error }`. See fallback chain below.
- **`POST /api/fetch-page`** — Puppeteer-free URL reader with multi-provider fallback stack.
- **`POST /api/validate-email`** — Takes `{ email }`, cascades through validation providers, returns deliverability status.

### Puppeteer Automation Engine
- **`POST /api/puppeteer`** — Runs a mapped JavaScript automation command.
- **`POST /api/puppeteer/queue`** — Queue management for bulk CSV tasks.
- **`GET /api/puppeteer/queue-status`** — Active browser pool and memory usage.
- **`GET /api/puppeteer/status/[id]`** — Real-time progress and logs for a specific automation.
- **`GET /api/puppeteer/performance`** — Server load metrics and concurrent context stats.

---

## Reader — 3-Layer Fallback Chain

`/api/reader` maximizes success rate while minimizing cost and latency.

```
Request
   │
   ▼
1️⃣  Plain fetch + Mozilla Readability
    Free, near-instant. Works for static and server-rendered pages.
    Detects JS-rendered SPAs automatically (Readability returns null or < 300 chars)
    and falls through immediately.
   │
   ▼ (Readability failed or insufficient content)
2️⃣  Puppeteer Browser Pool (networkidle2)
    Full headless Chromium. Handles React SPAs, Next.js, any JS-rendered page.
    Blocks 30+ analytics/tracker domains at network layer — prevents networkidle2
    from hanging on PostHog, Segment, Google Analytics background requests.
   │
   ▼ (rare — Puppeteer failed or still insufficient)
3️⃣  ScraperAPI (render=true)
    Cloud scraper as last resort for heavy Cloudflare-protected pages.
    Only used if SCRAPER_API_KEY is set AND Puppeteer failed.
```

Every response includes a `provider` field (`"fetch"`, `"puppeteer"`, `"scraperapi"`, or `"none"`) so you can monitor which layer fired.

---

## Architecture Notes

The backend is structured as Next.js App Router API endpoints (`app/api/.../route.ts`), intentionally decoupled from the React/Vite frontend. This lets the compute layer be vertically scaled, dockerized, or hosted independently without touching the UI.

---

*Backend compute engine for the Bricks local enrichment stack.*
