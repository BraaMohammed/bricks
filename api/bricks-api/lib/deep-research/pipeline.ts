/**
 * pipeline.ts
 *
 * Starts a Deep Research Run through the registered Mastra workflow and turns
 * its terminal state into run status changes plus the closing SSE events.
 */

import { getDeepResearchMastra } from './mastra';
import { emitRunEvent } from './event-bus';
import { runWithDeepResearchModel } from './env';
import { runProviderLoop } from './provider-loop';
import { getSearchProvider } from './search-providers/registry';
import type { SearchProviderId } from './search-providers/contract';
import { updateRun } from './repository';
import type { OutputSchema } from './types';

export interface ExecuteDeepResearchRunInput {
  runId: string;
  goal: string;
  outputSchema: OutputSchema;
  targetCount: number;
  model?: string;
  /** 'bricks' runs the Mastra workflow; a provider id runs the provider loop. */
  searchProvider?: 'bricks' | SearchProviderId;
  providerLevel?: string;
  maxSearches?: number;
  signal?: AbortSignal;
}

function errorMessage(value: unknown): string {
  if (value instanceof Error) return value.message;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.message === 'string') return record.message;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/**
 * Runs the workflow to completion. Does not throw: emits
 * `deep_research_completed` or `deep_research_failed` and updates the run.
 */
export async function executeDeepResearchRun(
  input: ExecuteDeepResearchRunInput,
): Promise<void> {
  try {
    const providerId =
      input.searchProvider && input.searchProvider !== 'bricks'
        ? input.searchProvider
        : null;

    if (providerId) {
      await runProviderPath(input, providerId);
      return;
    }

    const mastra = await getDeepResearchMastra();
    const workflow = mastra.getWorkflow('deepResearchWorkflow');
    if (!workflow) {
      throw new Error('deepResearchWorkflow is not registered on the Mastra instance');
    }

    const run = await workflow.createRun();
    const inputData = {
      runId: input.runId,
      goal: input.goal,
      outputSchema: input.outputSchema,
      targetCount: input.targetCount,
      ...(input.model ? { model: input.model } : {}),
    };

    const result = await runWithDeepResearchModel(input.model, () =>
      run.start({ inputData }),
    );

    if (result.status === 'success') {
      const totalRecords =
        (result.result as { totalRecords?: number } | undefined)
          ?.totalRecords ?? 0;

      await updateRun(input.runId, { status: 'completed' });
      emitRunEvent(input.runId, {
        event: 'deep_research_completed',
        totalRecords,
      });
      return;
    }

    const failure =
      'error' in result && result.error
        ? errorMessage(result.error)
        : `Deep Research Run ended with status "${result.status}".`;

    await updateRun(input.runId, { status: 'failed' });
    emitRunEvent(input.runId, {
      event: 'deep_research_failed',
      error: failure,
    });
  } catch (err) {
    console.error('💥 [deep-research] run failed:', err);
    const message = errorMessage(err);

    try {
      await updateRun(input.runId, { status: 'failed' });
    } catch {
      // Persistence is best-effort once the run is already failing.
    }

    emitRunEvent(input.runId, {
      event: 'deep_research_failed',
      error: message,
    });
  }
}

/**
 * Search Provider path: the Orchestrator's agentic tool loop replaces the
 * Mastra workflow. `deep_research_started` opens the stream with an empty
 * source list; the frontend builds cards from `search_sub_agent_started`.
 */
async function runProviderPath(
  input: ExecuteDeepResearchRunInput,
  providerId: SearchProviderId,
): Promise<void> {
  const adapter = getSearchProvider(providerId);
  if (!adapter.isConfigured()) {
    throw new Error(
      `Search Provider "${adapter.label}" is not configured. Add its API key to .env.local and retry.`,
    );
  }

  emitRunEvent(input.runId, {
    event: 'deep_research_started',
    runId: input.runId,
    sources: [],
  });

  const result = await runWithDeepResearchModel(input.model, () =>
    runProviderLoop({
      runId: input.runId,
      goal: input.goal,
      outputSchema: input.outputSchema,
      providerId,
      providerLevel: input.providerLevel ?? '',
      maxSearches: Math.max(1, Math.floor(input.maxSearches ?? 3)),
      targetCount: input.targetCount,
      model: input.model,
      signal: input.signal,
    }),
  );

  await updateRun(input.runId, { status: 'completed' });
  emitRunEvent(input.runId, {
    event: 'deep_research_completed',
    totalRecords: result.totalRecords,
  });
}
