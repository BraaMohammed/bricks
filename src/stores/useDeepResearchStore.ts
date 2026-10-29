import { create } from 'zustand';
import { useDataStore, type DataRow } from '@/stores/useDataStore';
import { deepResearchUrl } from '@/lib/deepResearch/backendUrl';
import type {
  ChatMessage,
  ChatResponseBody,
  CoverageReviewState,
  DeepResearchEvent,
  OutputSchema,
} from '@/lib/deepResearch/types';

export type DeepResearchPhase =
  | 'idle'
  | 'clarifying'
  | 'schema_review'
  | 'researching'
  | 'results_review'
  | 'failed';

export type AgentRunStatus = 'running' | 'finished' | 'failed';

export interface AgentStatus {
  sourceName: string;
  status: AgentRunStatus;
  recordsFound: number;
  error?: string;
}

export type TranscriptItem =
  | { type: 'token'; agentId: string; text: string }
  | { type: 'tool_call'; agentId: string; toolName: string; toolInput: unknown }
  | { type: 'status'; agentId: string; text: string };

export const ORCHESTRATOR_AGENT_ID = 'orchestrator';

export const DEEP_RESEARCH_MODEL_STORAGE_KEY = 'deep_research_model';
export const DEFAULT_DEEP_RESEARCH_MODEL = 'deepseek-v4.1-flash';

const readStoredModel = (): string => {
  try {
    const stored = localStorage.getItem(DEEP_RESEARCH_MODEL_STORAGE_KEY);
    return stored && stored.trim() ? stored.trim() : DEFAULT_DEEP_RESEARCH_MODEL;
  } catch {
    return DEFAULT_DEEP_RESEARCH_MODEL;
  }
};

export interface DeepResearchState {
  phase: DeepResearchPhase;
  runId: string | null;
  messages: ChatMessage[];
  outputSchema: OutputSchema | null;
  agentStatuses: Record<string, AgentStatus>;
  transcript: TranscriptItem[];
  records: DataRow[];
  totalRecords: number | null;
  coverageReview: CoverageReviewState | null;
  error: string | null;
  isSendingChat: boolean;
  model: string;
}

export interface DeepResearchActions {
  setModel: (model: string) => void;
  sendClarificationMessage: (content: string) => Promise<void>;
  approveOutputSchema: () => boolean;
  editOutputSchema: (updater: (schema: OutputSchema) => OutputSchema) => void;
  addOutputSchemaField: () => void;
  removeOutputSchemaField: (name: string) => void;
  renameOutputSchemaField: (oldName: string, newName: string) => string;
  setOutputSchemaFieldDescription: (name: string, description: string) => void;
  toggleIdentityColumn: (name: string) => void;
  startRun: () => boolean;
  stopRun: () => void;
  resetRun: () => void;
  continueChatting: () => void;
  reviewResults: () => void;
  pushToEnrichment: () => boolean;
  applyEvent: (event: DeepResearchEvent) => void;
}

let activeAbortController: AbortController | null = null;

export function setDeepResearchAbortController(controller: AbortController | null) {
  activeAbortController = controller;
}

const initialState: DeepResearchState = {
  phase: 'idle',
  runId: null,
  messages: [],
  outputSchema: null,
  agentStatuses: {},
  transcript: [],
  records: [],
  totalRecords: null,
  coverageReview: null,
  error: null,
  isSendingChat: false,
  model: readStoredModel(),
};

const normalizeOutputSchema = (schema: OutputSchema | null | undefined): OutputSchema => {
  const fields = (schema?.fields ?? [])
    .filter((field) => field && typeof field.name === 'string')
    .map((field) => ({
      name: field.name,
      description: typeof field.description === 'string' ? field.description : '',
    }));
  const fieldNames = new Set(fields.map((field) => field.name));
  const identityColumns = (schema?.identityColumns ?? []).filter((name) =>
    fieldNames.has(name)
  );
  const sampleRows = (schema?.sampleRows ?? [])
    .filter((row) => row && typeof row === 'object')
    .map((row) => {
      const normalized: Record<string, string> = {};
      for (const [key, value] of Object.entries(row)) {
        normalized[key] = value === null || value === undefined ? '' : String(value);
      }
      return normalized;
    });
  return { fields, identityColumns, sampleRows };
};

export function validateOutputSchema(schema: OutputSchema | null): string | null {
  if (!schema || schema.fields.length === 0) {
    return 'The Output Schema needs at least one field.';
  }
  const names = schema.fields.map((field) => field.name.trim());
  if (names.some((name) => name.length === 0)) {
    return 'Every Output Schema field needs a name.';
  }
  const seen = new Set<string>();
  for (const name of names) {
    const key = name.toLowerCase();
    if (seen.has(key)) {
      return `"${name}" is used twice. Field names must be unique.`;
    }
    seen.add(key);
  }
  return null;
}

