/**
 * table-builder.ts
 *
 * The Table Builder assembles the collected Records into the approved Output
 * Schema, removes duplicates on the designated Identity Columns (falling back
 * to whole-record matching), persists them and emits `table_records_ready`.
 */

import { dedupeRecords } from './output-schema';
import { getDeepResearchCaps } from './env';
import { emitRunEvent } from './event-bus';
import { replaceRunRecords } from './repository';
import type { OutputSchema, ResearchRecord } from './types';

export interface BuildTableInput {
  runId: string;
  outputSchema: OutputSchema;
  targetCount: number;
  records: unknown[];
}

export interface BuildTableResult {
  records: ResearchRecord[];
  totalRecords: number;
}

/**
 * Builds and persists the final table. The per-run cap always wins; the target
 * count trims a larger harvest down to what the user asked for.
 */
export async function buildTable(
  input: BuildTableInput,
): Promise<BuildTableResult> {
  const caps = getDeepResearchCaps();
  const deduped = dedupeRecords(input.records, input.outputSchema);

  const limit = Math.min(
    caps.maxRecords,
    Math.max(1, Math.floor(input.targetCount)),
  );
  const records = deduped.slice(0, limit);

  await replaceRunRecords(input.runId, records);

  emitRunEvent(input.runId, {
    event: 'table_records_ready',
    records,
  });

  return { records, totalRecords: records.length };
}
