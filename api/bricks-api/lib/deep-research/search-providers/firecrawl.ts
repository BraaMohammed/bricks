/**
 * Firecrawl Agent adapter — implements contract.ts.
 *
 * Agentic endpoint ONLY: POST /v2/agent (Spark 2, effort low|medium|high).
 * Plain Firecrawl search endpoints are forbidden by the contract.
 *
 * Firecrawl /agent has no SSE/websocket: start the job, then poll
 * GET /v2/agent/{id} for status and GET /v2/agent/{id}/trace for events.
 * The trace is a full replay each poll, so events are deduped by eventId.
 * producerSequence is monotonic PER emitting agent, so events are grouped by
 * agent.id and sorted within each group (a global sort interleaves the
 * orchestrator's events with its subagents' incorrectly). Polling continues
 * ~2 quiet polls after status leaves "processing" — events can land after
 * the terminal run.finished event.
 */

import type {
  ProviderLevel,
  SearchProviderAdapter,
  SearchProviderEvent,
  SearchProviderResult,
  SearchProviderRunParams,
} from './contract';

const API_BASE = 'https://api.firecrawl.dev/v2';
const POLL_INTERVAL_MS = 5_000;
const QUIET_POLLS_AFTER_FINISH = 2;

interface AgentTraceAgent {
  id: string;
  role: 'orchestrator' | 'subagent' | 'system';
  name: string;
  parentId?: string;
}

interface AgentTraceError {
  code?: string;
  message?: string;
}

interface AgentTraceArtifact {
  kind?: string;
  path?: string;
  change?: 'init' | 'partial' | 'append' | 'modify' | 'update';
  itemCount?: number;
  changedFields?: string[];
}

type AgentTraceEvent = {
  eventId: string;
  runId: string;
  occurredAt: string;
  producerSequence: number;
  agent: AgentTraceAgent;
  type: string;
  // run.finished / agent.finished
  outcome?: string;
  error?: AgentTraceError | null;
  durationMs?: number;
  // progress.reported
  phase?: 'planning' | 'working' | 'finalizing';
  message?: string;
  // reasoning.summary
  text?: string;
  // tool_call.*
  toolCallId?: string;
  toolName?: string;
  parameters?: unknown;
  result?: unknown;
  // artifact.updated
  artifact?: AgentTraceArtifact;
};

interface AgentStatusResponse {
  success?: boolean;
  status?: 'processing' | 'completed' | 'failed';
  id?: string;
  data?: unknown;
  error?: unknown;
  stopReason?: string;
  partial?: unknown;
  partialSchemaValid?: boolean;
  message?: string;
  threadId?: string;
  creditsUsed?: number;
}

interface AgentTraceResponse {
  success?: boolean;
  id?: string;
  events?: AgentTraceEvent[];
  creditsUsed?: number;
}

/**
 * GETs the trace, treating failures (the trace can 404/503 briefly at job
 * start — it shares infrastructure with the legacy extract endpoint) as an
 * empty replay instead of failing the run.
 */
async function fetchTrace(
  jobId: string,
  signal: AbortSignal,
): Promise<AgentTraceResponse | undefined> {
  const res = await firecrawlFetch({
    method: 'GET',
    path: `/agent/${jobId}/trace`,
    signal,
  });
  if (!res.ok) {
    await res.text().catch(() => {});
    return undefined;
  }
  try {
    return (await res.json()) as AgentTraceResponse;
  } catch {
    return undefined;
  }
}

interface AgentTraceRunFinished extends AgentTraceEvent {
  type: 'run.finished';
  outcome: string;
  error: AgentTraceError | null;
}

const DEFAULT_MAX_CREDITS = 2_500;

function apiKey(): string {
  const key = process.env.FIRECRAWL_KEY;
  if (!key) throw new Error('FIRECRAWL_KEY is not set');
  return key;
}

function maxCredits(): number {
  const raw = process.env.FIRECRAWL_MAX_CREDITS;
  const parsed = raw === undefined || raw === '' ? NaN : Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_CREDITS;
}

function effortFor(level: string): 'low' | 'medium' | 'high' {
  return level === 'low' || level === 'medium' || level === 'high'
    ? level
    : 'medium';
}

/**
 * Pulls the records array out of the status payload's `data` (or `partial`).
 * An object whose properties include an array yields that array; a bare
 * array yields itself; anything else is wrapped in a single-element array.
 */
