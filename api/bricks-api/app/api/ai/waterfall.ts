/**
 * waterfall.ts
 *
 * Core waterfall logic for the AI gateway.
 *
 * Given a standard OpenAI ChatCompletion request, tries each configured
 * provider in priority order until one responds successfully.
 *
 * This is a pure function — it has no HTTP layer.
 * The HTTP routes import and call runWaterfall().
 */

import {
  SORTED_PROVIDERS,
  MODEL_MAP,
  resolveBaseURL,
  resolveApiKey,
  isProviderConfigured,
  type ProviderID,
} from './providers.config';
import { health } from './provider-health';

// ── OpenAI-compatible types ───────────────────────────────────────────────────

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  tool_calls?: unknown[];
  tool_call_id?: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  max_completion_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  n?: number;
  stream?: boolean;
  tools?: unknown[];
  tool_choice?: unknown;
  response_format?: unknown;
  seed?: number;
  user?: string;
  [key: string]: unknown; // pass-through for provider-specific extensions
}

export interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: 'assistant';
      content: string | null;
      tool_calls?: unknown[];
    };
    finish_reason: string;
    logprobs: null;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  system_fingerprint?: string;
}

export interface WaterfallResult {
  response: ChatCompletionResponse;
  providerUsed: ProviderID;
  attemptCount: number;
}

export interface WaterfallError {
  error: {
    message: string;
    type: 'all_providers_failed' | 'no_providers_configured' | 'model_not_found';
    providers_tried: string[];
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const BETWEEN_PROVIDER_DELAY_MS = 1_500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Resolves the model name alias for a given provider.
 * Falls back to the canonical model name if no alias is defined.
 */
function resolveModelAlias(canonicalModel: string, providerId: ProviderID): string {
  const providerMap = MODEL_MAP[canonicalModel];
  if (providerMap && providerId in providerMap) {
    return providerMap[providerId as keyof typeof providerMap] ?? canonicalModel;
  }
  // Unknown model — pass through as-is; provider will 404 if it doesn't know it
  return canonicalModel;
}

/**
 * Calls a single provider's /chat/completions endpoint.
 * Throws on network error, timeout, or non-2xx HTTP status.
 * Returns the raw parsed JSON on success.
 */
async function callProvider(
  baseURL: string,
  apiKey: string,
  body: ChatCompletionRequest,
  timeoutMs: number,
  displayName: string,
): Promise<{ status: number; data: unknown }> {
  const url = `${baseURL}/chat/completions`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  // Strip stream=true — we only support non-streaming
  const requestBody = { ...body, stream: false };

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(timeoutMs),
  });

  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `${displayName} returned non-JSON (HTTP ${res.status}): ${text.slice(0, 200)}`,
    );
  }

  return { status: res.status, data };
}

// ── Main waterfall ────────────────────────────────────────────────────────────

/**
 * Runs the waterfall: tries providers in priority order until one succeeds.
 *
 * Returns either a WaterfallResult (success) or WaterfallError (all failed).
 */
