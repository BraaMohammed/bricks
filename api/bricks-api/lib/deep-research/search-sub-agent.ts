/**
 * search-sub-agent.ts
 *
 * One Search Sub-Agent per Research Source. Each agent has the `web_search`
 * and `read_page` tools (backed by the existing HTTP routes) plus
 * `save_records`, which captures its Records. The agent streams text and tool
 * calls into the run's SSE transcript.
 *
 * The Orchestrator only sees the compact result returned by this module, never
 * the agent's context (CONTEXT.md).
 */

import {
  streamChat,
  extractJsonValue,
  type OpenAiMessage,
  type OpenAiToolCall,
  type OpenAiToolDefinition,
} from './llm';
import { getSelfBaseUrl } from './env';
import { emitRunEvent } from './event-bus';
import { outputSchemaForPrompt } from './output-schema';
import type { ResearchSourceAssignment } from './sources';
import type { OutputSchema, ResearchRecord } from './types';

export interface SearchSubAgentContext {
  runId: string;
  goal: string;
  outputSchema: OutputSchema;
  assignment: ResearchSourceAssignment;
  /** Maximum distinct Records this agent should try to collect. */
  recordTarget: number;
  maxToolCalls: number;
  round: number;
  reSpinNumber: number;
  coverateFeedback?: string;
  deadline: number;
  abortSignal?: AbortSignal;
  model?: string;
}

export interface SearchSubAgentResult {
  agentId: string;
  sourceName: string;
  records: ResearchRecord[];
  summary: string;
  error?: string;
}

const SEARCH_TIMEOUT_MS = 30_000;
const READ_TIMEOUT_MS = 75_000;
const MAX_PAGE_CHARS = 4_000;
const MAX_TOOL_RESULT_CHARS = 8_000;

function remainingMs(deadline: number): number {
  return Math.max(0, deadline - Date.now());
}

function combinedSignal(
  deadline: number,
  parent?: AbortSignal,
): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(new Error('Deep Research Run wall-clock cap reached')),
    remainingMs(deadline),
  );

  const onAbort = () => controller.abort(parent?.reason);
  if (parent) {
    if (parent.aborted) controller.abort(parent.reason);
    else parent.addEventListener('abort', onAbort, { once: true });
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeout);
      parent?.removeEventListener('abort', onAbort);
    },
  };
}

async function callSelf(
  path: string,
  body: unknown,
  timeoutMs: number,
  signal: AbortSignal,
): Promise<unknown> {
  const baseUrl = getSelfBaseUrl();
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]),
  });

  if (!res.ok) {
    throw new Error(`${path} returned HTTP ${res.status}`);
  }
  return await res.json();
}

interface SearchResponse {
  results?: Array<{ title?: string; url?: string; snippet?: string }>;
  provider?: string;
  error?: string | null;
}

interface ReaderResponse {
  url?: string;
  content?: string;
  title?: string;
  provider?: string;
  error?: string | null;
}

function compactSearchResponse(data: unknown): unknown {
  const parsed = data as SearchResponse;
  return {
    results: (parsed.results ?? []).map((result) => ({
      title: result.title ?? '',
      url: result.url ?? '',
      snippet: (result.snippet ?? '').slice(0, 320),
    })),
    provider: parsed.provider ?? 'unknown',
    error: parsed.error ?? null,
  };
}

function compactReaderResponse(data: unknown): unknown {
  const parsed = data as ReaderResponse;
  if (parsed.error && !parsed.content) {
    throw new Error(parsed.error);
  }
  return {
    url: parsed.url ?? '',
    title: parsed.title ?? '',
    provider: parsed.provider ?? 'unknown',
    content: (parsed.content ?? '').slice(0, MAX_PAGE_CHARS),
  };
}

function extractRecordsFromText(text: string): ResearchRecord[] {
  const parsed = extractJsonValue(text);
  if (!parsed) return [];

  const collect = (value: unknown): ResearchRecord[] => {
    if (Array.isArray(value)) {
      return value.filter(
        (row): row is ResearchRecord =>
          !!row && typeof row === 'object' && !Array.isArray(row),
      );
    }
    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      const raw = record.records ?? record.rows;
      if (Array.isArray(raw)) return collect(raw);
    }
    return [];
  };

  return collect(parsed);
}

