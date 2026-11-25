/**
 * Parallel Task API adapter — implements contract.ts.
 *
 * Agentic endpoint only: POST /v1/tasks/runs creates a Task Run, progress is
 * consumed from GET /v1/tasks/runs/{run_id}/events (SSE). Plain Search/Extract
 * endpoints are NOT used.
 *
 * Behavior verified against docs.parallel.ai (create-task-run, task-sse,
 * specify-a-task, pricing):
 * - The final task_run.state event of a completed run carries the full output
 *   in `output.content` (native JSON for json output schemas).
 * - SSE connections cap at ~570s. Reconnecting to a running task replays the
 *   reasoning trace, so progress messages are deduped by type+message+timestamp.
 * - There is NO cancel endpoint for Task Runs (FindAll and Monitor have one;
 *   Tasks does not). On timeout or user abort we abandon the stream and
 *   resolve with whatever partial records were already received.
 * - Output schemas accept a strict JSON Schema subset: object root with
 *   properties, every field required (optionality via ["T","null"] unions),
 *   additionalProperties false at every object level, nesting depth <= 5,
 *   <= 100 properties total, task spec + input <= 25,000 chars. Restriction
 *   keywords (pattern, minimum, maxLength, format, ...) are unsupported and
 *   are folded into descriptions instead.
 */

import type {
  ProviderLevel,
  SearchProviderAdapter,
  SearchProviderEvent,
  SearchProviderResult,
  SearchProviderRunParams,
} from './contract';

const API_BASE = 'https://api.parallel.ai';
const SSE_RECONNECT_DELAY_MS = 1_000;
const SCHEMA_MAX_DEPTH = 5;
const SCHEMA_MAX_PROPERTIES = 100;
const TASK_SPEC_CHAR_LIMIT = 15_000;
const TOTAL_CHAR_LIMIT = 25_000;
const MIN_DESCRIPTION_LENGTH = 16;

const UNSUPPORTED_SCHEMA_KEYWORDS = [
  'contains',
  'format',
  'maxContains',
  'maxItems',
  'maxLength',
  'maxProperties',
  'maximum',
  'minContains',
  'minItems',
  'minLength',
  'minimum',
  'minProperties',
  'multipleOf',
  'pattern',
  'patternProperties',
  'propertyNames',
  'uniqueItems',
  'unevaluatedItems',
  'unevaluatedProperties',
] as const;

const CONSTRAINT_HINTS: Record<string, string> = {
  minLength: 'at least {v} characters',
  maxLength: 'at most {v} characters',
  minimum: 'no less than {v}',
  maximum: 'no more than {v}',
  minItems: 'at least {v} items',
  maxItems: 'at most {v} items',
  minProperties: 'at least {v} properties',
  maxProperties: 'at most {v} properties',
  pattern: 'must match the regex "{v}"',
  format: 'formatted as "{v}"',
  multipleOf: 'a multiple of {v}',
  uniqueItems: 'items must be unique',
  contains: 'must contain an item matching {v}',
  maxContains: 'at most {v} matching items',
  minContains: 'at least {v} matching items',
  patternProperties: 'see property patterns: {v}',
  propertyNames: 'property names must match {v}',
  unevaluatedItems: 'no unevaluated items',
  unevaluatedProperties: 'no unevaluated properties',
};

/** Prices and latency windows from docs.parallel.ai/getting-started/pricing. */
const LEVELS: ProviderLevel[] = [
  { id: 'lite', label: 'Lite', priceLabel: '$0.005 / run', timeLabel: '10s-60s' },
  { id: 'base', label: 'Base', priceLabel: '$0.01 / run', timeLabel: '15s-100s' },
  { id: 'core', label: 'Core', priceLabel: '$0.025 / run', timeLabel: '60s-5min' },
  { id: 'core2x', label: 'Core 2x', priceLabel: '$0.05 / run', timeLabel: '60s-10min' },
  { id: 'pro', label: 'Pro', priceLabel: '$0.10 / run', timeLabel: '2min-10min' },
  { id: 'ultra', label: 'Ultra', priceLabel: '$0.30 / run', timeLabel: '5min-25min' },
  { id: 'ultra2x', label: 'Ultra 2x', priceLabel: '$0.60 / run', timeLabel: '5min-50min' },
  { id: 'ultra4x', label: 'Ultra 4x', priceLabel: '$1.20 / run', timeLabel: '5min-90min' },
  { id: 'ultra8x', label: 'Ultra 8x', priceLabel: '$2.40 / run', timeLabel: '5min-2hr' },
];

