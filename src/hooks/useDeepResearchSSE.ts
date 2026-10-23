import { useCallback, useEffect, useRef } from 'react';
import { deepResearchUrl } from '@/lib/deepResearch/backendUrl';
import type { DeepResearchEvent } from '@/lib/deepResearch/types';
import {
  setDeepResearchAbortController,
  useDeepResearchStore,
} from '@/stores/useDeepResearchStore';

interface ParsedSseBuffer {
  rest: string;
  payloads: string[];
}

const parseSseBuffer = (buffer: string): ParsedSseBuffer => {
  const normalized = buffer.replace(/\r\n/g, '\n');
  const payloads: string[] = [];
  let rest = normalized;
  let boundary = rest.indexOf('\n\n');

  while (boundary !== -1) {
    const block = rest.slice(0, boundary);
    rest = rest.slice(boundary + 2);
    const dataLines = block
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).replace(/^ /, ''));
    if (dataLines.length > 0) {
      payloads.push(dataLines.join('\n'));
    }
    boundary = rest.indexOf('\n\n');
  }

  return { rest, payloads };
};

const parseSseBlock = (block: string): string | null => {
  const dataLines = block
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).replace(/^ /, ''));
  return dataLines.length > 0 ? dataLines.join('\n') : null;
};

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
    const { runId, outputSchema } = store;
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
        body: JSON.stringify({ runId, outputSchema }),
      });

      if (!response.ok) {
        throw new Error(`The Deep Research Run request failed (${response.status}).`);
      }
      if (!response.body) {
        throw new Error('The Deep Research Run response has no stream body.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const { rest, payloads } = parseSseBuffer(buffer);
        buffer = rest;
        for (const payload of payloads) {
          dispatchPayload(payload);
        }
      }

      buffer += decoder.decode();
      const tail = parseSseBlock(buffer);
      if (tail) dispatchPayload(tail);
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
