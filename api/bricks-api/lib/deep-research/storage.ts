/**
 * storage.ts
 *
 * Mastra storage for the AI Deep Researcher.
 *
 * Mastra's Postgres adapter needs a TCP connection string, so locally we expose
 * the in-process PGlite instance over TCP with `@electric-sql/pglite-socket` and
 * point `@mastra/pg` at it. In production, `DATABASE_URL` (Supabase) is used
 * directly. Either way the same Postgres adapter, schema and migrations apply.
 * See docs/adr/0001-agent-orchestration-server-side-mastra.md and
 * docs/adr/0002-local-postgres-pglite-drizzle.md.
 */

import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { PostgresStore } from '@mastra/pg';
import type { MastraStorage } from '@mastra/core/storage';
import { getDbClient } from '../db/client';

const LOCAL_SOCKET_HOST = '127.0.0.1';
const LOCAL_SOCKET_PORT = Number(process.env.PGLITE_SOCKET_PORT ?? 5432);
const LOCAL_SOCKET_USER = process.env.PGLITE_SOCKET_USER ?? 'postgres';
const LOCAL_SOCKET_PASSWORD = process.env.PGLITE_SOCKET_PASSWORD ?? 'postgres';
const LOCAL_SOCKET_DATABASE = process.env.PGLITE_SOCKET_DATABASE ?? 'postgres';

let localSocket: PGLiteSocketServer | undefined;

/** Returns the production connection string, if one is configured. */
export function remoteDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL?.trim();
  return url ? url : undefined;
}

function localConnectionString(): string {
  const conn =
    localSocket?.getServerConn() ?? `${LOCAL_SOCKET_HOST}:${LOCAL_SOCKET_PORT}`;
  return `postgresql://${LOCAL_SOCKET_USER}:${LOCAL_SOCKET_PASSWORD}@${conn}/${LOCAL_SOCKET_DATABASE}`;
}

/**
 * Exposes the shared PGlite instance over TCP (idempotent). Returns the
 * connection string Mastra should use.
 */
export async function startLocalPgliteSocket(): Promise<string> {
  if (localSocket) return localConnectionString();

  const { pglite } = await getDbClient();
  const server = new PGLiteSocketServer({
    db: pglite,
    host: LOCAL_SOCKET_HOST,
    port: LOCAL_SOCKET_PORT,
    maxConnections: 5,
  });
  await server.start();
  localSocket = server;

  return localConnectionString();
}

/**
 * Builds the Mastra storage adapter: Supabase when `DATABASE_URL` is set,
 * otherwise the local PGlite socket.
 */
export async function createDeepResearchStorage(): Promise<MastraStorage> {
  const remote = remoteDatabaseUrl();
  if (remote) {
    return new PostgresStore({
      id: 'deep-research-storage',
      connectionString: remote,
    });
  }

  const connectionString = await startLocalPgliteSocket();
  return new PostgresStore({
    id: 'deep-research-storage',
    connectionString,
  });
}

/** Stops the local TCP bridge, if running. Used by scripts to exit cleanly. */
export async function stopLocalPgliteSocket(): Promise<void> {
  if (!localSocket) return;
  await localSocket.stop();
  localSocket = undefined;
}