const appendTokenDelta = (
  transcript: TranscriptItem[],
  agentId: string,
  text: string
): TranscriptItem[] => {
  const last = transcript[transcript.length - 1];
  if (last && last.type === 'token' && last.agentId === agentId) {
    return [...transcript.slice(0, -1), { type: 'token', agentId, text: last.text + text }];
  }
  return [...transcript, { type: 'token', agentId, text }];
};

const appendStatusItem = (
  transcript: TranscriptItem[],
  agentId: string,
  text: string
): TranscriptItem[] => [...transcript, { type: 'status', agentId, text }];

const normalizeRecords = (
  incoming: DataRow[] | undefined,
  schema: OutputSchema | null
): DataRow[] => {
  if (!Array.isArray(incoming)) return [];
  const fieldNames = schema?.fields.map((field) => field.name) ?? [];
  const records: DataRow[] = [];

  for (const record of incoming) {
    if (!record || typeof record !== 'object') continue;
    const keys = fieldNames.length > 0 ? fieldNames : Object.keys(record);
    const normalized: DataRow = {};
    for (const key of keys) {
      const value = record[key];
      normalized[key] = value === null || value === undefined ? '' : String(value);
    }
    records.push(normalized);
  }
  return records;
};

const mergeRecords = (
  existing: DataRow[],
  incoming: DataRow[],
  schema: OutputSchema | null
): DataRow[] => {
  if (incoming.length === 0) return existing;
  const fieldNames = schema?.fields.map((field) => field.name) ?? [];
  const identityKeys = (schema?.identityColumns ?? []).filter(
    (name) => fieldNames.length === 0 || fieldNames.includes(name)
  );

  const recordKey = (record: DataRow): string => {
    if (identityKeys.length > 0) {
      const values = identityKeys.map((key) => (record[key] ?? '').trim().toLowerCase());
      if (values.every((value) => value.length > 0)) {
        return `identity:${values.join('\u0000')}`;
      }
    }
    const keys = fieldNames.length > 0 ? fieldNames : Object.keys(record);
    return `row:${JSON.stringify(keys.map((key) => record[key] ?? ''))}`;
  };

  const merged = [...existing];
  const keyToIndex = new Map<string, number>();
  merged.forEach((record, index) => keyToIndex.set(recordKey(record), index));

  for (const record of incoming) {
    const key = recordKey(record);
    const existingIndex = keyToIndex.get(key);
    if (existingIndex === undefined) {
      keyToIndex.set(key, merged.length);
      merged.push(record);
    } else {
      merged[existingIndex] = { ...merged[existingIndex], ...record };
    }
  }
  return merged;
};

