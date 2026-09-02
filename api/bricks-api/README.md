# Bricks Backend API

The headless Next.js API backend for Bricks.

Runs separately from the Vite frontend. Handles anything that can't run client-side: Puppeteer instances, browser queues, background agent proxying, email validation cascades, and multi-provider web reading.

---

## Capabilities

- **AI Waterfall Gateway (`/api/ai/v1`)** — OpenAI-compatible chat completions across 6 free-tier providers (Ollama → Nvidia NIM → Cloudflare → OpenRouter → Google AI Studio → Groq) with automatic failover, per-provider cooldowns, and model aliasing. Point any OpenAI SDK at it and never pay for inference again.
- **Puppeteer Stealth Engine (`/api/puppeteer`)** — Queue-based browser pool. Handles JS-heavy pages, bot-detection bypass, screenshot tasks, and bulk automations with memory management.
- **Autonomous Web Search (`/api/search`)** — Routes queries through Serper → TinyFish → Exa → Tavily → DuckDuckGo (free fallback). Used as the search layer for web research agents.
- **Web Content Reader (`/api/reader`)** — 4-layer fallback chain (Fetch → Puppeteer → TinyFish → ScraperAPI) that converts any URL into clean, AI-ready markdown, including JS-rendered SPAs.
- **Serverless Page Fetcher (`/api/fetch-page`)** — Puppeteer-free URL reading waterfall: Fetch → Firecrawl → TinyFish → scrape.do → ScraperAPI → Diffbot → Tavily → Scrapfly.
- **Email Validation Cascade (`/api/validate-email`)** — Routes email validation through Hunter → MillionVerifier → QuickEmailVerification in sequence to maximize accuracy and stay within free tiers.

---

## Environment Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables (`.env.local`)
Copy `.env.example` to `.env.local` at the root of `api/bricks-api` and fill in what you use — anything left blank is skipped.

AI provider keys used **by the frontend agents** (OpenAI, Gemini, Groq) are still set in the frontend UI. The keys below are backend-only: scraping, search, email validation, and the AI Waterfall Gateway (`/api/ai/v1`), which reads its provider keys from this file.

```env
# ── Web Search Providers ─────────────────────────────────────────────────────
# Falls back to free DuckDuckGo scraping if none are set.
SERPER_API_KEY=your_serper_key_here
TINYFISH_API_KEY=your_tinyfish_key_here
EXA_API_KEY=your_exa_key_here
TAVILY_API_KEY=your_tavily_key_here

# ── Web Reader & Scrapers (Optional) ─────────────────────────────────────────
# TinyFish — Free tier search & fetch (uses TINYFISH_API_KEY above)
# ScraperAPI — last-resort fallback in /api/reader when Puppeteer/TinyFish fail
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

# ── AI Waterfall Gateway (/api/ai/v1) ─────────────────────────────────────────
# Provider priority: Ollama → Nvidia NIM → Cloudflare → OpenRouter →
# Google AI Studio → Groq. Leave blank to skip a provider.
WATERFALL_MODE=stateful            # or "serverless" (no health state; Vercel-safe)
WATERFALL_PERSIST_HEALTH=false     # persist cooldowns to provider-health.json
OLLAMA_BASE_URL=                   # e.g. http://localhost:11434 — disabled when blank
NVIDIA_NIM_API_KEY=                # https://build.nvidia.com — generous free tier
CLOUDFLARE_TOKEN=
CLOUDFLARE_ACCOUNT_ID=
OPENROUTER_API_KEY=                # https://openrouter.ai — many :free models
GOOGLE_AI_STUDIO_API_KEY=          # https://aistudio.google.com
GROQ_API_KEY=                      # https://console.groq.com — very fast
```

> See `.env.example` for the complete, commented list of every supported variable.

### 3. Run the Dev Server
```bash
npm run dev
# Binds to http://localhost:3000
```

---

## API Endpoints

### Web Reading and Search
- **`POST /api/search`** — Takes `{ query }`, returns URL and snippet results. Tries Serper → Exa → Tavily → DuckDuckGo.
- **`POST /api/reader`** — Takes `{ url }`, returns `{ content, title, provider, error }`. See fallback chain below.
- **`POST /api/fetch-page`** — Puppeteer-free URL reader with multi-provider fallback stack.
- **`POST /api/validate-email`** — Takes `{ email }`, cascades through validation providers, returns deliverability status.

### AI Waterfall Gateway
- **`POST /api/ai/v1/chat/completions`** — Standard OpenAI chat completion body. Tries each configured provider in priority order until one succeeds. Extra response headers: `x-provider-used`, `x-attempts`.
- **`GET /api/ai/v1/models`** — OpenAI-compatible model list. Only returns models servable by your configured providers, with `x_providers` and `x_available` extensions.

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

## AI Waterfall Gateway — How It Works

`/api/ai/v1` is a drop-in OpenAI-compatible gateway. Instead of paying one provider, it waterfalls each request across free-tier providers in priority order until one responds successfully:

```
Request (OpenAI chat completion format)
   │
   ▼
1️⃣  Ollama (local/cloud) — free, no key, no rate limits
2️⃣  Nvidia NIM — generous free tier
3️⃣  Cloudflare AI Workers
4️⃣  OpenRouter — aggregator, many :free models
5️⃣  Google AI Studio — free tier
6️⃣  Groq — very fast, low free-tier limits
   │
   ▼
Standard OpenAI response + x-provider-used / x-attempts headers
```

- **Cooldowns** — a provider that returns 429 or 5xx is skipped for a per-provider cooldown period (`stateful` mode, in-memory). Set `WATERFALL_MODE=serverless` for Vercel/Lambda where memory doesn't persist.
- **Model aliasing** — callers use canonical IDs (e.g. `llama-3.1-8b`); `app/api/ai/providers.config.ts` maps them to each provider's exact model string. Run `npx tsx scripts/discover-providers.ts` to list live model IDs from your keys.
- **Non-streaming only** — `stream: true` is currently downgraded to a regular response.

Usage with any OpenAI SDK:

```ts
const openai = new OpenAI({
  baseURL: 'http://localhost:3000/api/ai/v1',
  apiKey: 'not-needed',           // gateway keys live server-side
});
await openai.chat.completions.create({
  model: 'gpt-oss-120b',
  messages: [{ role: 'user', content: 'Hello' }],
});
```

---

## Architecture Notes

The backend is structured as Next.js App Router API endpoints (`app/api/.../route.ts`), intentionally decoupled from the React/Vite frontend. This lets the compute layer be vertically scaled, dockerized, or hosted independently without touching the UI.

---

*Backend compute engine for the Bricks local enrichment stack.*
