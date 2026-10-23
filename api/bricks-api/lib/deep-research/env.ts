/**
 * env.ts
 *
 * Runtime configuration for the AI Deep Researcher.
 *
 * Every cap is env-tunable with a safe default. Caps produce partial results
 * plus a completed run; they never fail a run
 * (docs/adr/0001-agent-orchestration-server-side-mastra.md).
 */

function positiveInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.floor(value);
}

function nonNegativeInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return fallback;
  return Math.floor(value);
}

export interface DeepResearchCaps {
  maxSources: number;
  maxToolCallsPerSubAgent: number;
  maxRecords: number;
  maxRespins: number;
  maxWallClockMs: number;
}

export function getDeepResearchCaps(): DeepResearchCaps {
  return {
    maxSources: positiveInt('DEEP_RESEARCH_MAX_SOURCES', 6),
    maxToolCallsPerSubAgent: positiveInt(
      'DEEP_RESEARCH_MAX_TOOL_CALLS_PER_SUB_AGENT',
      8,
    ),
    maxRecords: positiveInt('DEEP_RESEARCH_MAX_RECORDS', 150),
    maxRespins: nonNegativeInt('DEEP_RESEARCH_MAX_RESPINS', 2),
    maxWallClockMs: positiveInt(
      'DEEP_RESEARCH_MAX_WALL_CLOCK_MS',
      900_000,
    ),
  };
}

/** Base URL the backend uses to call its own tool routes over HTTP. */
export function getSelfBaseUrl(): string {
  const raw = process.env.SELF_BASE_URL?.trim() || 'http://127.0.0.1:3000';
  return raw.replace(/\/+$/, '');
}

/**
 * Canonical model ID for the Orchestrator, Coverage Reviewer and Search
 * Sub-Agents. Must exist in app/api/ai/providers.config.ts MODEL_MAP.
 */
export function getDeepResearchModel(): string {
  // Gemini 3.x requires thought signatures when replaying function calls;
  // gemini-3.1-flash-lite accepts tool results without them, so it is the
  // safe default for the tool-using Search Sub-Agents.
  return process.env.DEEP_RESEARCH_MODEL?.trim() || 'gemini-3.1-flash-lite';
}

/**
 * Ordered fallbacks for non-streaming LLM calls. The waterfall already
 * fail-overs between providers; this adds model-level resilience when the
 * preferred model is unavailable on every configured provider.
 */
export function getDeepResearchModelCandidates(): string[] {
  const candidates = [
    getDeepResearchModel(),
    'gemini-3.1-flash-lite',
    'gemini-3.5-flash',
    'qwen-3.6-35b',
    'deepseek-v4-flash',
  ];
  return [...new Set(candidates.filter(Boolean))];
}

export function getDefaultTargetCount(maxRecords: number): number {
  return Math.min(20, maxRecords);
}
