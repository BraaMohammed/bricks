# Bricks 🧱

> Run data enrichment and outreach automation entirely on your own machine. No monthly subscriptions, no credit systems, no data leaving your computer.

![1755904265844](https://github.com/user-attachments/assets/38d5df71-ce7b-4a54-998d-81a80ac0cec8)

Most data enrichment platforms charge $200–400/month in base fees, then charge again per enrichment run in their own credit system. You also hand over your entire lead list to a cloud server just to run what is essentially a web search and an AI call.

Bricks runs the same workflows — web scraping, AI agents, browser automation, data synthesis — entirely on your own machine, using your own API keys at wholesale prices. Or run local models via Ollama for $0.

---

## What It Does

### Autonomous Web Research Agent
Give a column an instruction: *"Find this company's most recent funding round and who led it."*

Bricks spins up a search agent that creates queries, hits the `/api/search` and `/api/reader` backend endpoints, reads the parsed markdown of the pages, and writes the answer directly into your cell. It keeps searching until it finds something concrete.

### AI Email Finder
No third-party email tool needed. The agent takes the lead's data, systematically generates likely email patterns, then validates each one through a cascade of validation APIs (Hunter → MillionVerifier → QuickEmailVerification). It returns only confirmed, deliverable emails.

Using the free tiers of the validation stack, you can find and verify roughly 2,000–3,000 emails/month at $0.

### Dual-Agent Outreach System
Standard AI outreach tools use a single prompt and return a draft. This is different.

Two agents run in a loop:
1. **Writer agent** — receives the lead data and your prompt, writes a message
2. **Prospect agent** — receives the lead data and role-plays as that specific lead, reads the message, and critiques it

They loop — writer revises, prospect reviews — until the prospect agent approves the message. The result is outreach that has been pressure-tested against the actual persona before it ever reaches your clipboard.

You can run the writer on OpenAI and the prospect on a free local Ollama model to keep costs down.

### Built-in Puppeteer Stealth Engine
Sites that block standard APIs, require JavaScript rendering, or serve different content to known scraper IPs are handled by a local Puppeteer instance running from your own machine with your own IP.

The browser pool includes stealth plugins, smart queueing, connection pooling, and human-like delays. It blocks 30+ analytics/tracker domains at the network layer so `networkidle2` doesn't hang on background requests. No scraping API subscription needed.

### Unified Formula Editor
Every column is programmable. Click a column header to open the Formula Editor, which supports:
- Raw JavaScript (data cleaning, formatting, transformation)
- Direct AI prompts
- Puppeteer script mapping
- Autonomous web search agents
- AI email finder
- Firecrawl integrations

### Ollama Compatible — Almost 100% Free
Plug in any local model (Qwen, DeepSeek, Llama) via Ollama and run AI columns for $0. For search and scraping fallbacks, Bricks stacks 6 free-tier services with automatic failover — when one runs out of credits, it moves to the next automatically.

---

## Bring Your Own Keys

Bricks doesn't mark up API costs. You connect directly:

- **Groq Cloud** — fast, cheap inference on Llama models
- **OpenAI / Google Gemini** — plug in your own key, pay provider prices directly
- **Local Ollama** — run models like DeepSeek R1 or Qwen locally, no API cost, data stays on your machine

---

## Getting Started

Bricks is a monorepo. You need two terminal windows — one for the Vite frontend, one for the Next.js API backend.

**Prerequisites:** Node.js 18+ and `npm`

### 1. Clone the repo
```bash
git clone https://github.com/BraaMohammed/bricks.git
cd bricks
```

### 2. Start the Frontend (Terminal 1)
```bash
npm install
npm run dev
# UI runs at http://localhost:8080
```

### 3. Start the Backend API (Terminal 2)
```bash
cd api/bricks-api
npm install

# Create a .env.local file — see the backend README for all variables
# Minimum needed: SERPER_API_KEY or TAVILY_API_KEY for web search
# If neither is set, falls back to free DuckDuckGo scraping automatically

npm run dev
# API runs at http://localhost:3000
```

### 4. Configure AI
1. Open `http://localhost:8080`
2. Click the **Settings gear**
3. Add your API keys (OpenAI, Gemini, Groq) or set your local Ollama URL (`http://localhost:11434`)
4. Upload a CSV and start enriching

---

## Tech Stack

**Frontend (`/src`)**
- React 18 + Vite
- Zustand — column config and API key state
- Tailwind CSS + shadcn/ui — data table and config panels

**Backend API (`/api/bricks-api`)**
- Next.js 15 App Router
- Custom Puppeteer browser pool with memory management and queue system
- Vercel AI SDK Core — structured generation, tool calling, streaming across providers

---

## Contributing

Open issues, pull requests, and forks are welcome. If you hit a site the Puppeteer engine can't handle, or find a case where the email finder breaks, open an issue with the details.

---

*Bricks — your data, your machine, your keys.*
