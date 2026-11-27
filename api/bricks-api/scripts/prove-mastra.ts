/**
 * scripts/prove-mastra.ts
 *
 * Boot proof for the AI Deep Researcher orchestration layer: starts the local
 * PGlite TCP bridge, builds the Mastra instance, runs the echo workflow, and
 * lists the tables Mastra created in the same Postgres engine.
 *
 * Usage:
 *   npx tsx scripts/prove-mastra.ts
 */

import * as fs from 'fs';
import * as path from 'path';

function loadEnvLocal(): void {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && value && !process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

async function main(): Promise<void> {
  const { getDeepResearchMastra } = await import('../lib/deep-research/mastra');
  const { stopLocalPgliteSocket, remoteDatabaseUrl } = await import(
    '../lib/deep-research/storage'
  );
  const { getDbClient, closeDbClient } = await import('../lib/db/client');

  console.log(
    `storage mode: ${remoteDatabaseUrl() ? 'remote (DATABASE_URL)' : 'local (PGlite socket)'}`,
  );

  const mastra = await getDeepResearchMastra();
  const workflow = mastra.getWorkflow('echoWorkflow');
  if (!workflow) throw new Error('echoWorkflow was not registered');

  const run = await workflow.createRun();
  const result = await run.start({
    inputData: { message: 'hello from the deep researcher' },
  });
  console.log('workflow result:', JSON.stringify(result));

  const { pglite } = await getDbClient();
  const tables = await pglite.query<{ table_name: string }>(
    `select table_name from information_schema.tables
     where table_schema = 'public' order by table_name`,
  );
  console.log(
    'public tables:',
    tables.rows.map((r) => r.table_name).join(', '),
  );

  await stopLocalPgliteSocket();
  await closeDbClient();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('PROOF FAILED:', err);
    process.exit(1);
  });
