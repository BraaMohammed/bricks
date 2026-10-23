/**
 * waterfall-stream.ts
 *
 * Streaming sibling of the AI waterfall (docs/adr/0003-streaming-sibling-of-waterfall.md).
 *
 * Reuses the same provider configuration and health tracking as `runWaterfall`
 * but speaks OpenAI-format SSE. It streams only OpenAI-compatible providers —
 * Cloudflare is excluded per ADR-0003 — and falls back to the next provider
 * only if the stream fails before the first token. Once a token has been
 * emitted the provider is committed and no further fallback happens.
 *
 * This is a pure function — it has no HTTP layer. The stream route imports and
 * calls runWaterfallStream().
 */

import {
  SORTED_PROVIDERS,
  MODEL_MAP,
  resolveBaseURL,
  resolveApiKey,
  isProviderConfigured,
  type ProviderConfig,
  type ProviderID,
} from './providers.config';
import { health } from './provider-health';
import type { ChatCompletionRequest, WaterfallError } from './waterfall';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StreamWaterfallResult {
  /** OpenAI-format SSE bytes (`data: {...}\n\n`, terminated with `data: [DONE]`). */
  stream: ReadableStream<Uint8Array>;
  providerUsed: ProviderID;
  attemptCount: number;
}

export type StreamWaterfallOutcome = StreamWaterfallResult | WaterfallError;

// ── Helpers ───────────────────────────────────────────────────────────────────

const BETWEEN_PROVIDER_DELAY_MS = 1_500;

