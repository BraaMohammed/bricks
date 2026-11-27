/**
 * event-bus.ts
 *
 * In-process bridge between Mastra workflow steps and the SSE response of
 * POST /api/deep-research/run. Steps emit Deep Research Events keyed by run
 * ID; the route registers a listener before starting the workflow.
 */

import type { DeepResearchEvent } from './types';

export type DeepResearchEventListener = (event: DeepResearchEvent) => void;

const listeners = new Map<string, DeepResearchEventListener>();

export function registerRunListener(
  runId: string,
  listener: DeepResearchEventListener,
): void {
  listeners.set(runId, listener);
}

export function unregisterRunListener(runId: string): void {
  listeners.delete(runId);
}

export function hasRunListener(runId: string): boolean {
  return listeners.has(runId);
}

export function emitRunEvent(
  runId: string,
  event: DeepResearchEvent,
): void {
  const listener = listeners.get(runId);
  if (!listener) return;

  try {
    listener(event);
  } catch {
    // A closed SSE stream must not break the run; the run still persists.
    listeners.delete(runId);
  }
}
