/**
 * repository.ts
 *
 * Persistence for Deep Research Runs, their messages and their Records.
 * Postgres dialect only; the same Drizzle schema runs on PGlite locally and
 * Supabase in production (docs/adr/0002-local-postgres-pglite-drizzle.md).
 */

import { asc, eq } from 'drizzle-orm';
import { getDbClient } from '../db/client';
import {
  deepResearchRecords,
  deepResearchRuns,
  deepResearchRunMessages,
} from '../db/schema';
import type { OutputSchema, ResearchRecord } from './types';

export type RunStatus =
  | 'clarifying'
  | 'schema_proposed'
  | 'researching'
  | 'completed'
  | 'failed';

export interface StoredRun {
  id: string;
  goal: string;
  status: RunStatus;
  outputSchema: OutputSchema | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoredMessage {
  role: string;
  content: string;
}

function toStoredRun(row: typeof deepResearchRuns.$inferSelect): StoredRun {
  return {
    id: row.id,
    goal: row.goal,
    status: row.status as RunStatus,
    outputSchema: (row.outputSchema as OutputSchema | null) ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function createRun(goal: string): Promise<StoredRun> {
  const { db } = await getDbClient();
  const [row] = await db
    .insert(deepResearchRuns)
    .values({ goal, status: 'clarifying' })
    .returning();
  return toStoredRun(row);
}

export async function getRun(id: string): Promise<StoredRun | null> {
  const { db } = await getDbClient();
  const rows = await db
    .select()
    .from(deepResearchRuns)
    .where(eq(deepResearchRuns.id, id))
    .limit(1);
  return rows[0] ? toStoredRun(rows[0]) : null;
}

export async function updateRun(
  id: string,
  patch: {
    goal?: string;
    status?: RunStatus;
    outputSchema?: OutputSchema | null;
  },
): Promise<void> {
  const { db } = await getDbClient();
  await db
    .update(deepResearchRuns)
    .set({
      ...(patch.goal !== undefined ? { goal: patch.goal } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.outputSchema !== undefined
        ? { outputSchema: patch.outputSchema }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(deepResearchRuns.id, id));
}

/**
 * Replaces the run's message history with the caller-supplied conversation.
 * The chat route receives the full history on every turn, so replacing keeps
 * persisted messages duplicate-free and ordered.
 */
export async function replaceRunMessages(
  runId: string,
  messages: StoredMessage[],
): Promise<void> {
  const { db } = await getDbClient();
  await db.transaction(async (tx) => {
    await tx
      .delete(deepResearchRunMessages)
      .where(eq(deepResearchRunMessages.runId, runId));
    if (messages.length === 0) return;
    await tx.insert(deepResearchRunMessages).values(
      messages.map((message) => ({
        runId,
        role: message.role,
        content: message.content,
      })),
    );
  });
}

export async function appendRunMessage(
  runId: string,
  message: StoredMessage,
): Promise<void> {
  const { db } = await getDbClient();
  await db.insert(deepResearchRunMessages).values({
    runId,
    role: message.role,
    content: message.content,
  });
}

export async function getRunMessages(runId: string): Promise<StoredMessage[]> {
  const { db } = await getDbClient();
  const rows = await db
    .select({
      role: deepResearchRunMessages.role,
      content: deepResearchRunMessages.content,
    })
    .from(deepResearchRunMessages)
    .where(eq(deepResearchRunMessages.runId, runId))
    .orderBy(asc(deepResearchRunMessages.createdAt), asc(deepResearchRunMessages.id));
  return rows;
}

/** Replaces the run's Records with the final table (idempotent). */
export async function replaceRunRecords(
  runId: string,
  records: ResearchRecord[],
): Promise<void> {
  const { db } = await getDbClient();
  await db.transaction(async (tx) => {
    await tx
      .delete(deepResearchRecords)
      .where(eq(deepResearchRecords.runId, runId));
    if (records.length === 0) return;
    await tx
      .insert(deepResearchRecords)
      .values(records.map((data) => ({ runId, data })));
  });
}

export async function getRunRecords(runId: string): Promise<ResearchRecord[]> {
  const { db } = await getDbClient();
  const rows = await db
    .select({ data: deepResearchRecords.data })
    .from(deepResearchRecords)
    .where(eq(deepResearchRecords.runId, runId))
    .orderBy(asc(deepResearchRecords.createdAt), asc(deepResearchRecords.id));
  return rows.map((row) => row.data as ResearchRecord);
}
