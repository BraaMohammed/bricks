/**
 * Search Provider contract
 *
 * A "Search Provider" is an agentic search service the Orchestrator prompts
 * directly: Exa Agent (POST /agent/runs), Parallel Task API (POST /v1/tasks/runs),
 * Firecrawl Agent (POST /v2/agent). Plain search endpoints from these providers
 * are FORBIDDEN — agentic endpoints only.
 *
 * In provider modes, the Orchestrator LLM (our model) runs a tool-calling loop:
 * each tool call sends an Orchestrator-authored natural-language prompt and an
 * Orchestrator-authored JSON schema to ONE provider run, receives structured
 * records back, judges them against the goal, and iterates the prompt — until
 * the per-run max-searches budget (user-set) or the goal is satisfied.
 *
 * The Table Builder dedup (identity columns) still applies to returned records.
 * No provider fallback: provider errors fail the run explicitly.
 *
 * AUTH (env, api/bricks-api/.env.local):
 *   EXA_API_KEY        (already set — reused from search waterfall)
 *   FIRECRAWL_KEY      (already set — reused; note the name)
 *   PARALLEL_API_KEY   (new — user must add)
 */

export type SearchProviderId = 'exa' | 'firecrawl' | 'parallel';

/** Reasoning level as shown in the UI hover sub-list (price + work time from docs). */
export interface ProviderLevel {
  id: string;
  label: string;
  priceLabel: string;
  timeLabel: string;
}

export interface SearchProviderStatus {
  id: SearchProviderId;
  label: string;
  configured: boolean;
  levels: ProviderLevel[];
}

/**
 * Normalized live events from one provider run. The wiring layer maps these
 * onto the EXISTING transcript events (no new UI paradigms):
 *   status      → search_sub_agent_started / status transcript item
 *   token       → search_sub_agent_token_delta (streaming narration text)
 *   tool_call   → search_sub_agent_tool_call (queries, page reads, tool inputs)
 *   progress    → status text like "12 sources read · 45%"
 */
export type SearchProviderEvent =
  | { kind: 'status'; text: string }
  | { kind: 'token'; text: string }
  | { kind: 'tool_call'; toolName: string; toolInput: unknown }
  | {
      kind: 'progress';
      sourcesRead?: number;
      sourcesConsidered?: number;
      percent?: number;
    };

export interface SearchProviderResult {
  /** Structured records when the call included a schema; else undefined. */
  records?: Record<string, unknown>[];
  /** Final narrative/answer text from the provider, if any. */
  text?: string;
  usage?: { costUsd?: number; credits?: number };
  stopReason?: string;
}

export interface SearchProviderRunParams {
  /** Orchestrator-authored natural-language prompt. NEVER the raw user goal. */
  prompt: string;
  /** Orchestrator-authored JSON Schema for structured output. */
  schema?: Record<string, unknown>;
  /** ProviderLevel.id chosen in the UI. */
  level: string;
  /** Hard wall-clock cap for this single provider call (ms). */
  maxWaitMs: number;
  signal: AbortSignal;
  onEvent: (event: SearchProviderEvent) => void;
}

export interface SearchProviderAdapter {
  readonly id: SearchProviderId;
  readonly label: string;
  levels(): ProviderLevel[];
  isConfigured(): boolean;
  statusPayload(): SearchProviderStatus;
  runSearch(params: SearchProviderRunParams): Promise<SearchProviderResult>;
}

/** Run-start body additions (frontend → POST /api/deep-research/run). */
export interface SearchProviderRunConfig {
  searchProvider: 'bricks' | SearchProviderId;
  /** Max provider calls (Orchestrator tool calls) per run. UI list on composer. */
  maxSearches: number;
  /** Level id for the chosen provider; ignored when searchProvider is 'bricks'. */
  providerLevel?: string;
}

/** Status route the frontend reads once: GET /api/deep-research/providers. */
export type SearchProvidersResponse = SearchProviderStatus[];
