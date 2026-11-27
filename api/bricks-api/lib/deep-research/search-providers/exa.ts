/**
 * Exa Agent adapter — implements contract.ts.
 *
 * Agentic endpoint ONLY: POST https://api.exa.ai/agent/runs, consumed as
 * server-sent events (Accept: text/event-stream) until a terminal event.
 * Plain Exa /search endpoints are never used here (contract rule).
 *
 * Docs:
 *   https://exa.ai/docs/reference/agent-api-guide
 *   https://exa.ai/docs/reference/agent-api/create-a-run.md
 *   https://exa.ai/docs/reference/agent-api/list-run-events.md
 *
 * Event names are an open set (forward compatibility): documented lifecycle
 * events are agent_run.created / .started / .completed / .failed / .cancelled,
 * plus agent_run.source.added and tool-progress / search-trace events. Any
 * unrecognized event is ignored until a terminal event arrives.
 */

import type {
  ProviderLevel,
  SearchProviderAdapter,
  SearchProviderEvent,
  SearchProviderRunParams,
  SearchProviderResult,
} from './contract';

const AGENT_RUNS_URL = 'https://api.exa.ai/agent/runs';

/**
 * Fixed-effort pricing per the agent-api-guide "Effort" table. The guide gives
 * only qualitative runtime guidance ("fast, light research" … "slowest fixed
 * effort") — no concrete durations — so timeLabels are conservative estimates,
 * not documented numbers.
 */
const LEVELS: ProviderLevel[] = [
  { id: 'minimal', label: 'Minimal', priceLabel: '$0.012 / request', timeLabel: 'seconds' },
  { id: 'low', label: 'Low', priceLabel: '$0.025 / request', timeLabel: 'seconds – ~1 min' },
  { id: 'medium', label: 'Medium', priceLabel: '$0.10 / request', timeLabel: '~1–3 min' },
  { id: 'high', label: 'High', priceLabel: '$0.50 / request', timeLabel: '~3–10 min' },
  { id: 'xhigh', label: 'X-High', priceLabel: '$1.00 / request', timeLabel: '~10+ min' },
];

function maxCostDollars(): number {
  const raw = process.env.EXA_MAX_COST_DOLLARS;
  const parsed = raw !== undefined && raw !== '' ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 2;
}

function apiKey(): string {
  const key = process.env.EXA_API_KEY;
  if (!key) {
    throw new Error('Exa adapter is not configured: EXA_API_KEY is missing');
  }
  return key;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * Pulls records out of the run's `output.structured`:
 * - object with an array-valued property → that array
 * - already an array → the array itself
 * - anything else → wrapped in a single-element array
 */
function extractRecords(structured: unknown): Record<string, unknown>[] | undefined {
  if (structured === null || structured === undefined) return undefined;

  if (Array.isArray(structured)) {
    return structured.filter((item) => asRecord(item) !== null) as Record<
      string,
      unknown
    >[];
  }

  if (asRecord(structured)) {
    for (const value of Object.values(structured as Record<string, unknown>)) {
      if (Array.isArray(value)) {
        const records = value.filter(
          (item) => asRecord(item) !== null,
        ) as Record<string, unknown>[];
        if (records.length > 0) return records;
      }
    }
    return [structured as Record<string, unknown>];
  }

  return undefined;
}

// ── SSE frame parsing (self-contained, standard id/event/data + comments) ────

interface SseFrame {
  event: string;
  data: string;
}

function splitFrames(buffer: string): { frames: string[]; rest: string } {
  const frames: string[] = [];
  let rest = buffer;
  let separator = rest.indexOf('\n\n');
  while (separator !== -1) {
    frames.push(rest.slice(0, separator));
    rest = rest.slice(separator + 2);
    separator = rest.indexOf('\n\n');
  }
  return { frames, rest };
}

function parseFrame(frame: string): SseFrame | null {
  let event = 'message';
  const dataLines: string[] = [];
  for (const line of frame.split('\n')) {
    if (!line || line.startsWith(':')) continue; // keep-alive / comment
    if (line.startsWith('event:')) {
      event = line.slice('event:'.length).trim();
    } else if (line.startsWith('id:')) {
      // Frame IDs are irrelevant here: we consume the live stream in one pass.
      continue;
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice('data:'.length).trimStart());
    }
  }
  if (!dataLines.length) return null;
  return { event, data: dataLines.join('\n') };
}

// ── Live-event mapping ───────────────────────────────────────────────────────

function mapLiveEvent(eventName: string, data: unknown): SearchProviderEvent | null {
  const record = asRecord(data);

  if (eventName === 'agent_run.source.added' && record) {
    const title = typeof record.title === 'string' ? record.title : undefined;
    const url = typeof record.url === 'string' ? record.url : undefined;
    const source = title || url;
    if (source) return { kind: 'status', text: `Source: ${source}` };
    return null;
  }

  // Open event-name set: match tool-progress / search-trace style events.
  const name = eventName.toLowerCase();
  if (record && (name.includes('tool') || name.includes('search'))) {
    const toolName =
      typeof record.toolName === 'string'
        ? record.toolName
        : typeof record.tool === 'string'
          ? record.tool
          : eventName;
    const toolInput =
      record.toolInput ??
      record.input ??
      record.arguments ??
      (typeof record.query === 'string' ? { query: record.query } : undefined);

    if (toolInput !== undefined && toolInput !== null) {
      return { kind: 'tool_call', toolName, toolInput };
    }

    // Narration text without tool info streams as token deltas.
    const text =
      typeof record.text === 'string'
        ? record.text
        : typeof record.delta === 'string'
          ? record.delta
          : undefined;
    if (text) return { kind: 'token', text };

    return null;
  }

  return null;
}

