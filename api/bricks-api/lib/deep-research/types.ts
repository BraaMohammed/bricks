/**
 * Shared types for the AI Deep Researcher backend.
 * Vocabulary: see CONTEXT.md. Decisions: see docs/adr/.
 */

export type RunStatus =
  | 'clarifying'
  | 'schema_proposed'
  | 'researching'
  | 'completed'
  | 'failed';

export interface OutputSchemaField {
  name: string;
  description: string;
}

/** The per-run, user-approved definition of the table's fields (CONTEXT.md). */
export interface OutputSchema {
  fields: OutputSchemaField[];
  /** Field names that identify a record; the Table Builder deduplicates on them. */
  identityColumns: string[];
  /** Three illustrative, clearly-fake rows shown before the run. */
  sampleRows: ResearchRecord[];
}

/** One row of the resulting table; keys are exactly the OutputSchema field names. */
export type ResearchRecord = Record<string, string>;

export interface ResearchSource {
  id: string;
  name: string;
  description: string;
  /** Whether this source can run with the current environment (API keys etc.). */
  isAvailable: () => boolean;
  /** Per-source instructions given to that source's Search Sub-Agent. */
  instructions: (goal: string, outputSchema: OutputSchema) => string;
}

export interface DeepResearchRun {
  id: string;
  goal: string;
  status: RunStatus;
  outputSchema: OutputSchema | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeepResearchMessage {
  id: string;
  runId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface DeepResearchRecordRow {
  id: string;
  runId: string;
  data: ResearchRecord;
  createdAt: string;
}

export interface ChatRequest {
  runId?: string | null;
  messages: { role: 'user' | 'assistant'; content: string }[];
}

export type ChatReply =
  | { kind: 'clarification'; text: string }
  | { kind: 'output_schema_proposal'; text: string; outputSchema: OutputSchema };

export interface ChatResponse {
  runId: string;
  reply: ChatReply;
}

/** Backwards-compatible alias used by the orchestrator. */
export type DeepResearchChatReply = ChatReply;

export interface RunRequest {
  runId: string;
  outputSchema: OutputSchema;
  targetCount?: number;
}

export interface RunDetailResponse {
  run: {
    id: string;
    goal: string;
    status: RunStatus;
    outputSchema: OutputSchema | null;
    messages: DeepResearchMessage[];
    records: ResearchRecord[];
  };
}

/** Every event streamed by POST /api/deep-research/run. */
export type DeepResearchEvent =
  | {
      event: 'deep_research_started';
      runId: string;
      sources: { agentId: string; sourceName: string }[];
    }
  | { event: 'orchestrator_token_delta'; text: string }
  | { event: 'search_sub_agent_started'; agentId: string; sourceName: string }
  | { event: 'search_sub_agent_token_delta'; agentId: string; text: string }
  | {
      event: 'search_sub_agent_tool_call';
      agentId: string;
      toolName: string;
      toolInput: unknown;
    }
  | {
      event: 'search_sub_agent_finished';
      agentId: string;
      recordsFound: number;
      summary: string;
    }
  | { event: 'search_sub_agent_failed'; agentId: string; error: string }
  | {
      event: 'coverage_review_completed';
      decision: 'sufficient' | 'research_more';
      reason: string;
      reSpinNumber: number;
    }
  | { event: 'table_records_ready'; records: ResearchRecord[] }
  | { event: 'deep_research_completed'; totalRecords: number }
  | { event: 'deep_research_failed'; error: string };
