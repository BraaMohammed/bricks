/**
 * schema.ts
 *
 * Drizzle schema for the Bricks backend.
 *
 * One Postgres schema runs unchanged against PGlite locally (drizzle-orm/pglite)
 * and Supabase in production (drizzle-orm/postgres-js); only the driver changes.
 * See docs/adr/0002-local-postgres-pglite-drizzle.md.
 */

import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const appMeta = pgTable('app_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ── AI Deep Researcher persistence ─────────────────────────────────────────────
//
// One Postgres schema runs unchanged against PGlite locally and Supabase in
// production (docs/adr/0002). Run status values: 'clarifying' |
// 'schema_proposed' | 'researching' | 'completed' | 'failed'.

export const deepResearchRuns = pgTable('deep_research_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  goal: text('goal').notNull(),
  status: text('status').notNull().default('clarifying'),
  outputSchema: jsonb('output_schema'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const deepResearchRunMessages = pgTable(
  'deep_research_run_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: uuid('run_id')
      .notNull()
      .references(() => deepResearchRuns.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
);

export const deepResearchRecords = pgTable('deep_research_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  runId: uuid('run_id')
    .notNull()
    .references(() => deepResearchRuns.id, { onDelete: 'cascade' }),
  data: jsonb('data').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
