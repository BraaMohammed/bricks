/**
 * useAISettings Hook
 * 
 * Central hook for managing all AI configuration settings.
 * Handles state management, localStorage persistence, and provides
 * a unified interface for all AI-related configuration.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAPIKeyManager } from '@/hooks/useAPIKeyManager';
import { aiConfigStorage } from '@/lib/storage/aiConfigStorage';
import { STORAGE_KEYS, AIProvider, DEFAULT_OPENAI_MODEL } from '@/lib/constants/aiModels';
import { toast } from '@/hooks/use-toast';

export interface AISettings {
  // OpenAI API Key
  apiKey: string;
  hasApiKey: boolean;
  setApiKey: (key: string) => void;
  clearApiKey: () => void;
  
  // Gemini API Key
  geminiKey: string;
  hasGeminiKey: boolean;
  setGeminiKey: (key: string) => void;
  clearGeminiKey: () => void;
  
  // Firecrawl API Key
  firecrawlKey: string;
  hasFirecrawlKey: boolean;
  setFirecrawlKey: (key: string) => void;
  clearFirecrawlKey: () => void;
  
  // Provider & Model
  aiProvider: AIProvider;
  setAiProvider: (provider: AIProvider) => void;
  model: string;
  setModel: (model: string) => void;
  
  // Custom Prompt
  customPrompt: string;
  setCustomPrompt: (prompt: string) => void;
  
  // Ollama Configuration
  ollamaBaseUrl: string;
  setOllamaBaseUrl: (url: string) => void;
  
  // Actions
  saveAllSettings: () => void;
  loadSettings: () => void;
}

/**
 * Hook for managing all AI configuration settings
 * 
 * @returns Complete AI settings interface with state and actions
 */
export const useAISettings = (): AISettings => {
  // Load initial values from localStorage
  const initialConfig = aiConfigStorage.loadAll();
  
  // API Key Management
  const openaiKeyManager = useAPIKeyManager(
    STORAGE_KEYS.OPENAI_KEY,
    'OpenAI',
    initialConfig.openaiKey
  );
  
  const geminiKeyManager = useAPIKeyManager(
    STORAGE_KEYS.GEMINI_KEY,
    'Gemini',
    initialConfig.geminiKey
  );
  
  const firecrawlKeyManager = useAPIKeyManager(
    STORAGE_KEYS.FIRECRAWL_KEY,
    'Firecrawl',
    initialConfig.firecrawlKey
  );
  
  // Provider & Model State
  const [aiProvider, setAiProviderState] = useState<AIProvider>(initialConfig.provider);
  const [model, setModelState] = useState<string>(initialConfig.model || DEFAULT_OPENAI_MODEL);
  
  // Custom Prompt State
  const [customPrompt, setCustomPromptState] = useState<string>(initialConfig.customPrompt);
  
  // Ollama Configuration State
  const [ollamaBaseUrl, setOllamaBaseUrlState] = useState<string>(initialConfig.ollamaBaseUrl);

  /**
   * Load all settings from localStorage
   */
  const loadSettings = useCallback(() => {
    const config = aiConfigStorage.loadAll();
    
    openaiKeyManager.setKey(config.openaiKey);
    geminiKeyManager.setKey(config.geminiKey);
    firecrawlKeyManager.setKey(config.firecrawlKey);
    setAiProviderState(config.provider);
    setModelState(config.model || DEFAULT_OPENAI_MODEL);
    setCustomPromptState(config.customPrompt);
    setOllamaBaseUrlState(config.ollamaBaseUrl);
  }, []);

  /**
   * Save all current settings to localStorage
   */
  const saveAllSettings = useCallback(() => {
    // Save API keys if they have values
    if (openaiKeyManager.key.trim()) {
      aiConfigStorage.setOpenAIKey(openaiKeyManager.key);
    }
    if (geminiKeyManager.key.trim()) {
      aiConfigStorage.setGeminiKey(geminiKeyManager.key);
    }
    if (firecrawlKeyManager.key.trim()) {
      aiConfigStorage.setFirecrawlKey(firecrawlKeyManager.key);
    }
    
    // Save other settings
    aiConfigStorage.setProvider(aiProvider);
    aiConfigStorage.setModel(model);
    aiConfigStorage.setCustomPrompt(customPrompt);
    aiConfigStorage.setOllamaBaseUrl(ollamaBaseUrl);
  }, [
    openaiKeyManager.key,
    geminiKeyManager.key,
    firecrawlKeyManager.key,
    aiProvider,
    model,
    customPrompt,
    ollamaBaseUrl,
  ]);

  /**
   * Wrapper for setAiProvider that includes persistence logic
   */
  const setAiProvider = useCallback((provider: AIProvider) => {
    setAiProviderState(provider);
    
    // Reset model when switching providers to prevent conflicts
    if (provider === 'openai') {
      setModelState(DEFAULT_OPENAI_MODEL);
    } else {
      // Clear model for Ollama until models are loaded
      setModelState('');
    }
  }, []);

  /**
   * Wrapper for setModel
   */
  const setModel = useCallback((newModel: string) => {
    setModelState(newModel);
  }, []);

  /**
   * Wrapper for setCustomPrompt
   */
  const setCustomPrompt = useCallback((prompt: string) => {
    setCustomPromptState(prompt);
  }, []);

  /**
   * Wrapper for setOllamaBaseUrl
   */
  const setOllamaBaseUrl = useCallback((url: string) => {
    setOllamaBaseUrlState(url);
  }, []);

  /**
   * Wrapper for clearApiKey with persistence
   */
  const clearApiKey = useCallback(() => {
    openaiKeyManager.clearKey();
    aiConfigStorage.clearOpenAIKey();
  }, [openaiKeyManager]);

  /**
   * Wrapper for clearGeminiKey with persistence
   */
  const clearGeminiKey = useCallback(() => {
    geminiKeyManager.clearKey();
    aiConfigStorage.clearGeminiKey();
  }, [geminiKeyManager]);

  /**
   * Wrapper for clearFirecrawlKey with persistence
   */
  const clearFirecrawlKey = useCallback(() => {
    firecrawlKeyManager.clearKey();
    aiConfigStorage.clearFirecrawlKey();
  }, [firecrawlKeyManager]);

  return {
    // OpenAI API Key
    apiKey: openaiKeyManager.key,
    hasApiKey: openaiKeyManager.hasKey,
    setApiKey: openaiKeyManager.setKey,
    clearApiKey,
    
    // Gemini API Key
    geminiKey: geminiKeyManager.key,
    hasGeminiKey: geminiKeyManager.hasKey,
    setGeminiKey: geminiKeyManager.setKey,
    clearGeminiKey,
    
    // Firecrawl API Key
    firecrawlKey: firecrawlKeyManager.key,
    hasFirecrawlKey: firecrawlKeyManager.hasKey,
    setFirecrawlKey: firecrawlKeyManager.setKey,
    clearFirecrawlKey,
    
    // Provider & Model
    aiProvider,
    setAiProvider,
    model,
    setModel,
    
    // Custom Prompt
    customPrompt,
    setCustomPrompt,
    
    // Ollama Configuration
    ollamaBaseUrl,
    setOllamaBaseUrl,
    
    // Actions
    saveAllSettings,
    loadSettings,
  };
};
