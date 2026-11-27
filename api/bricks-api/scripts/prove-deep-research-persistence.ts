/**
 * prove-deep-research-persistence.ts
 *
 * Round-trips a Deep Research Run through lib/deep-research/persistence.ts and
 * prints the public tables plus the stored run, messages and records.
 *
 * Run with: npx --yes tsx scripts/prove-deep-research-persistence.ts
 */

import assert from 'node:assert/strict';
import { closeDbClient, getDbClient } from '../lib/db/client';
import {
  appendDeepResearchMessage,
  createDeepResearchRun,
  getDeepResearchRun,
  insertDeepResearchRecords,
  saveDeepResearchOutputSchema,
  updateDeepResearchRunStatus,
} from '../lib/deep-research/persistence';
import type { OutputSchema, ResearchRecord } from '../lib/deep-research/types';

const outputSchema: OutputSchema = {
  fields: [
    { name: 'company', description: 'Company name' },
    { name: 'website', description: 'Company website' },
  ],
  identityColumns: ['company'],
  sampleRows: [
    { company: 'Acme', website: 'https://acme.test' },
    { company: 'Globex', website: 'https://globex.test' },
    { company: 'Initech', website: 'https://initech.test' },
  ],
};

const records: ResearchRecord[] = [
  { company: 'Acme', website: 'https://acme.example' },
  { company: 'Globex', website: 'https://globex.example' },
];

async function main(): Promise<void> {
  const { pglite } = await getDbClient();

  try {
    const tables = await pglite.query<{ table_name: string }>(
      `select table_name from information_schema.tables
       where table_schema = 'public' order by table_name`,
    );
    const foreignKeys = await pglite.query<{
      table_name: string;
      constraint_name: string;
      delete_rule: string;
    }>(
      `select tc.table_name, tc.constraint_name, rc.delete_rule
       from information_schema.table_constraints tc
       join information_schema.referential_constraints rc
         on rc.constraint_name = tc.constraint_name
       where tc.constraint_type = 'FOREIGN KEY'
         and tc.table_name in ('deep_research_run_messages', 'deep_research_records')
       order by tc.table_name`,
    );

    const run = await createDeepResearchRun('Find B2B SaaS companies in Europe');
    await appendDeepResearchMessage(run.id, 'user', 'Find B2B SaaS companies in Europe');
    await appendDeepResearchMessage(run.id, 'assistant', 'Which countries and company size?');
    await saveDeepResearchOutputSchema(run.id, outputSchema);
    await updateDeepResearchRunStatus(run.id, 'researching');
    await updateDeepResearchRunStatus(run.id, 'completed');
    const insertedCount = await insertDeepResearchRecords(run.id, records);
    const stored = await getDeepResearchRun(run.id);

    assert.ok(stored, 'run should exist');
    assert.equal(stored.run.status, 'completed');
    assert.equal(stored.run.outputSchema?.identityColumns[0], 'company');
    assert.equal(stored.messages.length, 2);
    assert.equal(stored.messages[0].role, 'user');
    assert.equal(stored.messages[1].role, 'assistant');
    assert.equal(insertedCount, 2);
    assert.equal(stored.records.length, 2);
    for (const expected of records) {
      assert.deepEqual(
        stored.records.find((record) => record.company === expected.company),
        expected,
      );
    }
    assert.ok(stored.run.createdAt && stored.run.updatedAt);

    console.log(
      JSON.stringify(
        {
          tables: tables.rows.map((row) => row.table_name),
          foreignKeys: foreignKeys.rows,
          insertedCount,
          run: stored.run,
          messages: stored.messages,
          records: stored.records,
        },
        null,
        2,
      ),
    );
  } finally {
    await closeDbClient();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
