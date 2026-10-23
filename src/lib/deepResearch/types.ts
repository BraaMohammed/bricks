import type { DataRow } from '@/stores/useDataStore';

export interface OutputSchemaField {
  name: string;
  description: string;
}

export interface OutputSchema {
  fields: OutputSchemaField[];
  identityColumns: string[];
  sampleRows: Record<string, string>[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type DeepResearchChatReply =
  | { kind: 'clarification'; text: string }
  | { kind: 'output_schema_proposal'; text: string; outputSchema: OutputSchema };

export interface ChatResponseBody {
  runId: string;
  reply: DeepResearchChatReply;
}

export interface ResearchSourceRef {
  agentId: string;
  sourceName: string;
}

export interface CoverageReviewState {
  decision: string;
  reason: string;
  reSpinNumber: number;
}

export type DeepResearchEvent =
  | { event: 'deep_research_started'; runId: string; sources: ResearchSourceRef[] }
  | { event: 'orchestrator_token_delta'; text: string }
  | { event: 'search_sub_agent_started'; agentId: string; sourceName: string }
  | { event: 'search_sub_agent_token_delta'; agentId: string; text: string }
  | { event: 'search_sub_agent_tool_call'; agentId: string; toolName: string; toolInput: unknown }
  | { event: 'search_sub_agent_finished'; agentId: string; recordsFound: number; summary: string }
  | { event: 'search_sub_agent_failed'; agentId: string; error: string }
  | { event: 'coverage_review_completed'; decision: string; reason: string; reSpinNumber: number }
  | { event: 'table_records_ready'; records: DataRow[] }
  | { event: 'deep_research_completed'; totalRecords: number }
  | { event: 'deep_research_failed'; error: string };

export interface DeepResearchRun {
  id: string;
  goal: string;
  status: string;
  outputSchema: OutputSchema;
  messages: ChatMessage[];
  records: DataRow[];
}

export interface DeepResearchRunResponse {
  run: DeepResearchRun;
}