const LEVEL_IDS = new Set(LEVELS.map((level) => level.id));

const LEVEL_PRICE_USD: Record<string, number> = {
  lite: 0.005,
  base: 0.01,
  core: 0.025,
  core2x: 0.05,
  pro: 0.1,
  ultra: 0.3,
  ultra2x: 0.6,
  ultra4x: 1.2,
  ultra8x: 2.4,
};

// ── Schema sanitization ──────────────────────────────────────────────────────

interface SanitizeContext {
  defs: Record<string, unknown>;
  propertiesLeft: number;
}

function describeValue(value: unknown): string {
  if (value && typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return 'complex value';
    }
  }
  return String(value);
}

/** Expresses optionality as a ["T", "null"] union (all fields are required). */
function withNullableLeaf(node: Record<string, unknown>): Record<string, unknown> {
  const type = node.type;
  if (Array.isArray(type)) {
    node.type = type.includes('null') ? type : [...type, 'null'];
  } else if (typeof type === 'string') {
    node.type = type === 'null' ? ['null'] : [type, 'null'];
  } else {
    node.type = ['string', 'null'];
  }
  return node;
}

function sanitizeSchemaNode(
  raw: unknown,
  depth: number,
  ctx: SanitizeContext,
): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const node = raw as Record<string, unknown>;

  if (typeof node.$ref === 'string') {
    const refName = node.$ref.startsWith('#/$defs/') ? node.$ref.slice('#/$defs/'.length) : undefined;
    const target = refName ? ctx.defs[refName] : undefined;
    const resolved = target ? sanitizeSchemaNode(target, depth, ctx) : withNullableLeaf({ type: 'string' });
    if (resolved && typeof node.description === 'string' && !resolved.description) {
      resolved.description = node.description;
    }
    return resolved;
  }

  if (depth >= SCHEMA_MAX_DEPTH) {
    return withNullableLeaf({
      type: 'string',
      description:
        (typeof node.description === 'string' && node.description) ||
        'Deeply nested field, flattened to text.',
    });
  }

  const out: Record<string, unknown> = {};
  const baseDescription = typeof node.description === 'string' ? node.description : '';
  const hints: string[] = [];
  for (const keyword of UNSUPPORTED_SCHEMA_KEYWORDS) {
    if (!(keyword in node)) continue;
    const template = CONSTRAINT_HINTS[keyword];
    hints.push(
      template
        ? template.replace('{v}', describeValue(node[keyword]))
        : `${keyword}: ${describeValue(node[keyword])}`,
    );
  }
  const description = hints.length
    ? baseDescription
      ? `${baseDescription} (${hints.join('; ')})`
      : hints.join('; ')
    : baseDescription;
  if (description) out.description = description;

  if (Array.isArray(node.enum)) {
    out.enum = node.enum;
    out.type = typeof node.type === 'string' ? node.type : 'string';
    return withNullableLeaf(out);
  }

  if (Array.isArray(node.anyOf)) {
    const branches = node.anyOf
      .map((branch) => sanitizeSchemaNode(branch, depth + 1, ctx))
      .filter(Boolean) as Record<string, unknown>[];
    if (branches.length) out.anyOf = branches;
    else out.type = ['string', 'null'];
    return out;
  }

  const declaredType = node.type;
  const hasProperties =
    node.properties && typeof node.properties === 'object' && !Array.isArray(node.properties);

  if (declaredType === 'object' || (!declaredType && hasProperties)) {
    out.type = 'object';
    const sourceProperties = (node.properties ?? {}) as Record<string, unknown>;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    for (const key of Object.keys(sourceProperties)) {
      if (ctx.propertiesLeft <= 0) break;
      ctx.propertiesLeft -= 1;
      const child = sanitizeSchemaNode(sourceProperties[key], depth + 1, ctx);
      if (!child) continue;
      properties[key] = child;
      required.push(key);
    }
    out.properties = properties;
    out.required = required;
    out.additionalProperties = false;
    return out;
  }

  if (declaredType === 'array' || node.items !== undefined) {
    out.type = 'array';
    const items = sanitizeSchemaNode(node.items, depth + 1, ctx);
    if (items) out.items = items;
    return out;
  }

  if (typeof declaredType === 'string') out.type = declaredType;
  else if (Array.isArray(declaredType)) out.type = declaredType;
  else out.type = 'string';
  return withNullableLeaf(out);
}

