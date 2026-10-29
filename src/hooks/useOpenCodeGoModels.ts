import { useCallback, useEffect, useState } from 'react';
import { ModelDefinition, openCodeGoModels } from '@/lib/constants/aiModels';
import { fetchOpenCodeGoModels, getOpenCodeGoStatus } from '@/lib/providers/opencodeGo';

export interface OpenCodeGoModelsState {
  models: ModelDefinition[];
  configured: boolean | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

interface OpenCodeGoModelsCache {
  models: ModelDefinition[];
  configured: boolean | null;
  loaded: boolean;
}

interface OpenCodeGoModelsHookState {
  models: ModelDefinition[];
  configured: boolean | null;
  loading: boolean;
  error: string | null;
}

let cache: OpenCodeGoModelsCache = {
  models: openCodeGoModels,
  configured: null,
  loaded: false,
};

let pendingRequest: Promise<OpenCodeGoModelsCache> | null = null;

async function loadModels(): Promise<OpenCodeGoModelsCache> {
  if (pendingRequest) return pendingRequest;

  pendingRequest = Promise.all([fetchOpenCodeGoModels(), getOpenCodeGoStatus()])
    .then(([models, status]) => {
      cache = {
        models: models.length > 0 ? models : openCodeGoModels,
        configured: status.configured,
        loaded: true,
      };
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

export function useOpenCodeGoModels(): OpenCodeGoModelsState {
  const [state, setState] = useState<OpenCodeGoModelsHookState>(() => ({
    models: cache.models,
    configured: cache.configured,
    loading: !cache.loaded,
    error: null,
  }));

  const refresh = useCallback(async () => {
    setState(previous => ({ ...previous, loading: true, error: null }));

    try {
      const next = await loadModels();
      setState({
        models: next.models,
        configured: next.configured,
        loading: false,
        error: null,
      });
    } catch (error) {
      setState(previous => ({
        ...previous,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load OpenCode Go models',
      }));
    }
  }, []);

  useEffect(() => {
    if (cache.loaded) {
      setState({
        models: cache.models,
        configured: cache.configured,
        loading: false,
        error: null,
      });
      return;
    }

    void refresh();
  }, [refresh]);

  return { ...state, refresh };
}
