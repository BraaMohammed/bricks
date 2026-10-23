/**
 * llm.ts
 *
 * LLM access for the AI Deep Researcher.
 *
 * Non-streaming calls go through the in-process AI waterfall
 * (app/api/ai/waterfall.ts). Streaming calls go through the backend's own
 * OpenAI-compatible streaming route, so provider fail-over and health tracking
 * stay in one place (docs/adr/0003-streaming-sibling-of-waterfall.md).
 */

import { runWaterfall, isWaterfallError } from '../../app/api/ai/waterfall';
import {
  getDeepResearchModel,
  getDeepResearchModelCandidates,
  getSelfBaseUrl,
} from './env';

// ── Streaming client (self-hosted OpenAI-format SSE route) ───────────────────
//
// The installed @ai-sdk/openai-compatible package implements provider
// specification v4, while the installed `ai` package consumes v2/v3. Rather
// than pin a second SDK generation, we speak the verified OpenAI-compatible
// SSE protocol of POST /api/ai/v1/chat/completions/stream directly. This keeps
// provider fail-over in the waterfall and gives the run exact control over
// token deltas and tool-call assembly.

export interface OpenAiToolFunction {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface OpenAiToolDefinition {
  type: 'function';
  function: OpenAiToolFunction;
}

export interface OpenAiToolCall {
  id: string;
  name: string;
  arguments: string;
}

export type OpenAiMessage =
  | { role: 'system' | 'user'; content: string }
  | {
      role: 'assistant';
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: 'function';
        function: { name: string; arguments: string };
      }>;
    }
  | { role: 'tool'; content: string; tool_call_id: string };