function extractRecords(data: unknown): Record<string, unknown>[] {
  if (data == null) return [];
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (typeof data === 'object') {
    for (const value of Object.values(data as Record<string, unknown>)) {
      if (Array.isArray(value)) return value as Record<string, unknown>[];
    }
  }
  return [data as Record<string, unknown>];
}

interface FirecrawlFetchOptions {
  method: string;
  path: string;
  body?: unknown;
  signal: AbortSignal;
}

async function firecrawlFetch({
  method,
  path,
  body,
  signal,
}: FirecrawlFetchOptions): Promise<Response> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    signal,
  });
  return res;
}

async function firecrawlJson<T>(
  options: FirecrawlFetchOptions,
): Promise<T> {
  const res = await firecrawlFetch(options);
  const snippet = await res.text().catch(() => '');
  if (!res.ok) {
    throw new Error(
      `Firecrawl ${options.method} ${options.path} returned HTTP ${res.status}: ${snippet.slice(0, 300)}`,
    );
  }
  try {
    return JSON.parse(snippet) as T;
  } catch {
    throw new Error(
      `Firecrawl ${options.method} ${options.path} returned non-JSON: ${snippet.slice(0, 300)}`,
    );
  }
}

/** Fire-and-forget cooperative cancel of a running job. */
function cancelJob(jobId: string): void {
  void firecrawlJson<unknown>({
    method: 'DELETE',
    path: `/agent/${jobId}`,
    signal: AbortSignal.timeout(10_000),
  }).catch(() => {});
}

/** Maps one trace event onto the normalized SearchProviderEvent shape. */
function mapTraceEvent(event: AgentTraceEvent): SearchProviderEvent | null {
  switch (event.type) {
    case 'progress.reported':
      return { kind: 'status', text: `${event.phase ?? 'working'}: ${event.message ?? ''}` };
    case 'reasoning.summary':
      return event.text ? { kind: 'token', text: event.text } : null;
    case 'tool_call.started':
      return event.toolName
        ? { kind: 'tool_call', toolName: event.toolName, toolInput: event.parameters }
        : null;
    case 'artifact.updated':
      if (typeof event.artifact?.itemCount === 'number') {
        return { kind: 'progress' };
      }
      return null;
    case 'agent.started':
      return { kind: 'status', text: `${event.agent.name} started` };
    case 'agent.finished':
      return { kind: 'status', text: `${event.agent.name} finished` };
    default:
      return null;
  }
}

/**
 * Consumes one full trace replay: dedupes by eventId, orders events within
 * each emitting agent's group by producerSequence (never globally), and emits
 * the mapped provider events. Returns how many NEW events landed.
 */
function consumeTrace(
  events: AgentTraceEvent[],
  seen: Set<string>,
  onEvent: SearchProviderRunParams['onEvent'],
): number {
  const byAgent = new Map<string, AgentTraceEvent[]>();
  for (const event of events) {
    if (!event?.eventId || seen.has(event.eventId)) continue;
    const bucket = byAgent.get(event.agent?.id ?? 'unknown') ?? [];
    bucket.push(event);
    byAgent.set(event.agent?.id ?? 'unknown', bucket);
  }

  let newEvents = 0;
  for (const bucket of byAgent.values()) {
    bucket.sort((a, b) => a.producerSequence - b.producerSequence);
    for (const event of bucket) {
      seen.add(event.eventId);
      newEvents++;
      if (event.type === 'artifact.updated' && typeof event.artifact?.itemCount === 'number') {
        onEvent({ kind: 'status', text: `Working table: ${event.artifact.itemCount} rows` });
      }
      const mapped = mapTraceEvent(event);
      if (mapped) onEvent(mapped);
    }
  }
  return newEvents;
}

function errorText(error: AgentTraceError | null | undefined, fallback: unknown): string {
  if (error && typeof error.message === 'string' && error.message) return error.message;
  if (typeof fallback === 'string' && fallback) return fallback;
  return 'unknown error';
}

