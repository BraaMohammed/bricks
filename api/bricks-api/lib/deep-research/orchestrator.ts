/**
 * orchestrator.ts
 *
 * The Orchestrator: clarifies the goal, proposes the Output Schema, and picks
 * the Research Sources for a run. Vocabulary follows CONTEXT.md.
 */

import {
  availableResearchSources,
  resolveSourceAssignments,
  sourceCatalogForPrompt,
  type ResearchSourceAssignment,
} from './sources';
import { extractJsonValue, streamCompletion, waterfallJson } from './llm';
import { getDeepResearchCaps } from './env';
import {
  outputSchemaForPrompt,
  parseOutputSchema,
} from './output-schema';
import type {
  DeepResearchChatReply,
  OutputSchema,
  ResearchRecord,
} from './types';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

const ORCHESTRATOR_SYSTEM = `You are the Orchestrator of Bricks' AI Deep Researcher.
You turn a free-text research goal into a table of records.

Decide one of two outcomes from the conversation:
1. "clarification" — only when a genuinely essential detail is missing (for
   example the entity type or the geography is ambiguous). Ask one short,
   specific question. Do not ask for permission or make small talk.
2. "output_schema_proposal" — when the goal is clear enough to research. Propose
   the Output Schema for the resulting table.

Output Schema rules:
- 3 to 8 fields. Every field has a stable machine key (lower_snake_case) and a
  one-line description.
- Fields must be exactly what the user needs in the final table; do not add
  filler fields.
- identityColumns is a subset of field names that identifies a record (usually
  the name or the official website). It may be an empty array.
- sampleRows contains EXACTLY 3 clearly fake sample rows. Every row must contain
  every field key, with short obviously-fake values (e.g. "Example Roastery 1").
- The schema must fit the goal, not a fixed template.

Return ONLY valid JSON, no markdown fences, in one of these shapes:
{"kind":"clarification","text":"..."}
{"kind":"output_schema_proposal","text":"...","outputSchema":{"fields":[{"name":"...","description":"..."}],"identityColumns":["..."],"sampleRows":[{...},{...},{...}]}}`;

const REPAIR_SYSTEM = `You repair JSON for Bricks' AI Deep Researcher.
Return ONLY the corrected JSON value, with no prose and no markdown fences.`;

function conversationText(messages: ChatTurn[]): string {
  return messages
    .map((message) =>
      `${message.role === 'user' ? 'User' : 'Orchestrator'}: ${message.content}`,
    )
    .join('\n\n');
}

function normalizeReply(value: unknown): DeepResearchChatReply | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;

  const kind = String(record.kind ?? record.action ?? '').toLowerCase();
  const text =
    typeof record.text === 'string'
      ? record.text.trim()
      : typeof record.message === 'string'
        ? record.message.trim()
        : '';

  if (kind === 'clarification') {
    if (!text) return null;
    return { kind: 'clarification', text };
  }

  if (
    kind === 'output_schema_proposal' ||
    kind === 'proposal' ||
    kind === 'schema_proposal' ||
    record.outputSchema !== undefined ||
    record.schema !== undefined
  ) {
    const schema = parseOutputSchema(record.outputSchema ?? record.schema);
    if (!schema) return null;
    return {
      kind: 'output_schema_proposal',
      text:
        text ||
        'Here is the Output Schema I propose for this Deep Research Run.',
      outputSchema: schema,
    };
  }

  return null;
}

export interface ProposeOrClarifyResult {
  reply: DeepResearchChatReply;
  /** True when this turn produced an approved-ready Output Schema. */
  proposed: boolean;
}

/**
 * Runs the Clarify step of a Deep Research Run. Falls back to a clarification
 * when the model cannot produce a valid proposal, so the user can retry.
 */
export async function proposeOrClarify(
  messages: ChatTurn[],
): Promise<ProposeOrClarifyResult> {
  const history = conversationText(messages);
  const prompt = `Conversation so far:\n\n${history}\n\nReturn the next Orchestrator turn as JSON.`;

  let parsed = await waterfallJson({
    system: ORCHESTRATOR_SYSTEM,
    prompt,
    temperature: 0.2,
    maxTokens: 1_600,
  });

  let reply = normalizeReply(parsed);

  if (!reply && parsed !== null) {
    const repaired = await waterfallJson({
      system: REPAIR_SYSTEM,
      prompt: `The previous answer was invalid for this schema. Re-emit a valid JSON reply in the required shape.\n\nPrevious answer:\n${JSON.stringify(parsed)}`,
      temperature: 0,
      maxTokens: 1_600,
    });
    reply = normalizeReply(repaired);
  }

  if (!reply) {
    return {
      reply: {
        kind: 'clarification',
        text: 'I could not pin down the table yet. What exactly should one row represent, and which fields do you need?',
      },
      proposed: false,
    };
  }

  return {
    reply,
    proposed: reply.kind === 'output_schema_proposal',
  };
}

