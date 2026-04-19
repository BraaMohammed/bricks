/**
 * useOllamaConnection Hook
 * 
 * Manages Ollama server connection state and model fetching.
 * Handles connection checking, model discovery, and error states.
 */

import { create } from 'zustand';
import { checkOllamaConnection as checkOllamaStatus } from '@/lib/ollama';

export interface OllamaConnection {
  connected: boolean;
  models: string[];
  checking: boolean;
  error: string | null;
  checkConnection: () => Promise<void>;
  refreshModels: () => Promise<void>;
}

export const useOllamaConnection = create<OllamaConnection>((set, get) => ({
  connected: false,
  models: [],
  checking: false,
  error: null,

  checkConnection: async () => {
    // Prevent overlapping checks
    if (get().checking) return;

    set({ checking: true, error: null });
    
    try {
      const status = await checkOllamaStatus();
      set({ 
        connected: status.connected, 
        models: status.models,
        error: !status.connected && status.error ? status.error : null
      });
    } catch (err) {
      set({ 
        error: err instanceof Error ? err.message : 'Unknown error',
        connected: false,
        models: []
      });
    } finally {
      set({ checking: false });
    }
  },

  refreshModels: async () => {
    await get().checkConnection();
  }
}));

// Fetch initially when the store is initialized
useOllamaConnection.getState().checkConnection();