export const useDeepResearchStore = create<DeepResearchState & DeepResearchActions>()(
  (set, get) => ({
    ...initialState,

    setModel: (model) => {
      set({ model });
      try {
        localStorage.setItem(DEEP_RESEARCH_MODEL_STORAGE_KEY, model);
      } catch {
        return;
      }
    },

    sendClarificationMessage: async (content) => {
      const trimmed = content.trim();
      if (!trimmed) return;
      const { isSendingChat, phase, runId, messages, model } = get();
      if (isSendingChat || phase === 'researching') return;

      const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
      set({
        messages: nextMessages,
        isSendingChat: true,
        error: null,
        phase: phase === 'idle' ? 'clarifying' : phase,
      });

      try {
        const response = await fetch(deepResearchUrl('/chat'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ runId, messages: nextMessages, model }),
        });
        if (!response.ok) {
          throw new Error(`The Orchestrator chat request failed (${response.status}).`);
        }
        const data = (await response.json()) as ChatResponseBody;
        if (!data || !data.reply) {
          throw new Error('The Orchestrator returned an empty reply.');
        }

        const nextRunId = data.runId ?? runId;
        const replyText = data.reply.text ?? '';
        const assistantMessage: ChatMessage = { role: 'assistant', content: replyText };
        const nextState: Partial<DeepResearchState> = {
          runId: nextRunId,
          messages: [...nextMessages, assistantMessage],
          isSendingChat: false,
          error: null,
        };

        if (data.reply.kind === 'output_schema_proposal' && data.reply.outputSchema) {
          nextState.outputSchema = normalizeOutputSchema(data.reply.outputSchema);
          nextState.phase = 'schema_review';
        } else {
          nextState.phase = get().outputSchema ? 'schema_review' : 'clarifying';
        }
        set(nextState);
      } catch (err) {
        set({
          isSendingChat: false,
          error:
            err instanceof Error
              ? err.message
              : 'Failed to reach the AI Deep Researcher backend.',
        });
      }
    },

    approveOutputSchema: () => {
      const { outputSchema } = get();
      const problem = validateOutputSchema(outputSchema);
      if (problem) {
        set({ phase: 'schema_review', error: problem });
        return false;
      }
      set({ error: null });
      return true;
    },

    editOutputSchema: (updater) => {
      const { outputSchema } = get();
      if (!outputSchema) return;
      set({ outputSchema: updater(outputSchema) });
    },

    addOutputSchemaField: () => {
      const { outputSchema } = get();
      if (!outputSchema) return;
      const taken = new Set(outputSchema.fields.map((field) => field.name.toLowerCase()));
      let index = outputSchema.fields.length + 1;
      while (taken.has(`field ${index}`)) index += 1;
      const name = `Field ${index}`;
      set({
        outputSchema: {
          ...outputSchema,
          fields: [...outputSchema.fields, { name, description: '' }],
          sampleRows: outputSchema.sampleRows.map((row) => ({ ...row, [name]: '' })),
        },
      });
    },

    removeOutputSchemaField: (name) => {
      const { outputSchema } = get();
      if (!outputSchema) return;
      set({
        outputSchema: {
          fields: outputSchema.fields.filter((field) => field.name !== name),
          identityColumns: outputSchema.identityColumns.filter((column) => column !== name),
          sampleRows: outputSchema.sampleRows.map((row) => {
            const { [name]: _removed, ...rest } = row;
            return rest;
          }),
        },
      });
    },

    renameOutputSchemaField: (oldName, newName) => {
      const { outputSchema } = get();
      if (!outputSchema) return oldName;
      const trimmed = newName.trim();
      if (!trimmed || trimmed === oldName) return oldName;
      const isDuplicate = outputSchema.fields.some(
        (field) =>
          field.name !== oldName && field.name.toLowerCase() === trimmed.toLowerCase()
      );
      if (isDuplicate) return oldName;
      set({
        outputSchema: {
          fields: outputSchema.fields.map((field) =>
            field.name === oldName ? { ...field, name: trimmed } : field
          ),
          identityColumns: outputSchema.identityColumns.map((column) =>
            column === oldName ? trimmed : column
          ),
          sampleRows: outputSchema.sampleRows.map((row) => {
            const { [oldName]: value, ...rest } = row;
            return { ...rest, [trimmed]: value ?? '' };
          }),
        },
      });
      return trimmed;
    },

    setOutputSchemaFieldDescription: (name, description) => {
      get().editOutputSchema((schema) => ({
        ...schema,
        fields: schema.fields.map((field) =>
          field.name === name ? { ...field, description } : field
        ),
      }));
    },

    toggleIdentityColumn: (name) => {
      get().editOutputSchema((schema) => ({
        ...schema,
        identityColumns: schema.identityColumns.includes(name)
          ? schema.identityColumns.filter((column) => column !== name)
          : [...schema.identityColumns, name],
      }));
    },

    startRun: () => {
      const { outputSchema, runId } = get();
      if (!runId) {
        set({ error: 'The Deep Research Run has no run id yet. Send a goal first.' });
        return false;
      }
      if (!get().approveOutputSchema()) return false;
      set({
        phase: 'researching',
        agentStatuses: {},
        transcript: [],
        records: [],
        totalRecords: null,
        coverageReview: null,
        error: null,
      });
      return true;
    },

    stopRun: () => {
      const controller = activeAbortController;
      activeAbortController = null;
      if (controller) controller.abort();

      const { phase, records, outputSchema, transcript } = get();
      if (phase !== 'researching') return;
      set({
        phase:
          records.length > 0 ? 'results_review' : outputSchema ? 'schema_review' : 'clarifying',
        transcript: appendStatusItem(
          transcript,
          ORCHESTRATOR_AGENT_ID,
          'Deep Research Run stopped by the user.'
        ),
      });
    },

    resetRun: () => {
      const controller = activeAbortController;
      activeAbortController = null;
      if (controller) controller.abort();
      set({ ...initialState, model: get().model });
    },

    continueChatting: () => {
      const { outputSchema } = get();
      set({ phase: outputSchema ? 'schema_review' : 'clarifying', error: null });
    },

    reviewResults: () => {
      if (get().records.length === 0) return;
      set({ phase: 'results_review', error: null });
    },

    pushToEnrichment: () => {
      const { outputSchema, records } = get();
      if (!outputSchema || records.length === 0) return false;
      const headers = outputSchema.fields.map((field) => field.name);
      if (headers.length === 0) return false;
      const rows: DataRow[] = records.map((record) => {
        const row: DataRow = {};
        for (const header of headers) {
          row[header] = record[header] ?? '';
        }
        return row;
      });
      useDataStore.getState().setData(headers, rows);
      return true;
    },

    applyEvent: (event) => {
      switch (event.event) {
        case 'deep_research_started': {
          const agentStatuses: Record<string, AgentStatus> = {};
          for (const source of event.sources ?? []) {
            agentStatuses[source.agentId] = {
              sourceName: source.sourceName,
              status: 'running',
              recordsFound: 0,
            };
          }
          const sourceCount = Object.keys(agentStatuses).length;
          set({
            phase: 'researching',
            runId: event.runId ?? get().runId,
            agentStatuses,
            transcript: appendStatusItem(
              get().transcript,
              ORCHESTRATOR_AGENT_ID,
              `Deep Research Run started — ${sourceCount} Research Source${
                sourceCount === 1 ? '' : 's'
              } assigned.`
            ),
          });
          break;
        }

        case 'orchestrator_token_delta': {
          if (event.text) {
            set({
              transcript: appendTokenDelta(
                get().transcript,
                ORCHESTRATOR_AGENT_ID,
                event.text
              ),
            });
          }
          break;
        }

        case 'search_sub_agent_started': {
          set({
            agentStatuses: {
              ...get().agentStatuses,
              [event.agentId]: {
                sourceName: event.sourceName,
                status: 'running',
                recordsFound: 0,
              },
            },
            transcript: appendStatusItem(
              get().transcript,
              event.agentId,
              `Searching ${event.sourceName}.`
            ),
          });
          break;
        }

        case 'search_sub_agent_token_delta': {
          if (event.text) {
            set({
              transcript: appendTokenDelta(get().transcript, event.agentId, event.text),
            });
          }
          break;
        }

        case 'search_sub_agent_tool_call': {
          set({
            transcript: [
              ...get().transcript,
              {
                type: 'tool_call',
                agentId: event.agentId,
                toolName: event.toolName,
                toolInput: event.toolInput,
              },
            ],
          });
          break;
        }

        case 'search_sub_agent_finished': {
          const { agentStatuses } = get();
          const current = agentStatuses[event.agentId];
          const recordsFound =
            typeof event.recordsFound === 'number'
              ? event.recordsFound
              : current?.recordsFound ?? 0;
          set({
            agentStatuses: {
              ...agentStatuses,
              [event.agentId]: {
                sourceName: current?.sourceName ?? `Search Sub-Agent ${event.agentId}`,
                status: 'finished',
                recordsFound,
              },
            },
            transcript: appendStatusItem(
              get().transcript,
              event.agentId,
              `Finished — ${recordsFound} record${recordsFound === 1 ? '' : 's'} found${
                event.summary ? ` — ${event.summary}` : ''
              }.`
            ),
          });
          break;
        }

        case 'search_sub_agent_failed': {
          const { agentStatuses } = get();
          const current = agentStatuses[event.agentId];
          set({
            agentStatuses: {
              ...agentStatuses,
              [event.agentId]: {
                sourceName: current?.sourceName ?? `Search Sub-Agent ${event.agentId}`,
                status: 'failed',
                recordsFound: current?.recordsFound ?? 0,
                error: event.error,
              },
            },
            transcript: appendStatusItem(
              get().transcript,
              event.agentId,
              `Failed — ${event.error}`
            ),
          });
          break;
        }

        case 'coverage_review_completed': {
          set({
            coverageReview: {
              decision: event.decision,
              reason: event.reason,
              reSpinNumber: event.reSpinNumber,
            },
            transcript: appendStatusItem(
              get().transcript,
              ORCHESTRATOR_AGENT_ID,
              `Coverage Reviewer — ${event.decision.replace(/_/g, ' ')}${
                event.reason ? `: ${event.reason}` : ''
              } (round ${(Number.isFinite(event.reSpinNumber) ? event.reSpinNumber : 0) + 1})`
            ),
          });
          break;
        }

        case 'table_records_ready': {
          const { records, outputSchema } = get();
          const normalized = normalizeRecords(event.records, outputSchema);
          set({ records: mergeRecords(records, normalized, outputSchema) });
          break;
        }

        case 'deep_research_completed': {
          const totalRecords =
            typeof event.totalRecords === 'number'
              ? event.totalRecords
              : get().records.length;
          set({
            phase: 'results_review',
            totalRecords,
            transcript: appendStatusItem(
              get().transcript,
              ORCHESTRATOR_AGENT_ID,
              `Deep Research Run completed — ${totalRecords} record${
                totalRecords === 1 ? '' : 's'
              }.`
            ),
          });
          break;
        }

        case 'deep_research_failed': {
          set({
            phase: 'failed',
            error: event.error ?? 'The Deep Research Run failed.',
            transcript: appendStatusItem(
              get().transcript,
              ORCHESTRATOR_AGENT_ID,
              `Deep Research Run failed — ${event.error ?? 'unknown error'}`
            ),
          });
          break;
        }
      }
    },
  })
);