/**
 * Converts an Orchestrator-authored schema into the strict subset Parallel's
 * output-schema validator accepts: object root with properties, every field
 * required (optionality via ["T","null"] unions), additionalProperties false
 * everywhere, unsupported keywords folded into descriptions. Array roots are
 * wrapped under a `records` property so the completion mapping can unwrap them.
 */
export function sanitizeParallelOutputSchema(
  schema?: Record<string, unknown>,
): Record<string, unknown> {
  if (!schema || typeof schema !== 'object') {
    return {
      type: 'object',
      properties: {
        records: {
          type: ['array', 'null'],
          items: { type: ['object', 'null'], additionalProperties: false },
        },
      },
      required: ['records'],
      additionalProperties: false,
    };
  }

  const declaredRootType = typeof schema.type === 'string' ? schema.type : undefined;
  const hasRootProperties =
    schema.properties && typeof schema.properties === 'object' && !Array.isArray(schema.properties);
  const defs = (schema.$defs && typeof schema.$defs === 'object' ? schema.$defs : {}) as Record<
    string,
    unknown
  >;

  if (declaredRootType === 'object' || (!declaredRootType && hasRootProperties)) {
    const ctx: SanitizeContext = { defs, propertiesLeft: SCHEMA_MAX_PROPERTIES };
    const sanitized = sanitizeSchemaNode(schema, 0, ctx);
    return (
      sanitized ?? { type: 'object', properties: {}, required: [], additionalProperties: false }
    );
  }

  const ctx: SanitizeContext = { defs, propertiesLeft: SCHEMA_MAX_PROPERTIES - 1 };
  const wrapped = sanitizeSchemaNode(schema, 0, ctx) ?? { type: ['string', 'null'] };
  return {
    type: 'object',
    properties: { records: wrapped },
    required: ['records'],
    additionalProperties: false,
  };
}

function findLongestDescription(root: unknown): Record<string, unknown> | null {
  let best: Record<string, unknown> | null = null;
  let bestLength = 0;
  const stack: unknown[] = [root];
  while (stack.length) {
    const value = stack.pop();
    if (Array.isArray(value)) {
      stack.push(...value);
      continue;
    }
    if (!value || typeof value !== 'object') continue;
    const record = value as Record<string, unknown>;
    if (typeof record.description === 'string' && record.description.length > bestLength) {
      best = record;
      bestLength = record.description.length;
    }
    stack.push(...Object.values(record));
  }
  return bestLength > MIN_DESCRIPTION_LENGTH ? best : null;
}

/**
 * Builds the task_spec.output_schema body and enforces the combined 25,000
 * char budget (task spec + input) by truncating the longest descriptions.
 */
