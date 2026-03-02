# AI Search Agent — Implementation Plan
**Branch:** `feat/ai-search-agent`  
**Goal:** Add a new "AI Agent" formula mode that lets users write natural language instructions (e.g., `"Find the CEO of {Company}"`) and have an autonomous agent search the web, read pages, and return structured data — inspired by Claygent.

---

## Architecture Overview

```
FormulaEditor → [Agent Mode]
  ↓
AgentModeEditor UI
  - Instruction input  →  "Find CEO of {Company}"
  - Column badges      →  click to insert {ColumnName}
  - Provider selector  →  Gemini / Groq / Ollama / OpenAI
  - Model selector     →  available models for provider
  - Max steps slider   →  1–10
  ↓
formulaGenerator (agent)
  → generates self-contained formula code
  ↓
Formula runs in DataTable cell:
  Vercel AI SDK generateText()
    ↓
  Jina MCP Remote Server (https://mcp.jina.ai/v1)
    Tools: search_web, read_url, parallel_read_url
    ↓
  Agent thinks → calls tools → synthesizes answer
    ↓
  Returns clean text result to cell
```

---

## Stack
| Concern | Choice |
|---|---|
| Agentic loop | Vercel AI SDK `generateText()` with `maxSteps` |
| Web search + scraping | Jina AI MCP (`https://mcp.jina.ai/v1`) |
| Provider routing | `@ai-sdk/openai`, `@ai-sdk/google`, `@ai-sdk/groq`, Ollama compat |
| Key/config storage | `localStorage` (consistent with existing patterns) |
| UI integration | New `agent` FormulaMode alongside `firecrawl`, `ai`, `code`, `ai-agents` |

---

## Progress Tracker

### Phase 1 — Dependencies & Setup
> Install all required packages and verify they work in the browser (Vite) context.

- [x] **1.1** Install `ai` (Vercel AI SDK core) to root `package.json`
- [x] **1.2** Install `@ai-sdk/openai` to root `package.json`
- [x] **1.3** Install `@ai-sdk/google` to root `package.json`
- [x] **1.4** Install `@ai-sdk/groq` to root `package.json`
- [ ] **1.5** Verify no SSR-only imports that break Vite (browser build) — pending after fixes

---

### Phase 2 — Jina API Key Storage
> Extend existing key management so users can optionally enter a Jina API key (free tier works without one).

- [x] **2.1** Add `JINA_KEY` to `STORAGE_KEYS` in `src/lib/constants/aiModels.ts`
- [x] **2.2** Add `getJinaKey` / `setJinaKey` / `clearJinaKey` to `src/lib/storage/aiConfigStorage.ts`
- [x] **2.3** Add `jinaKey` manager to `src/hooks/useAISettings.ts`
- [x] **2.4** Add Jina API key input to `src/components/AIConfiguration/APIKeysSection.tsx`
- [x] **2.5** Wire `jinaKey` props into `AIConfiguration.tsx`

---

### Phase 3 — Jina Tools (REST, not MCP)
> Wrap Jina REST APIs directly as Vercel AI SDK tools. No MCP proxy needed — Jina's public REST endpoints work from the browser.

- [x] **3.1** Create `src/lib/agents/jinaTools.ts` with `buildJinaTools(apiKey?)` factory
  - `search_web` → `https://s.jina.ai/{query}`
  - `read_url` → `https://r.jina.ai/{url}`
  - `parallel_read_url` → parallel fetch of multiple URLs
- [ ] **3.2** ⚠️ Fix TS errors in `jinaTools.ts`:
  - `tool()` execute overload mismatch — return type must be consistent (no union with optional props)
  - This is the current blocker

---

### Phase 4 — Provider Router
> Map the user's selected provider + model to the correct Vercel AI SDK model instance.

- [x] **4.1** Create `src/lib/agents/providerRouter.ts` (initial draft)
- [ ] **4.2** ⚠️ Fix TS errors in `providerRouter.ts`:
  - `LanguageModelV1` → rename to `LanguageModel` (correct export name in installed SDK)
  - `require()` calls for Gemini/Groq → replace with proper top-level ESM imports
  - This is the current blocker

---

### Phase 5 — Agent Executor
> Core function that runs the agentic loop: takes instruction + row data → returns result.

- [x] **5.1** Create `src/lib/agents/executor.ts` (initial draft)
- [ ] **5.2** ⚠️ Fix TS error: `maxSteps` not on `generateText` type in installed SDK version
  - Check correct property name (`maxSteps` vs `experimental_continueSteps`)
- [ ] **5.3** Add graceful fallback if Jina fails
- [ ] **5.4** Add retry wrapper for transient network errors

---

### Phase 6 — ~~Formula Generator~~ → Direct Executor Hook  ⚠️ REVISED
> ~~Generate formula strings~~ — **REMOVED**. Agent mode does NOT use the formula generator pattern.
> Instead, the AgentModeEditor stores config (instruction, provider, model, maxSteps) and the
> DataTable calls `runSearchAgent()` directly per row at execution time.

