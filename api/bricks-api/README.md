# 🧱 Bricks Backend API

Welcome to the headless Next.js API backend for **Bricks**.

This service runs entirely separate from the main Vite frontend. It handles the heavy-lifting for tasks where standard client-side browser CORS restrictions or massive memory footprints apply. This includes our stealth Puppeteer instances, background browser queues, and proxying logic for the Autonomous AI Agents.

## 🚀 Capabilities

- **Puppeteer Stealth Execution (`/api/puppeteer`)**: A robust, queue-based browser pool system. Handles complex automations, screenshot tasks, and bypasses bot-detection techniques to safely scrape difficult interfaces.
- **Autonomous Web Search (`/api/search`)**: Proxies dynamic queries through Serper, Tavily, or directly via native DuckDuckGo HTML parsing. Serving as the "eyes" for the Bricks Autonomous AI Agents.
- **Web Content Reader (`/api/reader`)**: A resilient, 3-layer URL reader with automatic fallback. Transforms any web page into clean, AI-ready text — including JavaScript-heavy React SPAs. See details below.
- **Serverless Page Fetcher (`/api/fetch-page`)**: A fast, Puppeteer-free URL reading waterfall that extracts markdown via multiple fallback APIs (Fetch → ScraperAPI → scrape.do → Tavily → Scrapfly → Firecrawl).
- **Email Validation Waterfall (`/api/validate-email`)**: A resilient email verification cascade routing through multiple specialized providers (Hunter, BillionVerifier, MillionVerifier) to maximize accuracy and bypass rate limits.

## ⚙️ Environment Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables (`.env.local`)
Create a `.env.local` file at the root of `api/bricks-api`.

While you can plug in your AI provider keys (OpenAI, Gemini, Groq) directly in the Bricks Frontend UI, the **Backend API** manages secure keys for web scraping and search APIs used by the Web Research agent.

```env
# ── Web Search Providers ─────────────────────────────────────────────────────
# If none are provided, the system falls back gracefully to free DuckDuckGo scraping.
SERPER_API_KEY=your_serper_key_here
TAVILY_API_KEY=your_tavily_key_here

# ── Web Reader — ScraperAPI (Optional) ───────────────────────────────────────
# Used as a fallback layer in /api/reader when Puppeteer fails, and used in /fetch-page stack.
# Get a key at https://www.scraperapi.com (free tier available).
SCRAPER_API_KEY=your_scraperapi_key_here

# ── Serverless Page Fetcher APIs (/api/fetch-page) ───────────────────────────
# Keys for the puppeteer-free multi-provider sequence (Fetch → ScraperAPI → scrape.do → Tavily → Scrapfly → Firecrawl)
SCRAPE_DO_KEY=your_scrape_do_key_here
SCRAPFLY_KEY=your_scrapfly_key_here
FIRECRAWL_KEY=your_firecrawl_key_here

# ── /api/reader Feature Flag ──────────────────────────────────────────────────
# Set to "true" to route ALL /reader traffic through /fetch-page (no Puppeteer).
READER_USE_FETCH_PAGE="false"

# ── Email Validation APIs (/api/validate-email) ──────────────────────────────
# We cascade through these APIs from top to bottom
HUNTER_KEY=your_hunter_key_here
# VERIFALIA_USERNAME=your_verifalia_username
# VERIFALIA_PASSWORD=your_verifalia_password
MILLION_VERIFIER_KEY=your_million_verifier_key_here
QUICK_EMAIL_VERIFICATION_KEY=your_key_here
# EMAILABLE_KEY=your_emailable_key

# ── Puppeteer Settings ───────────────────────────────────────────────────────
# Max concurrent browser instances (default: 5)
PUPPETEER_MAX_BROWSERS=5

# Optional: path to your own Chromium-based browser binary (Chrome, Edge, Brave…).
# Leave commented out to use Puppeteer's bundled Chromium.
# PUPPETEER_BROWSER_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
```

### 3. Run the Development Server
We use Turbopack for fast compilation.
```bash
npm run dev
```

The backend API binds to `http://localhost:3000`. Keep this running alongside your frontend.

---

## 🔌 API Endpoints Reference

### Web Reading, Search, and Enrichment
- **`POST /api/search`** — Receives `{ query }` and returns URL/snippet results. Tries Serper → Tavily → DuckDuckGo.
- **`POST /api/reader`** — Receives `{ url }` and returns `{ content, title, provider, error }`. Converts URLs to AI-ready markdown endpoints.
- **`POST /api/fetch-page`** — Fast, Puppeteer-free URL reader. Uses a stacked fallback design parsing pages into clean multi-modal markdown via serverless endpoints.
- **`POST /api/validate-email`** — Receives `{ email }` and validates whether the inbox exists by cascading through multiple provider APIs.

### Puppeteer Automation Engine
- **`POST /api/puppeteer`** — Takes mapped JavaScript and runs an automation command.
- **`POST /api/puppeteer/queue`** — Queue management to safely handle large bulk CSV tasks.
- **`GET /api/puppeteer/queue-status`** — Monitor memory pools and active browser limits.
- **`GET /api/puppeteer/status/[id]`** — Real-time progress and logs for individual automations.
- **`GET /api/puppeteer/performance`** — Server load metrics and concurrent browser context stats.

---

## 📖 Reader — 3-Layer Fallback Chain

`/api/reader` uses a tiered strategy to maximize success rate while minimizing cost and latency.

```
Request
   │
   ▼
1️⃣  Plain fetch + Mozilla Readability
    Free, ~instant. Works for static & server-rendered pages.
    Detects JS-rendered SPAs automatically (Readability returns null)
    and falls through immediately — no garbage JS code passed to AI.
   │
   ▼ (Readability failed = SPA, or < 300 chars extracted)
2️⃣  Puppeteer Browser Pool (networkidle2)
    Full headless Chromium with universal tracker/analytics blocking.
    Handles React SPAs, Next.js, and any JS-rendered page.
   │
   ▼ (rare — Puppeteer failed or insufficient content)
3️⃣  ScraperAPI (render=true)
    Paid cloud scraper. Last resort for heavy Cloudflare-protected pages.
    Only used if SCRAPER_API_KEY is set AND Puppeteer failed.
```

### Why tracker blocking matters
Analytics tools (PostHog, Google Analytics, Segment, Mixpanel, etc.) make continuous background network requests. Without blocking them, `networkidle2` waits for those requests to stop — which they never do — causing timeouts or premature page grabs mid-hydration.

The browser pool blocks **30+ known tracker/analytics domains** plus useless resource types (images, fonts, media) at the Puppeteer network layer. This is applied universally to every page; no per-site configuration is needed. The target site's server cannot detect this (identical to how ad blockers work for real users).

The response always includes a `provider` field (`"fetch"`, `"puppeteer"`, `"scraperapi"`, or `"none"`) so you can monitor which layer is being used.

---

## 🧠 Architecture Notes
This environment is intentionally structured as Next.js App Router API endpoints (`app/api/.../route.ts`). By decoupling this "Compute Node" from the central UI codebase, we allow this heavy backend server to be vertically scaled, dockerized, or hosted independently of the main React/Zustand lifecycle.

---
*Built as the compute engine for the Bricks Local Enrichment ecosystem.*
