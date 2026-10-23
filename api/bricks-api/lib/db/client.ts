/**
 * client.ts
 *
 * PGlite client singleton + Drizzle client for the Bricks backend.
 *
 * PGlite is an in-process WASM build of Postgres, so the same schema and
 * migration set run locally and (driver-swapped) against Supabase in prod.
 * See docs/adr/0002-local-postgres-pglite-drizzle.md.
 *
 * The instance persists to `.pglite-data/` on disk and applies any pending
 * SQL migrations from `drizzle/` on first use. A global singleton keeps the
 * WASM instance alive across Next.js dev HMR reloads.
 */

import * as fs from 'fs';
import * as path from 'path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle, type PgliteDatabase } from 'drizzle-orm/pglite';
import * as schema from './schema';

export type Db = PgliteDatabase<typeof schema>;

export interface DbClient {
  pglite: PGlite;
  db: Db;
}

const DATA_DIR = path.join(process.cwd(), '.pglite-data');
const MIGRATIONS_DIR = path.join(process.cwd(), 'drizzle');
const MIGRATIONS_TABLE = '_bricks_migrations';

interface DbSingleton {
  pglite: PGlite;
  db: Db;
  ready: Promise<void>;
}

const globalForDb = globalThis as unknown as { __bricksDb?: DbSingleton };

/**
 * Applies every not-yet-applied `drizzle/*.sql` file in filename order.
 * Idempotent: applied filenames are recorded in `_bricks_migrations`.
 */
async function applyMigrations(pglite: PGlite): Promise<void> {
  await pglite.exec(
    `CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
       name text PRIMARY KEY,
       applied_at timestamptz NOT NULL DEFAULT now()
     );`,
  );

  if (!fs.existsSync(MIGRATIONS_DIR)) return;

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const applied = await pglite.query<{ name: string }>(
    `SELECT name FROM ${MIGRATIONS_TABLE}`,
  );
  const appliedSet = new Set(applied.rows.map((r) => r.name));

  for (const file of files) {
    if (appliedSet.has(file)) continue;

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
    const statements = sql
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter(Boolean);

    await pglite.transaction(async (tx) => {
      for (const statement of statements) {
        await tx.exec(statement);
      }
      await tx.query(`INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES ($1)`, [
        file,
      ]);
    });
  }
}

/**
 * Returns the shared PGlite + Drizzle client, booting and migrating on first call.
 */
export async function getDbClient(): Promise<DbClient> {
  if (!globalForDb.__bricksDb) {
    const pglite = new PGlite(DATA_DIR);
    const db = drizzle(pglite, { schema });
    const ready = applyMigrations(pglite);
    globalForDb.__bricksDb = { pglite, db, ready };
  }

  const singleton = globalForDb.__bricksDb;
  await singleton.ready;
  return { pglite: singleton.pglite, db: singleton.db };
}

/**
 * Closes the PGlite instance and clears the singleton. Used by scripts/tests
 * that need the Node process to exit.
 */
export async function closeDbClient(): Promise<void> {
  const singleton = globalForDb.__bricksDb;
  if (!singleton) return;
  await singleton.ready.catch(() => {});
  await singleton.pglite.close();
  delete globalForDb.__bricksDb;
}

export { schema };