export const firecrawlSearchProvider: SearchProviderAdapter = {
  id: 'firecrawl',
  label: 'Firecrawl',

  levels(): ProviderLevel[] {
    const cap = Number.isFinite(maxCredits()) ? maxCredits() : DEFAULT_MAX_CREDITS;
    const priceLabel = `credit-based (dynamic) · capped at ${cap} credits (FIRECRAWL_MAX_CREDITS)`;
    return [
      { id: 'low', label: 'Low', priceLabel, timeLabel: '~minutes' },
      { id: 'medium', label: 'Medium', priceLabel, timeLabel: '~minutes' },
      { id: 'high', label: 'High', priceLabel, timeLabel: '~minutes (longer runs)' },
    ];
  },

  isConfigured: () => Boolean(process.env.FIRECRAWL_KEY),

  statusPayload: () => {
    const levels = firecrawlSearchProvider.levels();
    return {
      id: 'firecrawl' as const,
      label: 'Firecrawl',
      configured: Boolean(process.env.FIRECRAWL_KEY),
      levels,
    };
  },

  async runSearch(params: SearchProviderRunParams): Promise<SearchProviderResult> {
    const { prompt, schema, level, maxWaitMs, signal, onEvent } = params;

    const controller = new AbortController();
    let timedOut = false;
    const deadline = Date.now() + maxWaitMs;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, maxWaitMs);
    const onOuterAbort = () => controller.abort();
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', onOuterAbort, { once: true });

    const cleanup = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', onOuterAbort);
    };

    try {
      const started = await firecrawlJson<{ success?: boolean; id?: string }>({
        method: 'POST',
        path: '/agent',
        body: {
          prompt,
          ...(schema ? { schema } : {}),
          effort: effortFor(level),
          maxCredits: maxCredits(),
        },
        signal: controller.signal,
      });

      const jobId = started.id;
      if (!jobId) throw new Error('Firecrawl Agent did not return a job id');

      let latestStatus: AgentStatusResponse | undefined;
      let terminalOutcome: string | undefined;
      let terminalError: AgentTraceError | null | undefined;
      const seen = new Set<string>();
      let finished = false;
      let quietPolls = 0;

      while (true) {
        if (controller.signal.aborted || Date.now() >= deadline) break;

        let trace: AgentTraceResponse | undefined;
        try {
          [latestStatus, trace] = await Promise.all([
            firecrawlJson<AgentStatusResponse>({
              method: 'GET',
              path: `/agent/${jobId}`,
              signal: controller.signal,
            }),
            fetchTrace(jobId, controller.signal),
          ]);
        } catch (err) {
          if (controller.signal.aborted) break;
          throw err;
        }

        const newEvents = consumeTrace(trace?.events ?? [], seen, onEvent);

        const wasFinished = finished;
        if (!finished) {
          const status = latestStatus?.status ?? 'processing';
          finished = status !== 'processing';
          if (finished) {
            const runFinished = (trace?.events ?? []).find(
              (event): event is AgentTraceRunFinished =>
                event.type === 'run.finished' && event.outcome !== undefined,
            );
            terminalOutcome = runFinished?.outcome;
            terminalError = runFinished?.error ?? undefined;
          }
        }
        if (finished) {
          quietPolls = newEvents > 0 ? 0 : quietPolls + 1;
          if (quietPolls >= QUIET_POLLS_AFTER_FINISH) break;
        } else if (wasFinished === false && newEvents === 0 && quietPolls === 0) {
          // still processing — keep polling
        }

        await new Promise<void>((resolve, reject) => {
          const onAbort = () => {
            clearTimeout(timerId);
            reject(new DOMException('Aborted', 'AbortError'));
          };
          const timerId = setTimeout(() => {
            controller.signal.removeEventListener('abort', onAbort);
            resolve();
          }, POLL_INTERVAL_MS);
          controller.signal.addEventListener('abort', onAbort, { once: true });
        }).catch(() => {});
      }

      const creditsUsed = latestStatus?.creditsUsed ?? 0;

      if (controller.signal.aborted || Date.now() >= deadline) {
        cancelJob(jobId);
        const records = latestStatus
          ? extractRecords(latestStatus.data ?? latestStatus.partial)
          : [];
        return {
          ...(records.length ? { records } : {}),
          usage: { credits: creditsUsed },
          stopReason: timedOut ? 'timeout' : 'aborted',
        };
      }

      const status = latestStatus?.status ?? 'processing';
      const outcome = terminalOutcome ?? (status === 'completed' ? 'succeeded' : status);

      if (outcome === 'succeeded' || status === 'completed') {
        return {
          records: extractRecords(latestStatus?.data),
          usage: { credits: creditsUsed },
          stopReason: outcome,
        };
      }

      if (outcome === 'credit_limit_reached' && latestStatus?.partial != null) {
        // Partial data is a completed call for our purposes: report it, don't throw.
        return {
          records: extractRecords(latestStatus.partial),
          usage: { credits: creditsUsed },
          stopReason: outcome,
        };
      }

      throw new Error(
        `Firecrawl Agent failed: ${errorText(terminalError, latestStatus?.error ?? latestStatus?.message)}`,
      );
    } finally {
      cleanup();
    }
  },
};
