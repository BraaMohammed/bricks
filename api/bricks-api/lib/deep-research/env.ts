/**
 * env.ts
 *
 * Runtime configuration for the AI Deep Researcher.
 *
 * Every cap is env-tunable with a safe default. Caps produce partial results
 * plus a completed run; they never fail a run
 * (docs/adr/0001-agent-orchestration-server-side-mastra.md).
 */

import { AsyncLocalStorage } from 'node:async_hooks';

const runModelStorage = new AsyncLocalStorage<string>();

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

export const DEFAULT_DEEP_RESEARCH_MODEL = 'deepseek-v4.1-flash';

const FREE_DEEP_RESEARCH_MODELS = [
  DEFAULT_DEEP_RESEARCH_MODEL,
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'qwen-3.6-35b',
  'deepseek-v4-flash',
];

/**
 * Runs `fn` with a per-Deep-Research-Run model override. The override is
 * carried through async calls (including the Mastra workflow) so every agent
 * step uses the model the user selected without threading it through each
 * workflow schema.
 */
export function runWithDeepResearchModel<T>(
  model: string | undefined,
  fn: () => T,
): T {
  const trimmed = model?.trim();
  if (!trimmed) return fn();
  return runModelStorage.run(trimmed, fn);
}

/**
 * Canonical model ID for the Orchestrator, Coverage Reviewer and Search
 * Sub-Agents. Models prefixed "opencode-go/" are paid direct OpenCode Go
 * models; free models must exist in app/api/ai/providers.config.ts MODEL_MAP.
 */
export function getDeepResearchModel(override?: string): string {
  const explicit = override?.trim();
  if (explicit) return explicit;

  const scoped = runModelStorage.getStore()?.trim();
  if (scoped) return scoped;

  return (
    process.env.DEEP_RESEARCH_MODEL?.trim() || DEFAULT_DEEP_RESEARCH_MODEL
  );
}

/**
 * Ordered fallbacks for non-streaming LLM calls. The waterfall already
 * fail-overs between providers; this adds model-level resilience when the
 * preferred model is unavailable on every configured provider. OpenCode Go
 * models are paid and never fall back to free models.
 */
export function getDeepResearchModelCandidates(override?: string): string[] {
  const resolved = getDeepResearchModel(override);
  if (resolved.startsWith('opencode-go/')) return [resolved];

  const candidates = [resolved, ...FREE_DEEP_RESEARCH_MODELS];
  return [...new Set(candidates.filter(Boolean))];
}

export function getDefaultTargetCount(maxRecords: number): number {
  return Math.min(20, maxRecords);
}