export function buildParallelOutputTaskSpec(
  schema: Record<string, unknown> | undefined,
  input: string,
): { taskSpec: Record<string, unknown>; withinLimit: boolean } {
  if (!schema) {
    return { taskSpec: { output_schema: { type: 'auto' } }, withinLimit: true };
  }

  const sanitized = sanitizeParallelOutputSchema(schema);
  const taskSpec: Record<string, unknown> = {
    output_schema: { type: 'json', json_schema: sanitized },
  };

  const specLength = () => JSON.stringify(taskSpec).length;
  const withinBudget = () =>
    specLength() <= TASK_SPEC_CHAR_LIMIT && specLength() + input.length <= TOTAL_CHAR_LIMIT;

  let withinLimit = withinBudget();
  if (!withinLimit) {
    for (let guard = 0; guard < 256; guard++) {
      const longest = findLongestDescription(sanitized);
      if (!longest || typeof longest.description !== 'string') break;
      longest.description = longest.description.slice(
        0,
        Math.max(MIN_DESCRIPTION_LENGTH, Math.floor(longest.description.length / 2)),
      );
      if (withinBudget()) {
        withinLimit = true;
        break;
      }
    }
  }
  if (!withinLimit) {
    console.warn(
      '  ⚠️ [deep-research] Parallel task spec + input still exceeds 25,000 chars after truncation',
    );
  }

  return { taskSpec, withinLimit };
}

// ── SSE helpers ──────────────────────────────────────────────────────────────

interface StreamStateCallbacks {
  onState: (state: {
    status?: string;
    isActive?: boolean;
    output?: unknown;
    error?: string;
  }) => void;
  onProgressMsg: (subtype: string, message: string) => void;
  onStats: (stats: {
    sourcesRead?: number;
    sourcesConsidered?: number;
    percent?: number;
  }) => void;
  onErrorEvent: (message: string) => void;
}

interface EventsStreamOptions extends StreamStateCallbacks {
  apiKey: string;
  runId: string;
  signal: AbortSignal;
  seen: Set<string>;
}

function handleEventsFrame(frame: string, options: EventsStreamOptions): void {
  let eventType = '';
  const dataLines: string[] = [];
  for (const line of frame.split('\n')) {
    if (line.startsWith('event:')) eventType = line.slice('event:'.length).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice('data:'.length).trim());
  }
  if (!dataLines.length) return;

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(dataLines.join('\n')) as Record<string, unknown>;
  } catch {
    return;
  }

  const type = (typeof data.type === 'string' ? data.type : eventType) || eventType;

  if (type === 'task_run.state') {
    const run = data.run as Record<string, unknown> | undefined;
    const runError = run?.error as Record<string, unknown> | undefined;
    options.onState({
      status: typeof run?.status === 'string' ? run.status : undefined,
      isActive: typeof run?.is_active === 'boolean' ? run.is_active : undefined,
      output: data.output ?? undefined,
      error:
        runError && typeof runError.message === 'string' ? runError.message : undefined,
    });
    return;
  }

  if (type === 'task_run.progress_stats') {
    const sourceStats = data.source_stats as Record<string, unknown> | undefined;
    options.onStats({
      sourcesRead:
        typeof sourceStats?.num_sources_read === 'number' ? sourceStats.num_sources_read : undefined,
      sourcesConsidered:
        typeof sourceStats?.num_sources_considered === 'number'
          ? sourceStats.num_sources_considered
          : undefined,
      percent: typeof data.progress_meter === 'number' ? data.progress_meter : undefined,
    });
    return;
  }

  if (type === 'error') {
    options.onErrorEvent(
      typeof data.message === 'string' ? data.message : JSON.stringify(data).slice(0, 300),
    );
    return;
  }

  if (type.startsWith('task_run.progress_msg.')) {
    const message = typeof data.message === 'string' ? data.message : '';
    const timestamp = typeof data.timestamp === 'string' ? data.timestamp : '';
    const dedupeKey = `${type}|${message}|${timestamp}`;
    if (options.seen.has(dedupeKey)) return;
    options.seen.add(dedupeKey);
    options.onProgressMsg(type.slice('task_run.progress_msg.'.length), message);
  }
}

