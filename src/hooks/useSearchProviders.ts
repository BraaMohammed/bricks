import { useCallback, useEffect, useState } from 'react';
import { getBackendUrl } from '@/lib/deepResearch/backendUrl';
import type { SearchProviderStatus } from '@/lib/deepResearch/types';

export interface SearchProvidersState {
  providers: SearchProviderStatus[];
  loaded: boolean;
  refresh: () => Promise<void>;
}

interface ProvidersCache {
  providers: SearchProviderStatus[];
  loaded: boolean;
}

interface ProvidersHookState {
  providers: SearchProviderStatus[];
  loaded: boolean;
  error: string | null;
}

const FETCH_TIMEOUT_MS = 8000;

const isProviderStatus = (value: unknown): value is SearchProviderStatus => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SearchProviderStatus>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.label === 'string' &&
    typeof candidate.configured === 'boolean' &&
    Array.isArray(candidate.levels)
  );
};

const parseProviders = (payload: unknown): SearchProviderStatus[] => {
  if (!Array.isArray(payload)) throw new Error('Unexpected search providers response.');
  return payload.filter(isProviderStatus);
};

let cache: ProvidersCache = {
  providers: [],
  loaded: false,
};

let pendingRequest: Promise<ProvidersCache> | null = null;

async function fetchProviders(): Promise<SearchProviderStatus[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(`${getBackendUrl()}/api/deep-research/providers`, {
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`The search providers request failed (${response.status}).`);
    }
    return parseProviders(await response.json());
  } finally {
    clearTimeout(timer);
  }
}

async function loadProviders(): Promise<ProvidersCache> {
  if (pendingRequest) return pendingRequest;

  pendingRequest = fetchProviders()
    .then((providers) => {
      cache = { providers, loaded: true };
      return cache;
    })
    .catch(() => {
      cache = { ...cache, loaded: true };
      return cache;
    })
    .finally(() => {
      pendingRequest = null;
    });

  return pendingRequest;
}

export function useSearchProviders(): SearchProvidersState {
  const [state, setState] = useState<ProvidersHookState>(() => ({
    providers: cache.providers,
    loaded: cache.loaded,
    error: null,
  }));

  const refresh = useCallback(async () => {
    setState((previous) => ({ ...previous, error: null }));

    try {
      const next = await loadProviders();
      setState({
        providers: next.providers,
        loaded: true,
        error: null,
      });
    } catch (error) {
      setState((previous) => ({
        ...previous,
        loaded: true,
        error: error instanceof Error ? error.message : 'Failed to load search providers',
      }));
    }
  }, []);

  useEffect(() => {
    if (cache.loaded) {
      setState({
        providers: cache.providers,
        loaded: true,
        error: null,
      });
      return;
    }

    void refresh();
  }, [refresh]);

  return { ...state, refresh };
}