- [ ] **6.1** Design agent config storage shape: `{ instruction, provider, model, maxSteps }` saved as column metadata
- [ ] **6.2** Decide how DataTable triggers agent execution per row (hook or inline call)
- [ ] **6.3** This phase is a design discussion — **do not code until aligned**

---

### Phase 7 — Formula Mode Plumbing
> Wire the new `agent` mode into the existing FormulaEditor system.

- [ ] **7.1** Add `'agent'` to `FormulaMode` type in `src/hooks/useFormulaMode.ts`
- [ ] **7.2** Add `agent` detection in `detectModeFromFormula()` (check `@provider: agent` comment)
- [ ] **7.3** Add `agent` case in `handleSave()` in `src/components/FormulaEditor.tsx`
- [ ] **7.4** Add agent-specific state variables to `src/components/FormulaEditor.tsx`
  - `agentInstruction: string`
  - `agentProvider: AIProvider`
  - `agentModel: string`
  - `agentMaxSteps: number`

---

### Phase 8 — Agent Mode Editor UI
> Build the UI component for configuring the agent.

- [ ] **8.1** Create `src/components/FormulaEditor/modes/AgentModeEditor.tsx`
  - Instruction textarea with `{column}` badge insertion
  - **Provider selector** (Gemini / Groq / Ollama / OpenAI) 
  - **Model selector** (filtered by chosen provider, reuse existing model lists)
  - Max steps slider (1–10, default 5)
  - Tool preset info badge (`search + read`)
  - "Jina API key required" notice if no key saved
- [ ] **8.2** Add `AgentModeEditor` import + render in `src/components/FormulaEditor.tsx`

---

### Phase 9 — Mode Selector Entry
> Add the agent mode as a selectable tab in the Formula Editor mode picker.

- [ ] **9.1** Add `agent` option to `src/components/FormulaEditor/ModeSelector.tsx`
  - Icon: `Bot` from `lucide-react`
  - Label: `AI Agent`
  - Description: `Autonomous web research agent`

---

### Phase 10 — Integration Testing
> End-to-end manual test across all providers.

- [ ] **10.1** Test with OpenAI: `"Find the CEO of {Company}"` on sample row
- [ ] **10.2** Test with Groq: same instruction
- [ ] **10.3** Test with Gemini: same instruction
- [ ] **10.4** Test with Ollama (tool-call capable model, e.g. `llama3.1`)
- [ ] **10.5** Test without Jina key (free tier rate-limited mode)
- [ ] **10.6** Test with Jina key (higher rate limits)
- [ ] **10.7** Verify formula is saved and re-detected correctly on column reopen
- [ ] **10.8** Verify multi-step: instruction that requires search → read → answer

---

### Phase 11 — Future: Custom Tool Extensibility *(Post v1)*
> Foundation for adding custom API tools (Jira, HubSpot, etc.) alongside Jina tools.

- [ ] **11.1** Design `ToolDefinition` interface in `src/lib/agents/tools/types.ts`
- [ ] **11.2** Create `src/lib/agents/tools/registry.ts` — tool registration system
- [ ] **11.3** Add first custom tool as example (Jira issue search)
- [ ] **11.4** Surface tool enable/disable toggles in `AgentModeEditor` UI

---

## Key Files Summary

| File | Status | Notes |
|------|--------|-------|
| `src/lib/agents/jinaTools.ts` | ⚠️ Created, has TS errors | Jina REST tool definitions |
| `src/lib/agents/providerRouter.ts` | ⚠️ Created, has TS errors | Maps provider+model → AI SDK instance |
| `src/lib/agents/executor.ts` | ⚠️ Created, has TS errors | Core agentic loop |
| ~~`src/lib/agents/formulaGenerator.ts`~~ | ❌ Removed from plan | Wrong approach — agent runs directly |
| `src/components/FormulaEditor/modes/AgentModeEditor.tsx` | 🔲 To Create | UI for agent mode |
| `src/lib/constants/aiModels.ts` | 🔧 To Modify | Add `JINA_KEY` storage key |
| `src/lib/storage/aiConfigStorage.ts` | 🔧 To Modify | Add Jina key CRUD |
| `src/hooks/useAISettings.ts` | 🔧 To Modify | Add Jina key manager |
| `src/components/AIConfiguration/APIKeysSection.tsx` | 🔧 To Modify | Add Jina key input |
| `src/hooks/useFormulaMode.ts` | 🔧 To Modify | Add `agent` mode type |
| `src/components/FormulaEditor.tsx` | 🔧 To Modify | Agent state + save case |
| `src/components/FormulaEditor/ModeSelector.tsx` | 🔧 To Modify | Add agent tab |
| `package.json` (root) | 🔧 To Modify | Add `ai`, `@ai-sdk/*` packages |

---

## Status Legend
| Icon | Meaning |
|------|---------|
| 🔲 | Not started |
| 🔄 | In progress |
| ✅ | Complete |
| ❌ | Blocked |
| ⚠️ | Has issues |
