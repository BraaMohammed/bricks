/**
 * mastra.ts
 *
 * The Mastra instance that runs the AI Deep Researcher server-side
 * (docs/adr/0001-agent-orchestration-server-side-mastra.md).
 *
 * `getDeepResearchMastra()` is an async singleton: it wires the storage
 * adapter (Supabase or the local PGlite TCP bridge) and registers the
 * Deep Research Run workflows. More workflows (Orchestrator, Coverage
 * Reviewer, Table Builder) get registered here as they are built.
 */

import { Mastra } from '@mastra/core/mastra';
import { deepResearchWorkflow } from './workflow';
import { echoWorkflow } from './echo-workflow';
import { createDeepResearchStorage } from './storage';

let mastraPromise: Promise<Mastra> | undefined;

async function boot(): Promise<Mastra> {
  const storage = await createDeepResearchStorage();
  return new Mastra({
    storage,
    workflows: { echoWorkflow, deepResearchWorkflow },
  });
}

export function getDeepResearchMastra(): Promise<Mastra> {
  if (!mastraPromise) {
    mastraPromise = boot();
  }
  return mastraPromise;
}
