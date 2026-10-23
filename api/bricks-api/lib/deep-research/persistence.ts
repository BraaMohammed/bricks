/**
 * persistence.ts
 *
 * Durable storage for Deep Research Runs, their messages and their Records.
 * Uses the shared PGlite + Drizzle client (no extra connections) and stays on
 * the Postgres dialect so the same statements run on Supabase
 * (docs/adr/0002-local-postgres-pglite-drizzle.md).
 */

import { asc, eq } from 'drizzle-orm';
import { getDbClient } from '../db/client';
import {
  deepResearchRecords,
  deepResearchRuns,
  deepResearchRunMessages,
} from '../db/schema';
import type {
  DeepResearchMessage,
  DeepResearchRun,
  OutputSchema,
  ResearchRecord,
  RunStatus,
} from './types';

type RunRow = typeof deepResearchRuns.$inferSelect;
type MessageRow = typeof deepResearchRunMessages.$inferSelect;
type RecordRow = typeof deepResearchRecords.$inferSelect;

/** Keeps a single INSERT well below Postgres's bind-parameter limit. */
const RECORD_INSERT_CHUNK_SIZE = 500;

function toDeepResearchRun(row: RunRow): DeepResearchRun {
  return {
    id: row.id,
    goal: row.goal,
    status: row.status as RunStatus,
    outputSchema: (row.outputSchema as OutputSchema | null) ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toDeepResearchMessage(row: MessageRow): DeepResearchMessage {
  return {
    id: row.id,
    runId: row.runId,
    role: row.role as DeepResearchMessage['role'],
    content: row.content,
    createdAt: row.createdAt.toISOString(),
  };
}

function toResearchRecord(row: RecordRow): ResearchRecord {
  return row.data as ResearchRecord;
}

export async function createDeepResearchRun(
  goal: string,
): Promise<DeepResearchRun> {
  const { db } = await getDbClient();
  const [row] = await db
    .insert(deepResearchRuns)
    .values({ goal, status: 'clarifying' })
    .returning();
  return toDeepResearchRun(row);
}

export async function getDeepResearchRun(id: string): Promise<{
  run: DeepResearchRun;
  messages: DeepResearchMessage[];
  records: ResearchRecord[];
} | null> {
  const { db } = await getDbClient();
  const runRows = await db
    .select()
    .from(deepResearchRuns)
    .where(eq(deepResearchRuns.id, id))
    .limit(1);

  const runRow = runRows[0];
  if (!runRow) return null;

  const [messageRows, recordRows] = await Promise.all([
    db
      .select()
      .from(deepResearchRunMessages)
      .where(eq(deepResearchRunMessages.runId, id))
      .orderBy(
        asc(deepResearchRunMessages.createdAt),
        asc(deepResearchRunMessages.id),
      ),
    db
      .select()
      .from(deepResearchRecords)
      .where(eq(deepResearchRecords.runId, id))
      .orderBy(asc(deepResearchRecords.createdAt), asc(deepResearchRecords.id)),
  ]);

  return {
    run: toDeepResearchRun(runRow),
    messages: messageRows.map(toDeepResearchMessage),
    records: recordRows.map(toResearchRecord),
  };
}

export async function appendDeepResearchMessage(
  runId: string,
  role: 'user' | 'assistant',
  content: string,
): Promise<void> {
  const { db } = await getDbClient();
  await db.insert(deepResearchRunMessages).values({ runId, role, content });
}

export async function updateDeepResearchRunStatus(
  runId: string,
  status: RunStatus,
): Promise<void> {
  const { db } = await getDbClient();
  await db
    .update(deepResearchRuns)
    .set({ status, updatedAt: new Date() })
    .where(eq(deepResearchRuns.id, runId));
}

export async function saveDeepResearchOutputSchema(
  runId: string,
  outputSchema: OutputSchema,
): Promise<void> {
  const { db } = await getDbClient();
  await db
    .update(deepResearchRuns)
    .set({ outputSchema, updatedAt: new Date() })
    .where(eq(deepResearchRuns.id, runId));
}

export async function insertDeepResearchRecords(
  runId: string,
  records: ResearchRecord[],
): Promise<number> {
  if (records.length === 0) return 0;

  const { db } = await getDbClient();
  let inserted = 0;

  for (
    let start = 0;
    start < records.length;
    start += RECORD_INSERT_CHUNK_SIZE
  ) {
    const chunk = records.slice(start, start + RECORD_INSERT_CHUNK_SIZE);
    const rows = await db
      .insert(deepResearchRecords)
      .values(chunk.map((data) => ({ runId, data })))
      .returning({ id: deepResearchRecords.id });
    inserted += rows.length;
  }

  return inserted;
}

export async function getDeepResearchRecords(
  runId: string,
): Promise<ResearchRecord[]> {
  const { db } = await getDbClient();
  const rows = await db
    .select()
    .from(deepResearchRecords)
    .where(eq(deepResearchRecords.runId, runId))
    .orderBy(asc(deepResearchRecords.createdAt), asc(deepResearchRecords.id));
  return rows.map(toResearchRecord);
}
