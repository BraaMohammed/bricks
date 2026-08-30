/**
 * providers.config.ts
 *
 * Central configuration for the AI waterfall gateway.
 *
 * ─── Adding a new provider ────────────────────────────────────────────────────
 * 1. Add an entry to WATERFALL_PROVIDERS (lower priority number = tried first)
 * 2. Add the provider ID to ProviderID union type
 * 3. Add per-provider model aliases in MODEL_MAP
 * 4. Add the API key env var to .env.local
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type ProviderID =
  | 'ollama'
  | 'nvidia-nim'
  | 'cloudflare'
  | 'openrouter'
  | 'google-ai-studio'
  | 'groq';

export interface ProviderConfig {
  /** Unique identifier — used in health map, x-provider-used header, MODEL_MAP keys */
  id: ProviderID;
  /** Human-readable name for logs */
  displayName: string;
  /**
   * OpenAI-compatible base URL (without trailing slash).
   * May be a function so it can read env at runtime (e.g. account-ID-based URLs).
   */
  baseURL: string | (() => string);
  /** Name of the env var that holds the API key. Empty string = no key needed. */
  apiKeyEnvVar: string;
  /** Per-request fetch timeout in milliseconds */
  timeoutMs: number;
  /** How long to skip this provider after a 429 rate-limit response */
  cooldownOnRateLimitMs: number;
  /** How long to skip this provider after a 5xx / network error */
  cooldownOnErrorMs: number;
  /** Lower number = tried first */
  priority: number;
}

// ── Provider definitions ──────────────────────────────────────────────────────

