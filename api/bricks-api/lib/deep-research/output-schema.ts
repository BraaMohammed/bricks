/**
 * output-schema.ts
 *
 * Normalisation and validation for the per-run Output Schema, plus Record
 * coercion and identity-based deduplication.
 *
 * The Output Schema drives the whole run; nothing here hardcodes fields or
 * dedup keys (docs/adr/0004-output-schema-drives-the-run.md).
 */

import type { OutputSchema, OutputSchemaField, ResearchRecord } from './types';

function asString(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function fakeSampleValue(field: OutputSchemaField, index: number): string {
  return `Example ${field.name.replace(/[_-]+/g, ' ')} ${index + 1}`;
}

function normalizeFields(value: unknown): OutputSchemaField[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const fields: OutputSchemaField[] = [];

  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const name = asString(record.name);
    if (!name) continue;

    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    fields.push({
      name,
      description: asString(record.description) || name,
    });
  }

  return fields;
}

/**
 * Parses and normalises an untrusted Output Schema. Returns `null` when no
 * usable fields remain. Guarantees three sample rows covering every field and
 * Identity Columns that are a subset of the field names.
 */
export function parseOutputSchema(value: unknown): OutputSchema | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;

  const fields = normalizeFields(record.fields);
  if (fields.length === 0) return null;

  const fieldNames = new Set(fields.map((f) => f.name));
  const fieldNamesLower = new Set(fields.map((f) => f.name.toLowerCase()));

  const identityColumns: string[] = [];
  const seenIdentity = new Set<string>();
  if (Array.isArray(record.identityColumns)) {
    for (const raw of record.identityColumns) {
      const name = asString(raw);
      if (!name) continue;
      const match =
        fields.find((f) => f.name === name) ??
        fields.find((f) => f.name.toLowerCase() === name.toLowerCase());
      if (!match) continue;
      if (!fieldNamesLower.has(match.name.toLowerCase())) continue;
      if (seenIdentity.has(match.name)) continue;
      seenIdentity.add(match.name);
      identityColumns.push(match.name);
    }
  }

  const sampleRows: Record<string, string>[] = [];
  if (Array.isArray(record.sampleRows)) {
    for (const raw of record.sampleRows.slice(0, 3)) {
      if (!raw || typeof raw !== 'object') continue;
      const source = raw as Record<string, unknown>;
      const row: Record<string, string> = {};
      for (const field of fields) {
        const value =
          source[field.name] ??
          Object.entries(source).find(
            ([key]) => key.toLowerCase() === field.name.toLowerCase(),
          )?.[1];
        row[field.name] =
          asString(value) || fakeSampleValue(field, sampleRows.length);
      }
      sampleRows.push(row);
    }
  }

  while (sampleRows.length < 3) {
    const index = sampleRows.length;
    const row: Record<string, string> = {};
    for (const field of fields) {
      row[field.name] = fakeSampleValue(field, index);
    }
    sampleRows.push(row);
  }

  // Keep the field-name check meaningful if callers mutate fields later.
  void fieldNames;

  return { fields, identityColumns, sampleRows };
}

/** Coerces one Record to exactly the approved fields, all values strings. */
export function coerceRecord(
  value: unknown,
  outputSchema: OutputSchema,
): ResearchRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;

  const row: ResearchRecord = {};
  let hasValue = false;

  for (const field of outputSchema.fields) {
    const raw =
      source[field.name] ??
      Object.entries(source).find(
        ([key]) => key.toLowerCase() === field.name.toLowerCase(),
      )?.[1];

    const text = asString(raw);
    row[field.name] = text;
    if (text) hasValue = true;
  }

  return hasValue ? row : null;
}

function normalizeKeyPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '')
    .trim();
}

/**
 * Deduplicates Records on the designated Identity Columns, falling back to
 * whole-record matching when none are designated
 * (docs/adr/0004-output-schema-drives-the-run.md).
 */
export function dedupeRecords(
  values: unknown[],
  outputSchema: OutputSchema,
): ResearchRecord[] {
  const identityColumns = outputSchema.identityColumns.filter((name) =>
    outputSchema.fields.some((f) => f.name === name),
  );

  const seen = new Set<string>();
  const records: ResearchRecord[] = [];

  for (const value of values) {
    const record = coerceRecord(value, outputSchema);
    if (!record) continue;

    const parts = identityColumns.length
      ? identityColumns.map((column) => normalizeKeyPart(record[column] ?? ''))
      : outputSchema.fields.map((field) =>
          normalizeKeyPart(record[field.name] ?? ''),
        );

    const key = parts.join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    records.push(record);
  }

  return records;
}

export function outputSchemaForPrompt(outputSchema: OutputSchema): string {
  const fields = outputSchema.fields
    .map((field) => `- "${field.name}": ${field.description}`)
    .join('\n');
  const identity = outputSchema.identityColumns.length
    ? outputSchema.identityColumns.join(', ')
    : '(none designated; deduplicate on the whole record)';
  return `${fields}\nIdentity Columns: ${identity}`;
}