function toolDefinitions(outputSchema: OutputSchema): OpenAiToolDefinition[] {
  const recordProperties: Record<string, unknown> = {};
  for (const field of outputSchema.fields) {
    recordProperties[field.name] = {
      type: 'string',
      description: `Value for "${field.name}": ${field.description}`,
    };
  }

  return [
    {
      type: 'function',
      function: {
        name: 'web_search',
        description:
          'Search the public web. Returns ranked results with title, url and snippet.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'The search query.' },
          },
          required: ['query'],
          additionalProperties: false,
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'read_page',
        description:
          'Fetch and read one web page as text. Use it when a search snippet is not enough to fill the Output Schema.',
        parameters: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'The page URL to read.' },
          },
          required: ['url'],
          additionalProperties: false,
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'save_records',
        description: `Submit the final Records found from this Research Source. Call this once, after researching. Every record must contain every Output Schema key: ${outputSchema.fields
          .map((field) => field.name)
          .join(', ')}.`,
        parameters: {
          type: 'object',
          properties: {
            records: {
              type: 'array',
              items: {
                type: 'object',
                properties: recordProperties,
                required: outputSchema.fields.map((field) => field.name),
                additionalProperties: false,
              },
            },
          },
          required: ['records'],
          additionalProperties: false,
        },
      },
    },
  ];
}

function parseToolArguments(
  call: OpenAiToolCall,
): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(call.arguments || '{}');
    return parsed && typeof parsed === 'object'
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/**
 * Runs one Search Sub-Agent and emits its lifecycle events. Never throws:
 * failures are returned so the Coverage Reviewer and Table Builder can still
 * finish the run with partial results.
 */