export async function runWaterfall(
  request: ChatCompletionRequest,
): Promise<WaterfallResult | WaterfallError> {
  const canonicalModel = request.model;
  const providersTried: string[] = [];
  let attemptCount = 0;

  // Determine which providers support this model
  const modelProviderMap = MODEL_MAP[canonicalModel] ?? {};
  const modelHasMap = Object.keys(modelProviderMap).length > 0;

  // Filter providers to only those that:
  // 1. Are configured (have API key + base URL)
  // 2. Support this model (if a map entry exists)
  // 3. Are not currently cooling down
  const eligibleProviders = SORTED_PROVIDERS.filter((p) => {
    if (!isProviderConfigured(p)) return false;
    if (modelHasMap && !(p.id in modelProviderMap)) return false;
    return true;
  });

  if (eligibleProviders.length === 0) {
    if (!modelHasMap) {
      // Unknown model — try all configured providers and let them reject it
      const allConfigured = SORTED_PROVIDERS.filter(isProviderConfigured);
      if (allConfigured.length === 0) {
        return {
          error: {
            message: 'No AI providers are configured. Set at least one provider API key in the environment.',
            type: 'no_providers_configured',
            providers_tried: [],
          },
        };
      }
      // Fall through with all configured providers
    } else {
      return {
        error: {
          message: `Model "${canonicalModel}" is not available on any configured provider. Check providers.config.ts MODEL_MAP.`,
          type: 'model_not_found',
          providers_tried: [],
        },
      };
    }
  }

  const providerList = eligibleProviders.length > 0
    ? eligibleProviders
    : SORTED_PROVIDERS.filter(isProviderConfigured);

  for (const provider of providerList) {
    // Skip if this provider went into cooldown between the eligibility check
    // and now (rare but possible under concurrency)
    if (!health.isAvailable(provider.id)) {
      console.log(
        `  ↳ [waterfall] ${provider.displayName} cooling down — skipping`,
      );
      continue;
    }

    const providerModel = resolveModelAlias(canonicalModel, provider.id);
    const baseURL = resolveBaseURL(provider);
    const apiKey = resolveApiKey(provider);

    attemptCount++;
    providersTried.push(provider.id);

    console.log(
      `  ↳ [waterfall] [${attemptCount}] Trying ${provider.displayName} with model "${providerModel}"...`,
    );

    try {
      const { status, data } = await callProvider(
        baseURL,
        apiKey,
        { ...request, model: providerModel },
        provider.timeoutMs,
        provider.displayName,
      );

      // ── Success ─────────────────────────────────────────────────────────
      if (status >= 200 && status < 300) {
        health.reset(provider.id);
        console.log(`  ✅ [waterfall] ${provider.displayName} succeeded`);
        return {
          response: data as ChatCompletionResponse,
          providerUsed: provider.id,
          attemptCount,
        };
      }

      // ── Rate limited (429) ───────────────────────────────────────────────
      if (status === 429) {
        health.markRateLimited(provider.id, provider.cooldownOnRateLimitMs);
        console.warn(
          `  ⚠️  [waterfall] ${provider.displayName} rate-limited (429) — falling through`,
        );
        if (attemptCount < providerList.length) {
          await sleep(BETWEEN_PROVIDER_DELAY_MS);
        }
        continue;
      }

      // ── Client error (4xx, not 429) — provider config issue ─────────────
      if (status >= 400 && status < 500) {
        console.warn(
          `  ⚠️  [waterfall] ${provider.displayName} returned ${status} — skipping (possible auth or model issue)`,
        );
        // Short cooldown for auth errors — don't hammer a misconfigured provider
        health.markError(provider.id, 10_000);
        if (attemptCount < providerList.length) {
          await sleep(BETWEEN_PROVIDER_DELAY_MS);
        }
        continue;
      }

      // ── Server error (5xx) ───────────────────────────────────────────────
      health.markError(provider.id, provider.cooldownOnErrorMs);
      console.warn(
        `  ⚠️  [waterfall] ${provider.displayName} returned ${status} — falling through`,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);

      if (err instanceof Error && err.name === 'TimeoutError') {
        console.warn(
          `  ⚠️  [waterfall] ${provider.displayName} timed out after ${provider.timeoutMs}ms — falling through`,
        );
      } else {
        console.warn(
          `  ⚠️  [waterfall] ${provider.displayName} threw: ${msg} — falling through`,
        );
      }
      health.markError(provider.id, provider.cooldownOnErrorMs);
    }

    if (attemptCount < providerList.length) {
      await sleep(BETWEEN_PROVIDER_DELAY_MS);
    }
  }

  // All providers failed
  console.error(
    `  ❌ [waterfall] All providers failed. Tried: ${providersTried.join(', ')}`,
  );

  // Nothing was actually tried — every eligible provider was in cooldown
  if (providersTried.length === 0 && providerList.length > 0) {
    return {
      error: {
        message: `All configured providers for model "${canonicalModel}" are temporarily unavailable (recently rate-limited or errored). Try again shortly.`,
        type: 'all_providers_failed',
        providers_tried: [],
      },
    };
  }

  return {
    error: {
      message: `All AI providers failed for model "${canonicalModel}". Providers tried: ${providersTried.join(', ')}.`,
      type: 'all_providers_failed',
      providers_tried: providersTried,
    },
  };
}

// ── Type guard ────────────────────────────────────────────────────────────────

export function isWaterfallError(
  result: WaterfallResult | WaterfallError,
): result is WaterfallError {
  return 'error' in result;
}