async function openEventsStreamOnce(options: EventsStreamOptions): Promise<void> {
  const res = await fetch(`${API_BASE}/v1/tasks/runs/${options.runId}/events`, {
    method: 'GET',
    headers: { 'x-api-key': options.apiKey, Accept: 'text/event-stream' },
    signal: options.signal,
  });

  if (!res.ok || !res.body) {
    const snippet = await res.text().catch(() => '');
    throw Object.assign(
      new Error(
        `Parallel events stream returned HTTP ${res.status}: ${snippet.slice(0, 300)}`,
      ),
      { httpStatus: res.status },
    );
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  try {
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer = (buffer + decoder.decode(value, { stream: true })).replace(/\r\n/g, '\n');
      let separator: number;
      while ((separator = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, separator);
        buffer = buffer.slice(separator + 2);
        handleEventsFrame(frame, options);
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
}

function sleep(ms: number, signal: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (woke: boolean) => {
      if (timer) clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
      resolve(woke);
    };
    const onAbort = () => finish(false);
    timer = setTimeout(() => finish(true), ms);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

// ── Completion mapping ───────────────────────────────────────────────────────

function isRecordObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function extractRecords(content: unknown): {
  records?: Record<string, unknown>[];
  text?: string;
} {
  if (typeof content === 'string') return { text: content };
  if (Array.isArray(content)) {
    return { records: content.filter(isRecordObject) };
  }
  if (isRecordObject(content)) {
    for (const value of Object.values(content)) {
      if (Array.isArray(value)) {
        return { records: value.filter(isRecordObject) };
      }
    }
    return { records: [content] };
  }
  return {};
}

function describeErrorPayload(payload: unknown): string {
  const message =
    (payload as { error?: { message?: string } } | undefined)?.error?.message ??
    (payload as { message?: string } | undefined)?.message;
  if (message) return message;
  try {
    return JSON.stringify(payload).slice(0, 300);
  } catch {
    return 'unparseable error payload';
  }
}

async function fetchResultOutput(
  apiKey: string,
  runId: string,
  signal: AbortSignal,
): Promise<unknown> {
  try {
    const res = await fetch(`${API_BASE}/v1/tasks/runs/${runId}/result`, {
      headers: { 'x-api-key': apiKey, Accept: 'application/json' },
      signal,
    });
    if (!res.ok) return undefined;
    const payload = (await res.json()) as { output?: unknown };
    return payload.output;
  } catch {
    return undefined;
  }
}

// ── Adapter ──────────────────────────────────────────────────────────────────

async function runSearch(params: SearchProviderRunParams): Promise<SearchProviderResult> {
  const apiKey = process.env.PARALLEL_API_KEY?.trim();
  if (!apiKey) throw new Error('Parallel API key is not configured');

  const levelId = LEVEL_IDS.has(params.level) ? params.level : 'base';
  const { taskSpec } = buildParallelOutputTaskSpec(params.schema, params.prompt);

  const controller = new AbortController();
  const abortAll = () => controller.abort();
  if (params.signal.aborted) controller.abort();
  else params.signal.addEventListener('abort', abortAll, { once: true });

  const deadline = Date.now() + params.maxWaitMs;
  const deadlineTimer = setTimeout(abortAll, Math.max(0, deadline - Date.now()));
  const detach = () => {
    clearTimeout(deadlineTimer);
    params.signal.removeEventListener('abort', abortAll);
  };

  const emit = (event: SearchProviderEvent) => params.onEvent(event);

  let runId: string | undefined;
  try {
    const createRes = await fetch(`${API_BASE}/v1/tasks/runs`, {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: params.prompt,
        processor: levelId,
        task_spec: taskSpec,
        enable_events: true,
        metadata: { bricks: 'deep_research' },
      }),
      signal: controller.signal,
    });

    if (!createRes.ok) {
      const payload = await createRes.json().catch(() => undefined);
      throw new Error(
        `Parallel task run creation failed (HTTP ${createRes.status}): ${describeErrorPayload(payload)}`,
      );
    }

    const created = (await createRes.json()) as { run_id?: string };
    runId = created.run_id;
    if (!runId) throw new Error('Parallel task run creation returned no run_id');
  } catch (err) {
    detach();
    if (controller.signal.aborted) {
      return { stopReason: params.signal.aborted ? 'aborted' : 'max_wait_timeout' };
    }
    throw err;
  }

  const seen = new Set<string>();
  let status: string | undefined;
  let isActive = true;
  let finalOutput: unknown;
  let runErrorMessage: string | undefined;
  let errorEventMessage: string | undefined;

  while (true) {
    if (controller.signal.aborted || Date.now() >= deadline) break;

    try {
      await openEventsStreamOnce({
        apiKey,
        runId,
        signal: controller.signal,
        seen,
        onState: (state) => {
          if (state.status) status = state.status;
          if (typeof state.isActive === 'boolean') isActive = state.isActive;
          if (state.output !== undefined) finalOutput = state.output;
          if (state.error) runErrorMessage = state.error;
          if (state.status) emit({ kind: 'status', text: state.status });
        },
        onProgressMsg: (subtype, message) => {
          if (subtype === 'search') {
            const queryMatch = /^Query:\s*(.+)$/im.exec(message);
            if (queryMatch) {
              emit({ kind: 'tool_call', toolName: 'search', toolInput: queryMatch[1].trim() });
            }
            return;
          }
          if (subtype === 'plan' || subtype === 'result') {
            emit({ kind: 'token', text: message });
            return;
          }
          if (subtype === 'exec_status') {
            emit({ kind: 'status', text: message });
            return;
          }
          if (subtype === 'tool_call') {
            emit({ kind: 'tool_call', toolName: 'tool', toolInput: message });
          }
        },
        onStats: (stats) => {
          emit({ kind: 'progress', ...stats });
        },
        onErrorEvent: (message) => {
          errorEventMessage = message;
          emit({ kind: 'status', text: `error: ${message}` });
        },
      });
    } catch (err) {
      if (controller.signal.aborted) break;
      const httpStatus = (err as { httpStatus?: number }).httpStatus;
      const retryable = httpStatus === undefined || httpStatus === 429 || httpStatus >= 500;
      if (!retryable) {
        detach();
        throw err;
      }
      if (!(await sleep(SSE_RECONNECT_DELAY_MS * 2, controller.signal))) break;
      continue;
    }

    if (
      !isActive ||
      status === 'completed' ||
      status === 'failed' ||
      status === 'cancelled' ||
      status === 'action_required'
    ) {
      break;
    }
    if (!(await sleep(SSE_RECONNECT_DELAY_MS, controller.signal))) break;
  }

  detach();

  if (status === 'failed') {
    throw new Error(
      `Parallel task run failed: ${runErrorMessage ?? errorEventMessage ?? 'unknown error'}`,
    );
  }

  const output =
    finalOutput ??
    (status === 'completed' ? await fetchResultOutput(apiKey, runId, controller.signal) : undefined);
  const content = (output as { content?: unknown } | undefined)?.content;
  const { records, text } = extractRecords(content);

  const completed = status === 'completed';
  return {
    ...(records ? { records } : {}),
    ...(text !== undefined ? { text } : {}),
    usage: completed ? { costUsd: LEVEL_PRICE_USD[levelId] } : undefined,
    stopReason: completed
      ? 'completed'
      : status === 'cancelled'
        ? 'cancelled'
        : status === 'action_required'
          ? 'action_required'
          : params.signal.aborted
            ? 'aborted'
            : 'max_wait_timeout',
  };
}

export const parallelSearchProvider: SearchProviderAdapter = {
  id: 'parallel',
  label: 'Parallel',
  levels: () => LEVELS,
  isConfigured: () => Boolean(process.env.PARALLEL_API_KEY?.trim()),
  statusPayload: () => ({
    id: 'parallel',
    label: 'Parallel',
    configured: Boolean(process.env.PARALLEL_API_KEY?.trim()),
    levels: LEVELS,
  }),
  runSearch,
};