// ── Source selection ──────────────────────────────────────────────────────────

export interface PlanSourcesInput {
  goal: string;
  outputSchema: OutputSchema;
  onTextDelta?: (text: string) => void;
  abortSignal?: AbortSignal;
}

/**
 * Asks the Orchestrator to choose Research Sources for this run, streaming its
 * visible reasoning. Falls back to `web-search` if the model output is unusable;
 * source selection is always derived from the goal + Output Schema.
 */
export async function planResearchSources(
  input: PlanSourcesInput,
): Promise<ResearchSourceAssignment[]> {
  const caps = getDeepResearchCaps();
  const available = availableResearchSources();
  const catalog = sourceCatalogForPrompt(available);

  const system = `You are the Orchestrator of Bricks' AI Deep Researcher, planning one Deep Research Run.
Choose which Research Sources the Search Sub-Agents should use.

Available Research Sources:
${catalog}

Rules:
- Choose between 1 and ${caps.maxSources} sources.
- "web-search" is always included.
- Prefer sources whose evidence actually matches this goal. Do not pick every
  source by default.
- Sources are assignment contexts: each selected source gets its own Search
  Sub-Agent using web_search and read_page.

Research goal:
${input.goal}

Output Schema:
${outputSchemaForPrompt(input.outputSchema)}

Return ONLY valid JSON:
{"sourceNames":["web-search","hacker-news"],"reason":"short reason"}`;

  let text = '';
  try {
    text = await streamCompletion({
      system,
      prompt: 'Select the Research Sources for this run. Return JSON only.',
      onTextDelta: input.onTextDelta,
      abortSignal: input.abortSignal,
      maxOutputTokens: 500,
      temperature: 0.1,
    });
  } catch (err) {
    console.warn(
      `  ⚠️ [deep-research] streaming source plan failed: ${String(err)}`,
    );
  }

  let parsed = extractJsonValue(text);
  if (!parsed || typeof parsed !== 'object') {
    parsed = await waterfallJson({
      system,
      prompt: 'Select the Research Sources for this run. Return JSON only.',
      temperature: 0.1,
      maxTokens: 500,
    });
  }

  let requested: string[] = [];
  if (parsed && typeof parsed === 'object') {
    const record = parsed as Record<string, unknown>;
    const raw = record.sourceNames ?? record.sources;
    if (Array.isArray(raw)) {
      requested = raw
        .map((entry) =>
          typeof entry === 'string'
            ? entry
            : entry && typeof entry === 'object'
              ? String((entry as Record<string, unknown>).name ?? '')
              : '',
        )
        .filter(Boolean);
    }
  }

  return resolveSourceAssignments(requested, caps.maxSources);
}

// ── Orchestrator run text (streamed into the transcript) ─────────────────────

export interface OpeningBriefInput {
  goal: string;
  outputSchema: OutputSchema;
  sources: ResearchSourceAssignment[];
  onTextDelta?: (text: string) => void;
  abortSignal?: AbortSignal;
}

/**
 * Produces the Orchestrator's short opening brief after source selection. This
 * is the main producer of `orchestrator_token_delta` events during a run.
 */
export async function streamOpeningBrief(
  input: OpeningBriefInput,
): Promise<string> {
  const sourceList = input.sources
    .map((source) => `${source.label} (${source.name})`)
    .join(', ');

  return streamCompletion({
    system:
      "You are the Orchestrator of Bricks' AI Deep Researcher. Speak briefly and concretely to the user about the research you are starting. No markdown headings, no promises about data you have not found yet.",
    prompt: `Goal: ${input.goal}\nOutput Schema:\n${outputSchemaForPrompt(input.outputSchema)}\nSelected Research Sources: ${sourceList}\n\nWrite 2-4 sentences: what you will search, which sources you are using and how a Record will be identified. Do not invent findings.`,
    onTextDelta: input.onTextDelta,
    abortSignal: input.abortSignal,
    maxOutputTokens: 300,
    temperature: 0.3,
  }).catch(() => '');
}

// Re-exported for callers that only need the record shape.
export type { ResearchRecord };