export const WATERFALL_PROVIDERS: ProviderConfig[] = [
  {
    id: 'ollama',
    displayName: 'Ollama',
    // Resolved at runtime so OLLAMA_BASE_URL changes are picked up.
    // Returns '' when unset so the provider is skipped entirely (no wasted
    // connection-refused attempt against localhost on every request).
    baseURL: () => {
      const base = process.env.OLLAMA_BASE_URL?.trim();
      if (!base) return '';
      return base.replace(/\/$/, '') + '/v1';
    },
    apiKeyEnvVar: '',          // Ollama doesn't require an API key
    timeoutMs: 30_000,
    cooldownOnRateLimitMs: 30_000,
    cooldownOnErrorMs: 15_000,
    priority: 1,
  },
  {
    id: 'nvidia-nim',
    displayName: 'Nvidia NIM',
    baseURL: 'https://integrate.api.nvidia.com/v1',
    apiKeyEnvVar: 'NVIDIA_NIM_API_KEY',
    timeoutMs: 18_000,           // Fast failover if NIM queue is overloaded
    cooldownOnRateLimitMs: 60_000,
    cooldownOnErrorMs: 20_000,
    priority: 2,
  },
  {
    id: 'cloudflare',
    displayName: 'Cloudflare AI Workers',
    baseURL: () => {
      const accountId = (process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CLOUDFLARE_ACOUNT_ID)?.trim();
      if (!accountId) return '';
      return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`;
    },
    apiKeyEnvVar: 'CLOUDFLARE_TOKEN',
    timeoutMs: 25_000,
    cooldownOnRateLimitMs: 60_000,
    cooldownOnErrorMs: 20_000,
    priority: 3,
  },
  {
    id: 'openrouter',
    displayName: 'OpenRouter',
    baseURL: 'https://openrouter.ai/api/v1',
    apiKeyEnvVar: 'OPENROUTER_API_KEY',
    timeoutMs: 35_000,           // Allow enough time for free-tier queues
    cooldownOnRateLimitMs: 60_000,
    cooldownOnErrorMs: 20_000,
    priority: 4,
  },
  {
    id: 'google-ai-studio',
    displayName: 'Google AI Studio',
    // Google's OpenAI-compatible endpoint
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    apiKeyEnvVar: 'GOOGLE_AI_STUDIO_API_KEY',
    timeoutMs: 30_000,
    cooldownOnRateLimitMs: 60_000,
    cooldownOnErrorMs: 20_000,
    priority: 5,
  },
  {
    id: 'groq',
    displayName: 'Groq',
    baseURL: 'https://api.groq.com/openai/v1',
    apiKeyEnvVar: 'GROQ_API_KEY',
    timeoutMs: 15_000,           // Groq is very fast; short timeout is fine
    cooldownOnRateLimitMs: 65_000, // Groq's rate limit window is ~60s
    cooldownOnErrorMs: 15_000,
    priority: 6,
  },
];

// Sorted by priority once, reused everywhere
export const SORTED_PROVIDERS = [...WATERFALL_PROVIDERS].sort(
  (a, b) => a.priority - b.priority,
);

// ── Model ↔ Provider map ──────────────────────────────────────────────────────
//
// Keys are the canonical model ID that callers use (what they put in "model" field).
// Values map each provider ID to the exact model string that provider expects.
//
// If a provider is not listed for a given model, that provider is skipped for
// that model.
//
// Run `npx tsx scripts/discover-providers.ts` to refresh available models.

export type ModelProviderMap = Partial<Record<ProviderID, string>>;

export const MODEL_MAP: Record<string, ModelProviderMap> = {

  // ═══════════════════════════════════════════════════════════════════════════
  // JUNE 2026 — CURRENT GENERATION
  // IDs re-verified 2026-07-26 against live provider /v1/models endpoints
  // (scripts/discover-providers.ts). Note: deepseek-v4-pro on Nvidia NIM is a
  // very large MoE and can exceed the 30s timeout on cold start — the
  // waterfall falls through to OpenRouter in that case.
  // ═══════════════════════════════════════════════════════════════════════════

  // ── DeepSeek V4 Pro (1.6T MoE, 49B active, 1M ctx) ──────────────────────
  // Released April 2026 / Updated August 2026 build on Nvidia NIM.
  'deepseek-v4-pro': {
    'ollama':     'deepseek-v4-pro',
    'nvidia-nim': 'deepseek-ai/deepseek-v4-pro-0813',
    'openrouter': 'deepseek/deepseek-v4-pro',
  },

  // ── DeepSeek V4 Flash (284B MoE, 13B active, 1M ctx) ────────────────────
  // Fast sibling of V4 Pro. Updated to 0731 build on Nvidia NIM.
  'deepseek-v4-flash': {
    'ollama':     'deepseek-v4-flash',
    'nvidia-nim': 'deepseek-ai/deepseek-v4-flash-0731',
    'openrouter': 'deepseek/deepseek-v4-flash',
  },

  // ── Kimi K2.6 (MoonshotAI, 262K ctx) ────────────────────────────────────
  // Released April 2026. Top model for agent swarm / long-horizon coding.
  // NOTE: NIM lists moonshotai/kimi-k2.6 but 404s on chat (verified 2026-07-26)
  'kimi-k2.6': {
    'openrouter': 'moonshotai/kimi-k2.6',
  },

  // ── GLM-5.1 (Z.ai, agentic tasks) ────────────────────────────────────────
  // Released late May 2026. GLM-5 was deprecated Apr 2026; 5.1 is current.
  // Not hosted on Nvidia NIM (NIM only carries glm-5.2 — see below).
  'glm-5.1': {
    'openrouter': 'z-ai/glm-5.1',
  },

  // ── GLM-5.2 (Z.ai) ───────────────────────────────────────────────────────
  'glm-5.2': {
    'nvidia-nim': 'z-ai/glm-5.2',
    'openrouter': 'z-ai/glm-5.2',
  },

  // ── Qwen 3.7 Plus (latest Qwen, multimodal text+img+video, 1M ctx) ───────
  // Released late May 2026. Most capable Qwen as of June 2026.
  'qwen-3.7-plus': {
    'openrouter': 'qwen/qwen3.7-plus',
  },

  // ── Qwen 3.5 Plus (Alibaba, multimodal, 1M ctx) ──────────────────────────
  // Released April 2026. Great balance for agentic tasks.
  'qwen-3.5-plus': {
    'ollama':     'qwen3.5-plus',
    'openrouter': 'qwen/qwen3.5-plus-20260420',
  },

  // ── Qwen 3.6 35B A3B (open-weight MoE, 3B active) ────────────────────────
  // Released April 2026. Efficient open model with strong tool calling.
  'qwen-3.6-35b': {
    'ollama':     'qwen3.6:35b',
    'openrouter': 'qwen/qwen3.6-35b-a3b',
  },

  // ── Qwen 3.6 27B (dense, multimodal, 262K ctx) ───────────────────────────
  // Released April 2026. Dense architecture, good capability/speed balance.
  'qwen-3.6-27b': {
    'ollama':     'qwen3.6:27b',
    'openrouter': 'qwen/qwen3.6-27b',
  },

  // ── Qwen 3.6 Flash (fast, multimodal, 1M ctx) ────────────────────────────
  // Cost-efficient high-throughput variant of the 3.6 family.
  'qwen-3.6-flash': {
    'openrouter': 'qwen/qwen3.6-flash',
  },

  // ── Gemini 3.5 Flash (Google, GA May 19 2026, 1M ctx) ───────────────────
  // Recommended Google workhorse for agentic / coding tasks as of June 2026.
  'gemini-3.5-flash': {
    'google-ai-studio': 'gemini-3.5-flash',
    'openrouter':       'google/gemini-3.5-flash',
  },

  // ── Gemini 3.1 Flash Lite (Google, GA May 7 2026, 1M ctx) ───────────────
  // Low-cost, high-volume, lightweight agentic tasks.
  'gemini-3.1-flash-lite': {
    'google-ai-studio': 'gemini-3.1-flash-lite',
    'openrouter':       'google/gemini-3.1-flash-lite',
  },

  // ── Gemini 3.1 Pro Preview (Google, frontier reasoning, 1M ctx) ──────────
  // Still preview as of June 2026. Best Google model for complex reasoning.
  'gemini-3.1-pro-preview': {
    'google-ai-studio': 'gemini-3.1-pro-preview',
    'openrouter':       'google/gemini-3.1-pro-preview',
  },

  // ── Nvidia Nemotron 3 Ultra (550B MoE, 55B active, 1M ctx) ──────────────
  // Released June 2026. Frontier reasoning + orchestration from NVIDIA.
  // Free on OpenRouter as of June 2026.
  'nemotron-3-ultra': {
    'nvidia-nim': 'nvidia/nemotron-3-ultra-550b-a55b',
    'openrouter': 'nvidia/nemotron-3-ultra-550b-a55b:free',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // STABLE — still available as of June 2026
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Llama 3.3 70B ────────────────────────────────────────────────────────
  'llama-3.3-70b': {
    'ollama':     'llama3.3:70b',
    'nvidia-nim': 'meta/llama-3.3-70b-instruct',
    'openrouter': 'meta-llama/llama-3.3-70b-instruct',
    'groq':       'llama-3.3-70b-versatile',
    'cloudflare': '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  },

  // ── Llama 3.1 8B (fast, lightweight) ─────────────────────────────────────
  'llama-3.1-8b': {
    'ollama':     'llama3.1:8b',
    'nvidia-nim': 'meta/llama-3.1-8b-instruct',
    'openrouter': 'meta-llama/llama-3.1-8b-instruct',
    'cloudflare': '@cf/meta/llama-3.1-8b-instruct',
    'groq':       'llama-3.1-8b-instant',
  },

  // ── DeepSeek R1 (original reasoning model) ───────────────────────────────
  'deepseek-r1': {
    'ollama':     'deepseek-r1:14b',
    'openrouter': 'deepseek/deepseek-r1',
    'groq':       'deepseek-r1-distill-llama-70b',
  },

  // ── Gemini 2.5 Flash (still live; Gemini 2.0 shut down June 1 2026) ──────
  'gemini-2.5-flash': {
    'google-ai-studio': 'gemini-2.5-flash',
    'openrouter':       'google/gemini-2.5-flash',
  },

  // ── Gemma 3 27B ──────────────────────────────────────────────────────────
  'gemma-3-27b': {
    'ollama':           'gemma3:27b',
    'openrouter':       'google/gemma-3-27b-it',
  },

  // ── Mistral 7B ───────────────────────────────────────────────────────────
  // NOTE: NIM lists mistral-7b-instruct-v0.3 but 404s on chat (verified
  // 2026-07-26); not on OpenRouter at all. Ollama/Cloudflare only.
  'mistral-7b': {
    'ollama':     'mistral:7b',
    'cloudflare': '@cf/mistral/mistral-7b-instruct-v0.2-lora',
  },

  // ── GPT OSS 120B (OpenAI open weights, Groq fast inference) ─────────────
  'gpt-oss-120b': {
    'nvidia-nim': 'openai/gpt-oss-120b',
    'groq':       'openai/gpt-oss-120b',
    'openrouter': 'openai/gpt-oss-120b',
  },

  // ── Groq Compound (Groq-native, fastest on Groq infra) ───────────────────
  'groq-compound': {
    'groq': 'groq/compound',
  },

  'groq-compound-mini': {
    'groq': 'groq/compound-mini',
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Resolves the baseURL for a provider (handles both string and function).
 */
export function resolveBaseURL(provider: ProviderConfig): string {
  return typeof provider.baseURL === 'function'
    ? provider.baseURL()
    : provider.baseURL;
}

/**
 * Returns the API key value for a provider from process.env.
 * Returns empty string if no key is required (Ollama) or if not set.
 */
export function resolveApiKey(provider: ProviderConfig): string {
  if (!provider.apiKeyEnvVar) return ''; // no key required (Ollama local)
  return process.env[provider.apiKeyEnvVar]?.trim() ?? '';
}

/**
 * Checks whether a provider is configured (has a usable base URL + key if needed).
 */
export function isProviderConfigured(provider: ProviderConfig): boolean {
  const baseURL = resolveBaseURL(provider);
  if (!baseURL) return false;

  if (provider.apiKeyEnvVar) {
    const key = resolveApiKey(provider);
    return key.length > 0;
  }

  // Ollama or any key-less provider — just needs a base URL
  return true;
}
