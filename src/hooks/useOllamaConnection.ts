/**
 * useOllamaConnection Hook
 * 
 * Manages Ollama server connection state and model fetching.
 * Handles connection checking, model discovery, and error states.
 */

import { useState, useCallback } from 'react';
import { checkOllamaConnection as checkOllamaStatus } from '@/lib/ollama';

export interface OllamaConnection {
  connected: boolean;
  models: string[];
  checking: boolean;
  error: string | null;
  checkConnection: () => Promise<void>;
  refreshModels: () => Promise<void>;
}

/**
 * Hook for managing Ollama connection state
 * 
 * @param baseUrl - The Ollama server base URL (optional, for future use)
 * @returns Ollama connection state and control functions
 */
export const useOllamaConnection = (baseUrl?: string): OllamaConnection => {
  const [connected, setConnected] = useState<boolean>(false);
  const [models, setModels] = useState<string[]>([]);
  const [checking, setChecking] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const checkConnection = useCallback(async () => {
    setChecking(true);
    setError(null);
    
    try {
      const status = await checkOllamaStatus();
      setConnected(status.connected);
      setModels(status.models);
      
      if (!status.connected && status.error) {
        setError(status.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setConnected(false);
      setModels([]);
    } finally {
      setChecking(false);
    }
  }, []);

  const refreshModels = useCallback(async () => {
    // Alias for checkConnection for semantic clarity
    await checkConnection();
  }, [checkConnection]);

  return {
    connected,
    models,
    checking,
    error,
    checkConnection,
    refreshModels,
  };
};