// ── Adapter ──────────────────────────────────────────────────────────────────

export const exaSearchProvider: SearchProviderAdapter = {
  id: 'exa',
  label: 'Exa',
  levels: () => LEVELS,
  isConfigured: () => Boolean(process.env.EXA_API_KEY),
  statusPayload: () => ({
    id: 'exa',
    label: 'Exa',
    configured: Boolean(process.env.EXA_API_KEY),
    levels: LEVELS,
  }),

  async runSearch(params: SearchProviderRunParams): Promise<SearchProviderResult> {
    const key = apiKey();
    const effort = LEVELS.some((level) => level.id === params.level)
      ? params.level
      : 'medium';

    // budget.maxDurationSeconds is ultra-only — maxWaitMs is enforced here.
    const controller = new AbortController();
    let timedOut = false;
    let stopped = params.signal.aborted;
    const onCallerAbort = (): void => {
      stopped = true;
      controller.abort();
    };
    if (!stopped) params.signal.addEventListener('abort', onCallerAbort);
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, params.maxWaitMs);

    let runId: string | undefined;
    let terminal: SearchProviderResult | undefined;
    let failure: Error | undefined;
    let partialRecords: Record<string, unknown>[] | undefined;
    let partialText: string | undefined;

    const handleTerminal = (
      eventName: string,
      data: unknown,
    ): 'done' | 'failed' | 'cancelled' | 'continue' => {
      if (eventName === 'agent_run.completed') {
        const run = asRecord(data) ?? {};
        const output = asRecord(run.output) ?? {};
        const costDollars = asRecord(run.costDollars);
        const cost = typeof costDollars?.total === 'number' ? costDollars.total : undefined;
        partialRecords = extractRecords(output.structured) ?? partialRecords;
        partialText = typeof output.text === 'string' ? output.text : partialText;
        terminal = {
          records: partialRecords,
          text: partialText,
          usage: cost !== undefined ? { costUsd: cost } : undefined,
          stopReason: typeof run.stopReason === 'string' ? run.stopReason : undefined,
        };
        return 'done';
      }

      if (eventName === 'agent_run.failed') {
        const payload = asRecord(data) ?? {};
        const error = asRecord(payload.error) ?? {};
        const code = typeof error.code === 'string' ? error.code : '';
        const message = typeof error.message === 'string' ? error.message : '';
        failure = new Error(`Exa Agent failed: ${code} ${message}`.trimEnd());
        return 'failed';
      }

      if (eventName === 'agent_run.cancelled') {
        const run = asRecord(data) ?? {};
        partialRecords = extractRecords(run.output && asRecord(run.output)?.structured) ?? partialRecords;
        terminal = {
          records: partialRecords,
          text: partialText,
          stopReason: typeof run.stopReason === 'string' ? run.stopReason : 'cancelled',
        };
        return 'cancelled';
      }

      return 'continue';
    };

    try {
      const res = await fetch(AGENT_RUNS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          'x-api-key': key,
        },
        body: JSON.stringify({
          query: params.prompt,
          ...(params.schema ? { outputSchema: params.schema } : {}),
          effort,
          budget: { maxCostDollars: maxCostDollars() },
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const snippet = await res.text().catch(() => '');
        throw new Error(
          `Exa Agent create failed: HTTP ${res.status}: ${snippet.slice(0, 300)}`,
        );
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finished = false;

      const consumeFrame = (frame: string): void => {
        const parsed = parseFrame(frame);
        if (!parsed) return;
        const { event, data: raw } = parsed;

        if (event === 'agent_run.created' || event === 'agent_run.started') {
          const record = asRecord(JSON.parse(raw));
          if (event === 'agent_run.created' && typeof record?.id === 'string') {
            runId = record.id;
          }
          return;
        }

        let payload: unknown;
        try {
          payload = JSON.parse(raw);
        } catch {
          return;
        }

        const terminalState = handleTerminal(event, payload);
        if (terminalState !== 'continue') {
          finished = true;
          return;
        }

        const liveEvent = mapLiveEvent(event, payload);
        if (liveEvent) params.onEvent(liveEvent);
      };

      try {
        while (!finished) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!value) continue;

          buffer = (buffer + decoder.decode(value, { stream: true })).replace(
            /\r\n/g,
            '\n',
          );

          const { frames, rest } = splitFrames(buffer);
          buffer = rest;
          for (const frame of frames) {
            consumeFrame(frame);
            if (finished) break;
          }
        }

        if (!finished && buffer.trim()) consumeFrame(buffer);
      } finally {
        await reader.cancel().catch(() => {});
      }
    } catch (err) {
      // Our own timeout/stop aborts land here; real transport errors rethrow.
      if (!(timedOut || stopped)) throw err;
    } finally {
      clearTimeout(timer);
      params.signal.removeEventListener('abort', onCallerAbort);
    }

    if (failure) throw failure;
    if (terminal) return terminal;

    // Interrupted before a terminal event: fire-and-forget cancel, resolve
    // with whatever output accumulated so far.
    if (timedOut || stopped) {
      if (runId) {
        void fetch(`${AGENT_RUNS_URL}/${encodeURIComponent(runId)}/cancel`, {
          method: 'POST',
          headers: { 'x-api-key': key },
        }).catch(() => {});
      }
      return {
        records: partialRecords,
        text: partialText,
        stopReason: timedOut ? 'time_limit_reached' : 'stopped',
      };
    }

    throw new Error('Exa Agent stream ended without a terminal event');
  },
};