export interface StreamChatOptions {
  messages: OpenAiMessage[];
  tools?: OpenAiToolDefinition[];
  onTextDelta?: (text: string) => void;
  abortSignal?: AbortSignal;
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export interface StreamChatResult {
  text: string;
  toolCalls: OpenAiToolCall[];
  finishReason?: string;
}

interface RawToolCallDelta {
  index?: number;
  id?: string;
  function?: { name?: string; arguments?: string };
}

/**
 * Opens POST /api/ai/v1/chat/completions/stream and consumes its OpenAI-format
 * SSE. Emits content deltas through `onTextDelta` and returns assembled tool
 * calls. Throws on a non-2xx response or an SSE error event.
 */
export async function streamChat(
  options: StreamChatOptions,
): Promise<StreamChatResult> {
  const baseUrl = getSelfBaseUrl();
  const body = {
    model: options.model ?? getDeepResearchModel(),
    messages: options.messages,
    ...(options.tools?.length ? { tools: options.tools } : {}),
    temperature: options.temperature ?? 0.2,
    max_tokens: options.maxTokens ?? 3_000,
    stream: true,
  };

  const res = await fetch(`${baseUrl}/api/ai/v1/chat/completions/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(body),
    signal: options.abortSignal,
  });

  if (!res.ok || !res.body) {
    const snippet = await res.text().catch(() => '');
    throw new Error(
      `stream route returned HTTP ${res.status}: ${snippet.slice(0, 300)}`,
    );
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  let text = '';
  let finishReason: string | undefined;
  let buffer = '';
  let sawDone = false;

  const toolCalls = new Map<
    number,
    { id: string; name: string; arguments: string }
  >();

  const consumeEvent = (event: string): void => {
    for (const line of event.split('\n')) {
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload) continue;
      if (payload === '[DONE]') {
        sawDone = true;
        return;
      }

      let parsed: {
        error?: { message?: unknown };
        choices?: Array<{
          delta?: {
            content?: string | null;
            tool_calls?: RawToolCallDelta[];
          };
          finish_reason?: string | null;
        }>;
      };
      try {
        parsed = JSON.parse(payload);
      } catch {
        continue;
      }

      if (parsed.error) {
        throw new Error(
          typeof parsed.error.message === 'string'
            ? parsed.error.message
            : JSON.stringify(parsed.error),
        );
      }

      const choice = parsed.choices?.[0];
      if (!choice) continue;

      const delta = choice.delta;
      if (delta && typeof delta.content === 'string' && delta.content) {
        text += delta.content;
        options.onTextDelta?.(delta.content);
      }

      if (Array.isArray(delta?.tool_calls)) {
        for (const [position, call] of delta.tool_calls.entries()) {
          const index =
            typeof call.index === 'number' ? call.index : position;
          const existing =
            toolCalls.get(index) ??
            { id: '', name: '', arguments: '' };

          if (call.id) existing.id = call.id;
          if (call.function?.name) existing.name = call.function.name;
          if (typeof call.function?.arguments === 'string') {
            existing.arguments += call.function.arguments;
          }

          toolCalls.set(index, existing);
        }
      }

      if (choice.finish_reason) {
        finishReason = choice.finish_reason;
      }
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      buffer = (buffer + decoder.decode(value, { stream: true })).replace(
        /\r\n/g,
        '\n',
      );

      let separator: number;
      while ((separator = buffer.indexOf('\n\n')) !== -1) {
        const event = buffer.slice(0, separator);
        buffer = buffer.slice(separator + 2);
        consumeEvent(event);
        if (sawDone) break;
      }

      if (sawDone) break;
    }
  } finally {
    await reader.cancel().catch(() => {});
  }

  if (!sawDone && buffer.trim()) {
    consumeEvent(buffer);
  }

  return {
    text,
    finishReason,
    toolCalls: [...toolCalls.values()]
      .filter((call) => call.name)
      .map((call, index) => ({
        id: call.id || `call_${Date.now()}_${index}`,
        name: call.name,
        arguments: call.arguments || '{}',
      })),
  };
}

export interface StreamCompletionOptions {
  system: string;
  prompt: string;
  onTextDelta?: (text: string) => void;
  abortSignal?: AbortSignal;
  maxOutputTokens?: number;
  temperature?: number;
}

/**
 * Streams a plain-text completion through the backend stream route and returns
 * the accumulated text. Used for the Orchestrator's visible reasoning so the
 * frontend receives real `orchestrator_token_delta` events.
 */
export async function streamCompletion(
  options: StreamCompletionOptions,
): Promise<string> {
  const result = await streamChat({
    messages: [
      { role: 'system', content: options.system },
      { role: 'user', content: options.prompt },
    ],
    onTextDelta: options.onTextDelta,
    abortSignal: options.abortSignal,
    maxTokens: options.maxOutputTokens ?? 900,
    temperature: options.temperature ?? 0.2,
  });
  return result.text;
}

// ── JSON helpers ──────────────────────────────────────────────────────────────

/**
 * Extracts the first balanced JSON object/array from a model response.
 * Handles markdown fences, leading prose and trailing commentary.
 */
export function extractJsonValue(text: string): unknown {
  if (!text) return undefined;

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.search(/[{[]/);
  if (start === -1) return undefined;

  const open = candidate[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < candidate.length; i++) {
    const ch = candidate[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
    } else if (ch === open) {
      depth++;
    } else if (ch === close) {
      depth--;
      if (depth === 0) {
        const slice = candidate.slice(start, i + 1);
        try {
          return JSON.parse(slice);
        } catch {
          return undefined;
        }
      }
    }
  }

  return undefined;
}

export interface WaterfallJsonOptions {
  system: string;
  prompt: string;
  models?: string[];
  temperature?: number;
  maxTokens?: number;
}

/**
 * Non-streaming JSON completion through the waterfall. Tries the configured
 * model plus fallbacks; returns `null` when every attempt fails.
 */
export async function waterfallJson(
  options: WaterfallJsonOptions,
): Promise<unknown | null> {
  const models = options.models ?? getDeepResearchModelCandidates();

  for (const model of models) {
    const result = await runWaterfall({
      model,
      messages: [
        { role: 'system', content: options.system },
        { role: 'user', content: options.prompt },
      ],
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 2_000,
    });

    if (isWaterfallError(result)) {
      console.warn(
        `  ⚠️ [deep-research] ${model} failed: ${result.error.message}`,
      );
      continue;
    }

    const text = result.response.choices?.[0]?.message?.content ?? '';
    const parsed = extractJsonValue(text);
    if (parsed !== undefined) return parsed;
  }

  return null;
}
