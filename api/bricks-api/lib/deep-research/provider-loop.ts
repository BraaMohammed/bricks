/**
 * provider-loop.ts
 *
 * The Orchestrator's tool-calling loop for Search Provider modes. The
 * Orchestrator LLM (the user-selected research model) runs a standard agentic
 * loop with ONE tool, `agentic_search`: each call sends an Orchestrator-authored
 * natural-language prompt plus an Orchestrator-authored JSON Schema to ONE
 * agentic run of the chosen Search Provider, receives Records back, judges them
 * against the goal, and iterates with refined prompts — until the per-run
 * max-searches budget is exhausted or the Orchestrator decides the goal is met.
 *
 * Every step is surfaced on the EXISTING transcript events
 * (lib/deep-research/types.ts): no new event kinds.
 */

import { getDeepResearchCaps } from './env';
import { emitRunEvent } from './event-bus';
import {
  streamChat,
  type OpenAiMessage,
  type OpenAiToolCall,
} from './llm';
import { dedupeRecords, coerceRecord } from './output-schema';
import { replaceRunRecords } from './repository';
import { getSearchProvider } from './search-providers/registry';
import type { SearchProviderId } from './search-providers/contract';
import type { OutputSchema, ResearchRecord } from './types';

const AGENTIC_SEARCH_TOOL = {
  type: 'function' as const,
  function: {
    name: 'agentic_search',
    description:
      'Run one agentic search with the Search Provider. You author BOTH inputs yourself on every call.',
    parameters: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description:
            'Natural-language research prompt YOU author. Specific and self-contained; on repeat calls refine the angle or scope instead of repeating.',
        },
        schema: {
          type: 'object',
          description:
            'JSON Schema YOU author: a top-level object whose "records" property is an array of objects with exactly the approved table field names as string properties. Hint the record bound through maxItems in the description.',
        },
      },
      required: ['prompt', 'schema'],
    },
  },
};

const MAX_RESULT_ROWS_FOR_PROMPT = 10;
const MIN_TURN_REMAINING_MS = 2_000;

function providerLoopSystemPrompt(
  providerLabel: string,
  goal: string,
  outputSchema: OutputSchema,
): string {
  const fields = outputSchema.fields
    .map((field) => `- "${field.name}": ${field.description}`)
    .join('\n');
  const identity = outputSchema.identityColumns.length
    ? outputSchema.identityColumns.join(', ')
    : '(none designated)';

  return `You are the Orchestrator of Bricks' AI Deep Researcher, running one Deep Research Run through the Search Provider "${providerLabel}".
You research with exactly one tool, agentic_search: every call is one agentic run of that provider, and you author its inputs yourself.

Research goal:
${goal}

Approved table fields for the Records you collect:
${fields}
Identity Columns (what makes two Records the same): ${identity}

Rules:
- agentic_search takes {"prompt": string, "schema": object}.
- Author a fresh natural-language research prompt every call. When you call it
  again, refine the prompt — a different angle, segment or stricter scope —
  instead of repeating the same ask.
- Author a fresh JSON Schema every call: a top-level object with a required
  "records" array whose items are objects whose string properties are exactly
  the field names above. Bound the number of Records with maxItems in the
  description.
- Judge each result against the goal before your next step.
- When the goal is satisfied, or you judge the quality sufficient, write a
  short plain-text wrap-up and stop calling the tool.
- No markdown headings.`;
}

interface ToolResultPayload {
  recordsFound: number;
  records: Record<string, string>[];
  stopReason?: string;
  usage?: { costUsd?: number; credits?: number };
  note?: string;
}

function parseToolCall(call: OpenAiToolCall): {
  prompt: string;
  schema: Record<string, unknown>;
} | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(call.arguments);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const record = parsed as Record<string, unknown>;

  const prompt = typeof record.prompt === 'string' ? record.prompt.trim() : '';
  const schema = record.schema;
  if (!prompt || !schema || typeof schema !== 'object' || Array.isArray(schema)) {
    return null;
  }
  return { prompt, schema: schema as Record<string, unknown> };
}

function formatStatusText(
  event:
    | { kind: 'status'; text: string }
    | {
        kind: 'progress';
        sourcesRead?: number;
        sourcesConsidered?: number;
        percent?: number;
      },
): string | null {
  // Leading newline keeps consecutive status lines visually separate in the
  // transcript (token deltas for one agent are concatenated client-side).
  if (event.kind === 'status') {
    const text = event.text.trim();
    return text ? `\n· ${text}` : null;
  }

  const read = event.sourcesRead ?? event.sourcesConsidered;
  if (read !== undefined && event.percent !== undefined) {
    return `\n· reading sources (${read} read · ${Math.round(event.percent)}%)`;
  }
  if (read !== undefined) {
    return `\n· reading sources (${read} read)`;
  }
  if (event.percent !== undefined) {
    return `\n· reading sources (${Math.round(event.percent)}%)`;
  }
  return null;
}

