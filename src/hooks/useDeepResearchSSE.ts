import { useCallback, useEffect, useRef } from 'react';
import { deepResearchUrl } from '@/lib/deepResearch/backendUrl';
import { consumeSseStream } from '@/lib/deepResearch/sse';
import type { DeepResearchEvent } from '@/lib/deepResearch/types';
import {
  setDeepResearchAbortController,
  useDeepResearchStore,
} from '@/stores/useDeepResearchStore';

const dispatchPayload = (payload: string) => {
  try {
    const event = JSON.parse(payload) as DeepResearchEvent;
    if (event && typeof event.event === 'string') {
      useDeepResearchStore.getState().applyEvent(event);
    }
  } catch {
    return;
  }
};

export function useDeepResearchSSE() {
  const abortRef = useRef<AbortController | null>(null);

  const startRun = useCallback(async () => {
    if (abortRef.current) return;

    const store = useDeepResearchStore.getState();
    const { runId, outputSchema, model } = store;
    if (!runId || !outputSchema) return;
    if (!store.startRun()) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setDeepResearchAbortController(controller);

    try {
      const response = await fetch(deepResearchUrl('/run'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ runId, outputSchema, model }),
      });

      if (!response.ok) {
        throw new Error(`The Deep Research Run request failed (${response.status}).`);
      }
      if (!response.body) {
        throw new Error('The Deep Research Run response has no stream body.');
      }

      await consumeSseStream(response.body, dispatchPayload);
    } catch (err) {
      if (!controller.signal.aborted) {
        const message =
          err instanceof Error ? err.message : 'The Deep Research Run stream failed.';
        useDeepResearchStore
          .getState()
          .applyEvent({ event: 'deep_research_failed', error: message });
      }
    } finally {
      const state = useDeepResearchStore.getState();
      if (!controller.signal.aborted && state.phase === 'researching') {
        state.applyEvent({
          event: 'deep_research_failed',
          error: 'The run stream ended before the Deep Research Run completed.',
        });
      }
      if (abortRef.current === controller) {
        abortRef.current = null;
        setDeepResearchAbortController(null);
      }
    }
  }, []);

  const stopRun = useCallback(() => {
    abortRef.current = null;
    useDeepResearchStore.getState().stopRun();
  }, []);

  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current = null;
        useDeepResearchStore.getState().stopRun();
      }
    };
  }, []);

  return { startRun, stopRun };
}
