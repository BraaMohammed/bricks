# 🧱 Bricks Backend API

Welcome to the headless Next.js API backend for **Bricks**.

This service runs entirely separate from the main Vite frontend. It handles the heavy-lifting for tasks where standard client-side browser CORS restrictions or massive memory footprints apply. This includes our stealth Puppeteer instances, background browser queues, and proxying logic for the Autonomous AI Agents.

## 🚀 Capabilities

- **Puppeteer Stealth Execution (`/api/puppeteer`)**: A robust, queue-based browser pool system. Handles complex automations, screenshot tasks, and bypasses bot-detection techniques to safely scrape difficult interfaces.
- **Autonomous Web Search (`/api/search`)**: Proxies dynamic queries through Serper, Tavily, or directly via native DuckDuckGo HTML parsing. Serving as the "eyes" for the Bricks Autonomous AI Agents.
- **Web Content Reader (`/api/reader`)**: A resilient, 3-layer URL reader with automatic fallback. Transforms any web page into clean, AI-ready text — including JavaScript-heavy React SPAs. See details below.

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
# Used as a last-resort fallback layer in /api/reader when Puppeteer fails.
# Get a key at https://www.scraperapi.com (free tier available).
# Leave blank to skip this layer — Puppeteer handles the vast majority of cases.
SCRAPER_API_KEY=your_scraperapi_key_here

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

### Web Reading & Searching (Agents)
- **`POST /api/search`** — Receives `{ query }` and returns URL/snippet results. Tries Serper → Tavily → DuckDuckGo.
- **`POST /api/reader`** — Receives `{ url }` and returns `{ content, title, provider, error }`. See fallback chain below.

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
