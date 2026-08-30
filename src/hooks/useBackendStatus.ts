import { useState, useEffect, useCallback } from 'react';
import { ModelDefinition, waterfallModels } from '@/lib/constants/aiModels';

export interface BackendModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
  x_providers?: string[];
  x_available?: boolean;
}

export interface BackendStatusState {
  connected: boolean;
  checking: boolean;
  backendUrl: string;
  setBackendUrl: (url: string) => void;
  latency: number | null;
  models: ModelDefinition[];
  configuredProviders: string[];
  lastChecked: Date | null;
  error: string | null;
  checkConnection: () => Promise<boolean>;
}

const DEFAULT_URL = 'http://localhost:3000';
const STORAGE_KEY = 'backend_api_url';

export function useBackendStatus(): BackendStatusState {
  const [backendUrl, setBackendUrlState] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || DEFAULT_URL;
    } catch {
      return DEFAULT_URL;
    }
  });

  const [connected, setConnected] = useState<boolean>(false);
  const [checking, setChecking] = useState<boolean>(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [models, setModels] = useState<ModelDefinition[]>(waterfallModels);
  const [configuredProviders, setConfiguredProviders] = useState<string[]>([]);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setBackendUrl = useCallback((url: string) => {
    const cleanUrl = url.trim().replace(/\/+$/, '');
    setBackendUrlState(cleanUrl);
    try {
      localStorage.setItem(STORAGE_KEY, cleanUrl);
    } catch (e) {
      console.error('Failed to save backend API URL', e);
    }
  }, []);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    setChecking(true);
    setError(null);
    const startTime = performance.now();

    // Probe urls: target backendUrl first, then auto-try 3000 and 3001 if localhost
    const urlsToTry = [backendUrl];
    if (backendUrl.includes('localhost:3000')) {
      urlsToTry.push('http://localhost:3001');
    } else if (backendUrl.includes('localhost:3001')) {
      urlsToTry.push('http://localhost:3000');
    }

    for (const testUrl of urlsToTry) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const res = await fetch(`${testUrl}/api/ai/v1/models`, {
          method: 'GET',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const json = await res.json();
          const elapsed = Math.round(performance.now() - startTime);

          if (testUrl !== backendUrl) {
            setBackendUrl(testUrl);
          }

          setConnected(true);
          setLatency(elapsed);
          setLastChecked(new Date());

          if (Array.isArray(json.data) && json.data.length > 0) {
            const allProviders = new Set<string>();

            const liveModels: ModelDefinition[] = json.data.map((m: BackendModel) => {
              if (m.x_providers) {
                m.x_providers.forEach((p) => allProviders.add(p));
              }
              const providerList = m.x_providers?.join(', ') || 'waterfall';
              return {
                id: m.id,
                name: `${m.id} (${providerList})`,
                supportsThinking:
                  m.id.includes('r1') ||
                  m.id.includes('deepseek') ||
                  m.id.includes('reason') ||
                  m.id.includes('qwen') ||
                  m.id.includes('nemotron'),
                cost: `Free (${providerList})`,
              };
            });

            setModels(liveModels);
            setConfiguredProviders(Array.from(allProviders));
          } else {
            setModels(waterfallModels);
          }

          setChecking(false);
          return true;
        }
      } catch (err: any) {
        // Continue to next probe candidate
      }
    }

    setConnected(false);
    setLatency(null);
    setChecking(false);
    setLastChecked(new Date());
    setError('Backend dev server is offline (no response on localhost:3000 / 3001)');
    return false;
  }, [backendUrl, setBackendUrl]);

  // Initial check on mount
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  return {
    connected,
    checking,
    backendUrl,
    setBackendUrl,
    latency,
    models,
    configuredProviders,
    lastChecked,
    error,
    checkConnection,
  };
}