export async function runSearchSubAgent(
  context: SearchSubAgentContext,
): Promise<SearchSubAgentResult> {
  const { assignment } = context;
  const agentId = assignment.agentId;
  emitRunEvent(context.runId, {
    event: 'search_sub_agent_started',
    agentId,
    sourceName: assignment.sourceName,
  });

  let externalToolCalls = 0;
  let records: ResearchRecord[] = [];
  let text = '';

  const { signal, cleanup } = combinedSignal(
    context.deadline,
    context.abortSignal,
  );

  const system = `You are a Search Sub-Agent for Bricks' AI Deep Researcher.

Research Source: ${assignment.label} (${assignment.sourceName})
Source guidance: ${assignment.instructions}
Query hint: ${assignment.queryHint}

Research goal:
${context.goal}

Output Schema (every Record must have exactly these keys):
${outputSchemaForPrompt(context.outputSchema)}

Collect up to ${context.recordTarget} distinct Records for this goal from this source.
Process:
1. Run focused web_search queries (use the query hint, and vary wording).
2. If snippets are insufficient, read_page the most promising official pages.
3. When you have usable evidence, call save_records once with all complete
   Records.

Hard rules:
- Use only real entities you found in search results or pages. Never invent a
  company, person, URL or value.
- Every Record must include every Output Schema key. Use an empty string for an
  unknown value rather than guessing.
- Prefer official websites and first-party pages over aggregators.
- Do not exceed ${context.maxToolCalls} tool calls.
${context.coverateFeedback ? `\nA previous Coverage Review asked for more: ${context.coverateFeedback}\nFind additional or higher-quality Records, avoiding ones already collected.\n` : ''}

When done, reply with a one-sentence summary of what this source yielded.`;

  const messages: OpenAiMessage[] = [
    { role: 'system', content: system },
    {
      role: 'user',
      content: `Start researching "${context.goal}" via ${assignment.label}. Suggested query direction: ${assignment.queryHint}. Then save the Records.`,
    },
  ];

  const tools = toolDefinitions(context.outputSchema);
  const maxRounds = context.maxToolCalls + 2;

  try {
    for (let round = 0; round < maxRounds; round++) {
      if (remainingMs(context.deadline) < 1_000) {
        throw new Error('Deep Research Run wall-clock cap reached');
      }

      const completion = await streamChat({
        messages,
        tools,
        abortSignal: signal,
        temperature: 0.2,
        maxTokens: 3_000,
        model: context.model,
        onTextDelta: (delta) => {
          text += delta;
          emitRunEvent(context.runId, {
            event: 'search_sub_agent_token_delta',
            agentId,
            text: delta,
          });
        },
      });

      const assistantToolCalls = completion.toolCalls.map((call) => ({
        id: call.id,
        type: 'function' as const,
        function: { name: call.name, arguments: call.arguments },
      }));

      messages.push({
        role: 'assistant',
        content: completion.text || null,
        ...(assistantToolCalls.length
          ? { tool_calls: assistantToolCalls }
          : {}),
      });

      if (completion.toolCalls.length === 0) {
        break;
      }

      let savedThisRound = false;

      for (const call of completion.toolCalls) {
        const parsedInput = parseToolArguments(call);
        emitRunEvent(context.runId, {
          event: 'search_sub_agent_tool_call',
          agentId,
          toolName: call.name,
          toolInput: parsedInput ?? call.arguments,
        });

        if (call.name === 'save_records') {
          const rawRecords = parsedInput?.records;
          if (Array.isArray(rawRecords)) {
            records.push(
              ...rawRecords.filter(
                (row): row is ResearchRecord =>
                  !!row && typeof row === 'object' && !Array.isArray(row),
              ),
            );
          }
          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: `Saved ${records.length} record(s).`,
          });
          savedThisRound = true;
          continue;
        }

        let toolResult: unknown;
        if (call.name === 'web_search') {
          const query =
            typeof parsedInput?.query === 'string' ? parsedInput.query : '';
          if (!query) {
            toolResult = { error: 'Missing query.' };
          } else if (externalToolCalls >= context.maxToolCalls) {
            toolResult = {
              error:
                'Tool-call cap reached for this Search Sub-Agent. Stop calling tools and save what you have.',
            };
          } else {
            externalToolCalls++;
            try {
              toolResult = compactSearchResponse(
                await callSelf(
                  '/api/search',
                  { query },
                  SEARCH_TIMEOUT_MS,
                  signal,
                ),
              );
            } catch (err) {
              toolResult = {
                error: err instanceof Error ? err.message : String(err),
              };
            }
          }
        } else if (call.name === 'read_page') {
          const url = typeof parsedInput?.url === 'string' ? parsedInput.url : '';
          if (!url) {
            toolResult = { error: 'Missing url.' };
          } else if (externalToolCalls >= context.maxToolCalls) {
            toolResult = {
              error:
                'Tool-call cap reached for this Search Sub-Agent. Stop calling tools and save what you have.',
            };
          } else {
            externalToolCalls++;
            try {
              toolResult = compactReaderResponse(
                await callSelf('/api/reader', { url }, READ_TIMEOUT_MS, signal),
              );
            } catch (err) {
              toolResult = {
                error: err instanceof Error ? err.message : String(err),
              };
            }
          }
        } else {
          toolResult = { error: `Unknown tool: ${call.name}` };
        }

        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(toolResult).slice(0, MAX_TOOL_RESULT_CHARS),
        });
      }

      if (savedThisRound) break;
      if (externalToolCalls >= context.maxToolCalls) break;
    }

    if (records.length === 0) {
      records = extractRecordsFromText(text);
    }

    const summary =
      text.trim().slice(0, 400) ||
      `Collected ${records.length} record(s) from ${assignment.label}.`;

    emitRunEvent(context.runId, {
      event: 'search_sub_agent_finished',
      agentId,
      recordsFound: records.length,
      summary,
    });

    return {
      agentId,
      sourceName: assignment.sourceName,
      records,
      summary,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (records.length === 0) {
      records = extractRecordsFromText(text);
    }

    if (records.length === 0) {
      emitRunEvent(context.runId, {
        event: 'search_sub_agent_failed',
        agentId,
        error: message,
      });
      return {
        agentId,
        sourceName: assignment.sourceName,
        records: [],
        summary: '',
        error: message,
      };
    }

    const summary =
      text.trim().slice(0, 400) ||
      `Collected ${records.length} record(s) from ${assignment.label} before stopping early.`;
    emitRunEvent(context.runId, {
      event: 'search_sub_agent_finished',
      agentId,
      recordsFound: records.length,
      summary,
    });
    return {
      agentId,
      sourceName: assignment.sourceName,
      records,
      summary,
      error: message,
    };
  } finally {
    cleanup();
  }
}

