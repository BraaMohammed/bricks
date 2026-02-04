/**
 * useAPIKeyManager Hook
 * 
 * Generic hook for managing API key state and localStorage persistence.
 * Provides a reusable pattern for any API key management needs.
 */

import { useState } from 'react';
import { toast } from '@/hooks/use-toast';

export interface APIKeyManager {
  key: string;
  hasKey: boolean;
  setKey: (key: string) => void;
  clearKey: () => void;
}

/**
 * Generic hook for managing an API key with localStorage persistence
 * 
 * @param storageKey - The localStorage key to use for persistence
 * @param serviceName - Human-readable service name for toast notifications
 * @param initialKey - Initial key value (usually loaded from localStorage)
 * @returns API key manager interface
 */
export const useAPIKeyManager = (
  storageKey: string,
  serviceName: string,
  initialKey: string = ''
): APIKeyManager => {
  const [key, setKeyState] = useState<string>(initialKey);
  const [hasKey, setHasKey] = useState<boolean>(!!initialKey);

  const setKey = (newKey: string) => {
    setKeyState(newKey);
    // Update hasKey based on whether the key has content
    setHasKey(!!newKey.trim());
  };

  const clearKey = () => {
    setKeyState('');
    setHasKey(false);
    
    toast({
      title: "API Key Cleared",
      description: `Your ${serviceName} API key has been removed.`,
    });
  };

  return {
    key,
    hasKey,
    setKey,
    clearKey,
  };
};
