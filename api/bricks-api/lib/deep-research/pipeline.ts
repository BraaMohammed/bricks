/**
 * pipeline.ts
 *
 * Starts a Deep Research Run through the registered Mastra workflow and turns
 * its terminal state into run status changes plus the closing SSE events.
 */

import { getDeepResearchMastra } from './mastra';
import { emitRunEvent } from './event-bus';
import { updateRun } from './repository';
import type { OutputSchema } from './types';

export interface ExecuteDeepResearchRunInput {
  runId: string;
  goal: string;
  outputSchema: OutputSchema;
  targetCount: number;
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
    const mastra = await getDeepResearchMastra();
    const workflow = mastra.getWorkflow('deepResearchWorkflow');
    if (!workflow) {
      throw new Error('deepResearchWorkflow is not registered on the Mastra instance');
    }

    const run = await workflow.createRun();
    const result = await run.start({
      inputData: {
        runId: input.runId,
        goal: input.goal,
        outputSchema: input.outputSchema,
        targetCount: input.targetCount,
      },
    });

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