/** Cloudflare is excluded from streaming per ADR-0003. */
function isStreamable(provider: ProviderConfig): boolean {
  return provider.id !== 'cloudflare';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveModelAlias(canonicalModel: string, providerId: ProviderID): string {
  const providerMap = MODEL_MAP[canonicalModel];
  if (providerMap && providerId in providerMap) {
    return providerMap[providerId as keyof typeof providerMap] ?? canonicalModel;
  }
  return canonicalModel;
}

function providerHeaders(apiKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
  return headers;
}

/** Classifies one complete SSE event payload. */
function classifyEvent(payload: string): 'done' | 'token' | 'error' | 'other' {
  if (payload === '[DONE]') return 'done';

  let parsed: {
    error?: { message?: unknown };
    choices?: {
      delta?: Record<string, unknown>;
      text?: unknown;
      finish_reason?: unknown;
    }[];
  };
  try {
    parsed = JSON.parse(payload);
  } catch {
    return 'other';
  }

  if (parsed.error) return 'error';

  const choice = parsed.choices?.[0];
  if (!choice) return 'other';

  // Any delta object (role-only, reasoning, content, or tool calls) proves the
  // provider's SSE stream is live. Reasoning-first models emit deltas long
  // before their first visible token, so waiting specifically for `content`
  // needlessly burns the first-token timeout.
  if (choice.delta && typeof choice.delta === 'object') return 'token';
  if (typeof choice.text === 'string' && choice.text.length > 0) return 'token';
  if (choice.finish_reason) return 'token';

  return 'other';
}

interface OpenedStream {
  reader: ReadableStreamDefaultReader<Uint8Array>;
  buffered: Uint8Array[];
  done: boolean;
  sawDone: boolean;
}

type OpenResult =
  | { ok: true; opened: OpenedStream }
  | { ok: false; status?: number; reason: 'http' | 'throw' | 'empty' };

/**
 * Opens a provider's streaming endpoint and reads until the first real token
 * (content, tool-call delta, or a finish reason) or until the stream ends.
 * A failure before the first token is safe to fall back from; after that it is not.
 */
async function openProviderStream(
  provider: ProviderConfig,
  request: ChatCompletionRequest,
  canonicalModel: string,
): Promise<OpenResult> {
  const startedAt = Date.now();
  const elapsed = (): string => `${Date.now() - startedAt}ms`;
  const model = resolveModelAlias(canonicalModel, provider.id);
  const baseURL = resolveBaseURL(provider);
  const apiKey = resolveApiKey(provider);
  const url = `${baseURL}/chat/completions`;

  // Abort only if no token arrives within the provider's timeout. Once the
  // first token lands the timer is cleared so long generations can continue.
  const controller = new AbortController();
  const firstTokenTimer = setTimeout(() => controller.abort(), provider.timeoutMs);

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: providerHeaders(apiKey),
      body: JSON.stringify({ ...request, model, stream: true }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(firstTokenTimer);
    console.warn(
      `  ⚠️  [waterfall-stream] ${provider.displayName} threw before first token (${elapsed()}): ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return { ok: false, reason: 'throw' };
  }

  if (!res.ok || !res.body) {
    clearTimeout(firstTokenTimer);
    // Read only a short error snippet, and never let a slow/trickling error
    // body stall the failover — an error response means fail over NOW.
    const snippet = await Promise.race([
      res.text().then((t) => t.slice(0, 200)).catch(() => ''),
      sleep(3_000).then(() => '<error body read timed out>'),
    ]);
    await res.body?.cancel().catch(() => {});
    console.warn(
      `  ⚠️  [waterfall-stream] ${provider.displayName} returned HTTP ${res.status} (${elapsed()}): ${snippet}`,
    );
    return { ok: false, status: res.status, reason: 'http' };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const buffered: Uint8Array[] = [];
  let sseBuffer = '';
  let receivedText = '';
  let tokenSeen = false;
  let sawDone = false;
  let streamError: string | null = null;
  let done = false;

  try {
    while (!tokenSeen && !streamError) {
      const { done: streamDone, value } = await reader.read();
      if (streamDone) {
        done = true;
        break;
      }
      if (!value) continue;

      buffered.push(value);
      const decoded = decoder.decode(value, { stream: true });
      receivedText = (receivedText + decoded).slice(0, 400);
      sseBuffer = (sseBuffer + decoded).replace(/\r\n/g, '\n');

      let sep: number;
      while ((sep = sseBuffer.indexOf('\n\n')) !== -1) {
        const event = sseBuffer.slice(0, sep);
        sseBuffer = sseBuffer.slice(sep + 2);

        for (const line of event.split('\n')) {
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          const kind = classifyEvent(payload);
          if (kind === 'done') sawDone = true;
          else if (kind === 'token') tokenSeen = true;
          else if (kind === 'error') streamError = payload.slice(0, 300);
        }
      }
    }
  } catch (err) {
    clearTimeout(firstTokenTimer);
    if (!tokenSeen) {
      console.warn(
        `  ⚠️  [waterfall-stream] ${provider.displayName} stream failed before first token (${elapsed()}): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return { ok: false, reason: 'throw' };
    }
    // Already emitted at least one token — no fallback. Resume the pump, which
    // will surface the failure mid-stream.
    return { ok: true, opened: { reader, buffered, done: false, sawDone } };
  }

  clearTimeout(firstTokenTimer);

  if (streamError && !tokenSeen) {
    console.warn(
      `  ⚠️  [waterfall-stream] ${provider.displayName} sent an error event before the first token (${elapsed()}): ${streamError}`,
    );
    return { ok: false, reason: 'throw' };
  }

  if (!tokenSeen && done) {
    console.warn(
      `  ⚠️  [waterfall-stream] ${provider.displayName} stream ended before any token (${elapsed()}, sawDone=${sawDone}): ${receivedText.slice(0, 200) || '<no bytes received>'}`,
    );
    return { ok: false, reason: 'empty' };
  }

  return { ok: true, opened: { reader, buffered, done, sawDone } };
}

/**
 * Wraps the already-opened provider stream in a ReadableStream, replaying the
 * pre-read bytes, forwarding the rest verbatim (tool-call deltas included), and
 * guaranteeing a terminating `data: [DONE]`.
 */
function buildSseStream(opened: OpenedStream): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const { reader, buffered, done, sawDone: initialSawDone } = opened;
  const state = { sawDone: initialSawDone };
  let sseBuffer = '';
  let cancelled = false;

  const scanForDone = (bytes: Uint8Array): void => {
    sseBuffer = (sseBuffer + new TextDecoder().decode(bytes)).replace(/\r\n/g, '\n');
    let sep: number;
    while ((sep = sseBuffer.indexOf('\n\n')) !== -1) {
      const event = sseBuffer.slice(0, sep);
      sseBuffer = sseBuffer.slice(sep + 2);
      for (const line of event.split('\n')) {
        if (line.startsWith('data:') && line.slice(5).trim() === '[DONE]') {
          state.sawDone = true;
        }
      }
    }
  };

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const enqueue = (chunk: Uint8Array): boolean => {
        if (cancelled || closed) return false;
        try {
          controller.enqueue(chunk);
          return true;
        } catch {
          closed = true;
          return false;
        }
      };

      try {
        for (const chunk of buffered) {
          if (!enqueue(chunk)) return;
        }

        if (!done) {
          while (!cancelled && !closed) {
            const { done: streamDone, value } = await reader.read();
            if (streamDone) break;
            if (!value) continue;
            scanForDone(value);
            if (!enqueue(value)) return;
          }
        }

        if (!state.sawDone) {
          enqueue(encoder.encode('data: [DONE]\n\n'));
        }
        if (!closed) {
          try {
            controller.close();
          } catch {
            /* already closed by the consumer */
          }
        }
      } catch (err) {
        // The consumer may have cancelled the stream (e.g. a sub-agent that
        // already has what it needs); that is not an error.
        if (cancelled || closed) return;

        // Tokens have already been emitted; we cannot fall back. Surface the
        // failure as an SSE error event and close cleanly.
        const message = err instanceof Error ? err.message : String(err);
        console.error(`  ❌ [waterfall-stream] stream failed mid-flight: ${message}`);
        enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: { message, type: 'stream_error' } })}\n\n`),
        );
        if (!state.sawDone) {
          enqueue(encoder.encode('data: [DONE]\n\n'));
        }
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
    async cancel(reason) {
      cancelled = true;
      await reader.cancel(reason).catch(() => {});
    },
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

/**
 * Streams a chat completion, trying OpenAI-compatible providers in priority
 * order. Falls back to the next provider only when the stream fails before the
 * first token; once a token has been emitted the provider is committed.
 */
export async function runWaterfallStream(
  request: ChatCompletionRequest,
): Promise<StreamWaterfallOutcome> {
  const canonicalModel = request.model;
  const providersTried: string[] = [];
  let attemptCount = 0;

  const modelProviderMap = MODEL_MAP[canonicalModel] ?? {};
  const modelHasMap = Object.keys(modelProviderMap).length > 0;

  let providerList = SORTED_PROVIDERS.filter((p) => {
    if (!isStreamable(p)) return false;
    if (!isProviderConfigured(p)) return false;
    if (modelHasMap && !(p.id in modelProviderMap)) return false;
    return true;
  });

  if (providerList.length === 0) {
    if (!modelHasMap) {
      const allConfigured = SORTED_PROVIDERS.filter(
        (p) => isStreamable(p) && isProviderConfigured(p),
      );
      if (allConfigured.length === 0) {
        return {
          error: {
            message:
              'No streaming-capable AI providers are configured. Set at least one provider API key in the environment.',
            type: 'no_providers_configured',
            providers_tried: [],
          },
        };
      }
      providerList = allConfigured;
    } else {
      return {
        error: {
          message: `Model "${canonicalModel}" is not available on any streaming-capable configured provider. Check providers.config.ts MODEL_MAP.`,
          type: 'model_not_found',
          providers_tried: [],
        },
      };
    }
  }

  const hasAvailableProvider = providerList.some((p) => health.isAvailable(p.id));

  for (const provider of providerList) {
    if (!health.isAvailable(provider.id) && hasAvailableProvider) {
      console.log(`  ↳ [waterfall-stream] ${provider.displayName} cooling down — skipping`);
      continue;
    }

    attemptCount++;
    providersTried.push(provider.id);

    console.log(
      `  ↳ [waterfall-stream] [${attemptCount}] Trying ${provider.displayName}...`,
    );

    const result = await openProviderStream(provider, request, canonicalModel);

    if (result.ok) {
      health.reset(provider.id);
      console.log(`  ✅ [waterfall-stream] ${provider.displayName} streaming`);
      return {
        stream: buildSseStream(result.opened),
        providerUsed: provider.id,
        attemptCount,
      };
    }

    if (result.reason === 'http') {
      if (result.status === 429) {
        health.markRateLimited(provider.id, provider.cooldownOnRateLimitMs);
      } else if (result.status && result.status >= 400 && result.status < 500) {
        health.markError(provider.id, 10_000);
      } else {
        health.markError(provider.id, provider.cooldownOnErrorMs);
      }
    } else {
      health.markError(provider.id, provider.cooldownOnErrorMs);
    }

    if (attemptCount < providerList.length) {
      await sleep(BETWEEN_PROVIDER_DELAY_MS);
    }
  }

  console.error(
    `  ❌ [waterfall-stream] All providers failed. Tried: ${providersTried.join(', ')}`,
  );

  if (providersTried.length === 0 && providerList.length > 0) {
    return {
      error: {
        message: `All configured streaming providers for model "${canonicalModel}" are temporarily unavailable (recently rate-limited or errored). Try again shortly.`,
        type: 'all_providers_failed',
        providers_tried: [],
      },
    };
  }

  return {
    error: {
      message: `All streaming AI providers failed for model "${canonicalModel}". Providers tried: ${providersTried.join(', ')}.`,
      type: 'all_providers_failed',
      providers_tried: providersTried,
    },
  };
}

// ── Type guard ────────────────────────────────────────────────────────────────

export function isStreamWaterfallError(
  outcome: StreamWaterfallOutcome,
): outcome is WaterfallError {
  return 'error' in outcome;
}
