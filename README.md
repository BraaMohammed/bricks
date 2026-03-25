# Bricks 🧱

> Build your own massive-scale data enrichment and sales engine locally. Never pay an overpriced monthly SaaS subscription again.

![1755904265844](https://github.com/user-attachments/assets/38d5df71-ce7b-4a54-998d-81a80ac0cec8)


Looking to generate pipeline and enrich thousands of leads? Platforms like Clay.com are incredible, but they get brutally expensive when you're scaling—charging hefty base subscriptions plus expensive "API credits" every time you run an enrichment.

**Bricks** gives you the exact same enterprise-grade capabilities—web scraping, AI roleplay agents, browser automation, and data synthesis—running entirely on your own machine. 

Whether you want to hook up your own OpenAI API keys to pay wholesale token prices, or run open-source models locally for **literally $0**, Bricks puts the power back in your hands.

---

## 🔥 Why We Built This (And What It Does)

We wanted a tool that felt like a beautiful, modern spreadsheet but packed the punch of a full engineering team. Here's what's under the hood:

### 🕵️‍♂️ Autonomous Web Research Agents
Imagine giving a spreadsheet column a simple instruction: *"Find this company's most recent funding round and who led it."* 

Under the hood, Bricks spins up an **Autonomous Search Agent**. Powered by the Vercel AI SDK, the agent creates intelligent search queries, hits our custom Next.js `/api/search` and `/api/reader` backend endpoints, reads the parsed markdown of the web pages, and synthesizes the exact answer back into your cell. It's an intern that works 24/7.

### 🤖 Dual-Agent Copywriting System
Most tools just use a basic prompt to generate generic "spray and pray" outreach. Bricks hosts an interactive **AI Roleplay Engine**:
1. **The Creator Agent**: Writes a highly personalized outreach message using your enriched cell data.
2. **The Prospect Agent**: A second AI acts as your target customer, receives the message, and critiques it based on the persona.

They'll iterate, argue, and refine the message instantly in the background until the Prospect Agent "approves" it. The best part? You can use OpenAI to write the email, and a free local Llama model to critique it to optimize your costs.

### 🌐 The Puppeteer Stealth Engine
Need LinkedIn profile data, competitor pricing, or heavily guarded targeted leads? Standard APIs charge a fortune for this. 

Bricks ships with a built-in **Puppeteer Automation Engine**. Complete with stealth plugins, smart queueing, connection pooling, and human-like delays, it scrapes the hardest sites on the web using your local computer's IP address and browser. And yes, it's 100% free. 

### 💡 The Unified Formula Orchestrator
We built a gorgeous, `shadcn/ui` powered interactive data table where every column is deeply programmable. Click a header to open the Formula Editor, which natively supports:
- Raw JavaScript execution (for data cleaning and formatting).
- Direct AI prompts.
- Puppeteer script mapping.
- Firecrawl integrations.
- Autonomous Web Agents.

---

## 💰 The ROI: Bring Your Own AI

SaaS platforms put massive markups on AI credits. With Bricks, you just plug in your own keys or run locally:
- **Groq Cloud**: For lightning-fast, cheap processing on Llama 3 models.
- **OpenAI / Google Gemini**: Connect your API keys and pay base wholesale prices for industry-leading reasoning.
- **Local Ollama**: Spin up an Ollama instance on your machine, run models like DeepSeek R1 or Qwen locally, and crunch 50,000 spreadsheet rows without spending a single cent. Data privacy guaranteed!

---

## 🚀 Getting Started (Setup Guide)

Bricks is structured as a monorepo. You'll need two terminal windows to run the blazing-fast Vite frontend and the Next.js API backend simultaneously.

**Prerequisites:** Node.js 18+ and `npm`.

### 1. Clone the repo
```bash
git clone https://github.com/BraaMohammed/bricks.git
cd bricks
```

### 2. Start the Frontend (Terminal 1)
```bash
# Install frontend dependencies (React, Vite, Tailwind, Zustand)
npm install

# Start the development server
npm run dev
# The UI will be live at http://localhost:8080
```

### 3. Start the Backend API (Terminal 2)
```bash
# Navigate to the Next.js backend
cd api/bricks-api

# Install backend dependencies (Next.js, Puppeteer Stealth)
npm install

# Set up your environment variables for Autonomous Web Search
# Create a .env file locally and add SERPER_API_KEY=xxx or TAVILY_API_KEY=xxx
# (If no keys are provided, Bricks gracefully falls back to free DuckDuckGo scraping)

# Start the Turbo server
npm run dev
# The API will be live at http://localhost:3000
```

### 4. Configure Your AI
1. Open the UI at `http://localhost:8080`.
2. Click the **Settings gear** to pop open the Global Configuration Panel.
3. Drop in your API keys (OpenAI, Gemini, Groq) or set your local Ollama URL (default: `http://localhost:11434`).
4. Upload a CSV of target companies and start enriching!

---

## 🛠️ The Tech Stack

If you're a developer looking to fork, extend, or contribute, here is how the architecture is laid out:

- **Frontend (`/src`)**: 
  - **Framework**: React 18 + Vite for an unbelievably snappy DX.
  - **State**: `Zustand` handles complex column configurations and global API key persistence.
  - **UI**: Pure Tailwind CSS meshed with custom `shadcn/ui` components for the interactive data table and configuration sheets.
- **Backend API (`/api/bricks-api`)**:
  - **Framework**: Next.js 15 app router API endpoints.
  - **Browser Pool**: A custom-built Puppeteer queue with memory management to prevent memory leaks when scraping thousands of URLs in sequence.
  - **AI SDK**: Vercel AI SDK Core (`@ai-sdk/openai`, `@ai-sdk/groq`, etc.) handles structured generation, tool calling, and streaming data extraction.

## 🤝 Let's Build This Together
Data enrichment shouldn't be locked behind thousands of dollars in SaaS paywalls. We are building the ultimate open-source alternative. 

If this excites you, star the repository, open a pull request, or drop into the discussions!

---
*Bricks 🧱 — Stop renting your pipeline. Build it.*