export interface ProviderLoopInput {
  runId: string;
  goal: string;
  outputSchema: OutputSchema;
  providerId: SearchProviderId;
  providerLevel: string;
  maxSearches: number;
  targetCount: number;
  model?: string;
  signal?: AbortSignal;
}

export interface ProviderLoopResult {
  totalRecords: number;
  searchCalls: number;
}

/**
 * Runs the agentic loop to completion. Does not throw past its own failures
 * except when the Orchestrator LLM itself fails: Search Provider call errors
 * are fed back as tool results so the Orchestrator may retry within the
 * budget. Persists the deduplicated table and returns its size; the caller
 * emits `deep_research_completed` / `deep_research_failed`.
 */
export async function runProviderLoop(
  input: ProviderLoopInput,
): Promise<ProviderLoopResult> {
  const adapter = getSearchProvider(input.providerId);
  const caps = getDeepResearchCaps();
  const deadline = Date.now() + caps.maxWallClockMs;
  const levelLabel =
    adapter.levels().find((level) => level.id === input.providerLevel)?.label ??
    input.providerLevel;

  const messages: OpenAiMessage[] = [
    {
      role: 'system',
      content: providerLoopSystemPrompt(
        adapter.label,
        input.goal,
        input.outputSchema,
      ),
    },
    {
      role: 'user',
      content: `Start the research. Call agentic_search with your first authored prompt and schema.`,
    },
  ];

  const collected: unknown[] = [];
  let searchCalls = 0;
  let invalidCallStreak = 0;
  let budgetExhaustedTurns = 0;

  while (Date.now() < deadline) {
    let turn;
    try {
      turn = await streamChat({
        messages,
        // The tool stays declared even past the budget: exhausting it through
        // the tool-result protocol keeps DeepSeek-family models from writing
        // DSML tool syntax into visible content.
        tools: [AGENTIC_SEARCH_TOOL],
        onTextDelta: (text) =>
          emitRunEvent(input.runId, {
            event: 'orchestrator_token_delta',
            text,
          }),
        abortSignal: input.signal,
        maxTokens: 1_200,
        temperature: 0.3,
        model: input.model,
      });
    } catch (err) {
      throw new Error(
        `Orchestrator turn failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const calls = turn.toolCalls.filter(
      (call) => call.name === AGENTIC_SEARCH_TOOL.function.name,
    );

    if (calls.length === 0) {
      // The Orchestrator produced a final message; the run is done.
      break;
    }

    const budgetExhaustedTurn = searchCalls >= input.maxSearches;
    if (budgetExhaustedTurn) {
      budgetExhaustedTurns += 1;
      if (budgetExhaustedTurns >= 3) break;
    } else {
      budgetExhaustedTurns = 0;
    }

    const allInvalid =
      calls.every((call) => parseToolCall(call) === null) &&
      calls.length > 0;
    if (allInvalid) {
      invalidCallStreak += 1;
      if (invalidCallStreak >= 3) break;
    } else {
      invalidCallStreak = 0;
    }

    messages.push({
      role: 'assistant',
      content: turn.text || null,
      tool_calls: calls.map((call) => ({
        id: call.id,
        type: 'function' as const,
        function: { name: call.name, arguments: call.arguments },
      })),
    });

    for (const call of calls) {
      if (searchCalls >= input.maxSearches || Date.now() >= deadline) {
        messages.push({
          role: 'tool',
          content: JSON.stringify({
            recordsFound: 0,
            records: [],
            note: 'The search budget for this run is exhausted. Wrap up.',
          }),
          tool_call_id: call.id,
        });
        continue;
      }

      const parsedCall = parseToolCall(call);
      if (!parsedCall) {
        messages.push({
          role: 'tool',
          content: JSON.stringify({
            recordsFound: 0,
            records: [],
            note:
              'Invalid tool input: prompt must be a non-empty string and schema must be an object. Call agentic_search again with valid inputs.',
          }),
          tool_call_id: call.id,
        });
        continue;
      }

      searchCalls += 1;
      const agentId = `${input.providerId}-${searchCalls}`;
      const toolResult = await runOneProviderSearch({
        runId: input.runId,
        adapter,
        agentId,
        sourceName: `${adapter.label} · ${levelLabel}`,
        prompt: parsedCall.prompt,
        schema: parsedCall.schema,
        level: input.providerLevel,
        deadline,
        caps,
        signal: input.signal,
        outputSchema: input.outputSchema,
        onRecord: (record) => collected.push(record),
      });

      messages.push({
        role: 'tool',
        content: JSON.stringify(toolResult),
        tool_call_id: call.id,
      });
    }
  }

  const deduped = dedupeRecords(collected, input.outputSchema);
  const records = deduped.slice(
    0,
    Math.max(1, Math.floor(input.targetCount)),
  );

  await replaceRunRecords(input.runId, records);

  return { totalRecords: records.length, searchCalls };
}

interface OneProviderSearchInput {
  runId: string;
  outputSchema: OutputSchema;
  adapter: ReturnType<typeof getSearchProvider>;
  agentId: string;
  sourceName: string;
  prompt: string;
  schema: Record<string, unknown>;
  level: string;
  deadline: number;
  caps: ReturnType<typeof getDeepResearchCaps>;
  signal?: AbortSignal;
  onRecord: (record: unknown) => void;
}

/**
 * Emits one Search Sub-Agent's transcript events, runs the adapter once,
 * emits `search_sub_agent_finished` / `search_sub_agent_failed` and
 * `table_records_ready`, and returns the tool-result payload for the
 * Orchestrator.
 */
async function runOneProviderSearch(
  input: OneProviderSearchInput,
): Promise<ToolResultPayload> {
  emitRunEvent(input.runId, {
    event: 'search_sub_agent_started',
    agentId: input.agentId,
    sourceName: input.sourceName,
  });

  const statusNote: string[] = [];
  const maxWaitMs = Math.max(
    0,
    Math.min(
      input.caps.hostedMaxCallMs,
      input.deadline - Date.now(),
    ),
  );

  try {
    const result = await input.adapter.runSearch({
      prompt: input.prompt,
      schema: input.schema,
      level: input.level,
      maxWaitMs,
      signal:
        input.signal ??
        AbortSignal.timeout(Math.max(1_000, maxWaitMs)),
      onEvent: (event) => {
        if (event.kind === 'token') {
          emitRunEvent(input.runId, {
            event: 'search_sub_agent_token_delta',
            agentId: input.agentId,
            text: event.text,
          });
          return;
        }

        if (event.kind === 'tool_call') {
          emitRunEvent(input.runId, {
            event: 'search_sub_agent_tool_call',
            agentId: input.agentId,
            toolName: event.toolName,
            toolInput: event.toolInput,
          });
          return;
        }

        // status / progress: stream a short single-line note so the
        // transcript renders it inline; also accumulate it for the tool
        // result so the Orchestrator knows what happened.
        const text = formatStatusText(event);
        if (!text) return;
        statusNote.push(text);
        emitRunEvent(input.runId, {
          event: 'search_sub_agent_token_delta',
          agentId: input.agentId,
          text,
        });
      },
    });

    const records = result.records ?? [];
    const rows: ResearchRecord[] = [];
    for (const record of records) {
      const coerced = coerceRecord(record, input.outputSchema);
      if (coerced) input.onRecord(coerced);
      if (coerced && rows.length < MAX_RESULT_ROWS_FOR_PROMPT) {
        rows.push(coerced);
      }
    }

    const summary =
      rows.length > 0
        ? `${records.length} record(s) returned.`
        : result.text?.slice(0, 200) || 'No records returned.';

    emitRunEvent(input.runId, {
      event: 'search_sub_agent_finished',
      agentId: input.agentId,
      recordsFound: records.length,
      summary,
    });

    if (records.length > 0) {
      emitRunEvent(input.runId, {
        event: 'table_records_ready',
        records: records
          .map((record) => coerceRecord(record, input.outputSchema))
          .filter((row): row is ResearchRecord => row !== null),
      });
    }

    const payload: ToolResultPayload = {
      recordsFound: records.length,
      records: rows,
      ...(result.stopReason ? { stopReason: result.stopReason } : {}),
      ...(result.usage ? { usage: result.usage } : {}),
      ...(statusNote.length ? { note: statusNote.join(' ') } : {}),
    };
    return payload;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);

    emitRunEvent(input.runId, {
      event: 'search_sub_agent_failed',
      agentId: input.agentId,
      error,
    });

    return {
      recordsFound: 0,
      records: [],
      note: `The search failed: ${error}. You may retry with a better-authored prompt within your budget, or wrap up.`,
    };
  }
}
