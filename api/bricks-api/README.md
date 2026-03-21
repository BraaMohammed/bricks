# 🧱 Bricks Backend API

Welcome to the headless Next.js API backend for **Bricks**. 

This service runs entirely separate from the main Vite frontend. It handles the heavy-lifting for tasks where standard client-side browser CORS restrictions or massive memory footprints apply. This includes our stealth Puppeteer instances, background browser queues, and proxying logic for the Autonomous AI Agents.

## 🚀 Capabilities

- **Puppeteer Stealth Execution (`/api/puppeteer`)**: A robust, queue-based browser pool system. Using `puppeteer-extra-plugin-stealth`, it handles complex automations, screenshot tasks, and bypasses bot-detection techniques to safely scrape difficult interfaces.
- **Autonomous Web Search (`/api/search`)**: Proxies dynamic queries through Serper, Tavily, or directly via native DuckDuckGo HTML parsing. Serving as the "eyes" for the Bricks Autonomous Vercel AI Agents.
- **Web Content Reader (`/api/reader`)**: A headless URL parser utilizing Mozilla Readability and Cheerio to transform messy HTML code into perfectly clean, AI-ready markdown.

## ⚙️ Environment Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables (.env)
Create a `.env` file locally at the root of `api/bricks-api`. 

While you can plug in your AI provider keys (OpenAI, Gemini, Groq) directly in the Bricks Frontend UI, the **Backend API** manages secure keys for web scraping APIs primarily used by the Web Research agent. 

```env
# Web Search Providers (Optional)
# If none are provided, the system falls back gracefully to completely free DuckDuckGo HTML request scraping.
SERPER_API_KEY=your_serper_key_here
TAVILY_API_KEY=your_tavily_key_here
```

### 3. Run the Development Server
We utilize Fast Refresh and Turbopack for ultra-fast compilation.
```bash
npm run dev
```

The backend API natively binds to `http://localhost:3000`. Keep this running in the background alongside your frontend!

---

## 🔌 API Endpoints Reference

### Web Reading & Searching (Agents)
- **`POST /api/search`**: Receives an AI `{ query }` object and returns curated URL strings and snippets. Dynamically falls back and traverses active providers.
- **`POST /api/reader`**: Takes a `{ url }` and extracts the clean `content` (markdown) representation for AI processing.

### Puppeteer Automation Engine
- **`POST /api/puppeteer`**: Takes your mapped Javascript and initiates an automation command execution.
- **`POST /api/puppeteer/queue`**: Queue management mechanism to prevent system crashing on massive bulk CSV scraping tasks.
- **`GET /api/puppeteer/queue-status`**: Monitor available memory pools and active headless browser limits.
- **`GET /api/puppeteer/status/[id]`**: Track real-time progress and logs of individual threaded automations.
- **`GET /api/puppeteer/performance`**: Track server load metrics and concurrent active browser contexts.

## 🧠 Architecture Notes
This environment is intentionally structured as Next.js App Router API endpoints (`app/api/.../route.ts`). By decoupling this "Compute Node" from the central UI codebase, we allow this heavy backend server to be vertically scaled, dockerized, or hosted independently of the main React/Zustand lifecycle.

---
*Built as the compute engine for the Bricks Local Enrichment ecosystem.*
