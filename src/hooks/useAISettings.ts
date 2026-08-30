/**
 * useAISettings Hook
 * 
 * Central hook for managing all AI configuration settings.
 * Handles state management, localStorage persistence, and provides
 * a unified interface for all AI-related configuration.
 * 
 * This hook manages:
 * - API keys for all providers
 * - Provider and model selection
 * - Advanced settings (temperature, maxTokens, topK)
 * - Thinking mode for reasoning models
 * - Available models list based on provider
 */

import { useEffect, useCallback, useMemo } from 'react';
import { useAPIKeyManager } from '@/hooks/useAPIKeyManager';
import { aiConfigStorage } from '@/lib/storage/aiConfigStorage';
import { useAISettingsStore } from '@/stores/useAISettingsStore';
import {
  STORAGE_KEYS,
  AIProvider,
  DEFAULT_OPENAI_MODEL,
  openAIModels,
  geminiModels,
  groqModels,
  waterfallModels,
  ModelDefinition,
  CustomProvider
} from '@/lib/constants/aiModels';
import { detectThinkingSupport } from '@/lib/providers/aiProviders';
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

  // Groq API Key
  groqKey: string;
  hasGroqKey: boolean;
  setGroqKey: (key: string) => void;
  clearGroqKey: () => void;

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
  availableModels: ModelDefinition[];

  // Custom Providers
  customProviders: CustomProvider[];
  addCustomProvider: (provider: CustomProvider) => void;
  removeCustomProvider: (id: string) => void;

  // Custom Prompt
  customPrompt: string;
  setCustomPrompt: (prompt: string) => void;

  // Ollama Configuration
  ollamaBaseUrl: string;
  setOllamaBaseUrl: (url: string) => void;

  // Advanced Settings (for AI mode in FormulaEditor)
  temperature: number;
  setTemperature: (value: number) => void;
  maxTokens: number;
  setMaxTokens: (value: number) => void;
  topK: number;
  setTopK: (value: number) => void;

  // Thinking Mode (for reasoning models)
  thinkingMode: boolean;
  setThinkingMode: (enabled: boolean) => void;

  // Actions
  saveAllSettings: () => void;
  loadSettings: () => void;
}

/**
 * Hook for managing all AI configuration settings
 * 
 * @param ollamaModels - Optional array of available Ollama models (from useOllamaConnection)
 * @param dynamicWaterfallModels - Optional array of live backend models (from useBackendStatus)
 * @returns Complete AI settings interface with state and actions
 */
export const useAISettings = (
  ollamaModels: string[] = [],
  dynamicWaterfallModels: ModelDefinition[] = []
): AISettings => {
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

  const groqKeyManager = useAPIKeyManager(
    STORAGE_KEYS.GROQ_KEY,
    'Groq',
    initialConfig.groqKey
  );

  const firecrawlKeyManager = useAPIKeyManager(
    STORAGE_KEYS.FIRECRAWL_KEY,
    'Firecrawl',
    initialConfig.firecrawlKey
  );

  // Zustand Store
  const {
    aiProvider,
    model,
    customPrompt,
    ollamaBaseUrl,
    temperature,
    maxTokens,
    topK,
    thinkingMode,
    setAiProvider,
    setModel,
    setCustomPrompt,
    setOllamaBaseUrl,
    setTemperature,
    setMaxTokens,
    setTopK,
    setThinkingMode,
    customProviders,
    addCustomProvider,
    removeCustomProvider,
    loadSettings: loadStoreSettings
  } = useAISettingsStore();

  // Compute available models based on current provider
  const availableModels = useMemo<ModelDefinition[]>(() => {
    if (aiProvider === 'waterfall') {
      return dynamicWaterfallModels.length > 0 ? dynamicWaterfallModels : waterfallModels;
    } else if (aiProvider === 'openai') {
      return openAIModels;
    } else if (aiProvider === 'gemini') {
      return geminiModels;
    } else if (aiProvider === 'groq') {
      return groqModels;
    } else {
      // Ollama models
      return ollamaModels.map(modelName => ({
        id: modelName,
        name: modelName,
        supportsThinking: detectThinkingSupport(modelName),
        cost: 'Free (Local)'
      }));
    }
  }, [aiProvider, ollamaModels, dynamicWaterfallModels]);

  const loadSettings = useCallback(() => {
    const config = aiConfigStorage.loadAll();

    openaiKeyManager.setKey(config.openaiKey);
    geminiKeyManager.setKey(config.geminiKey);
    groqKeyManager.setKey(config.groqKey);
    firecrawlKeyManager.setKey(config.firecrawlKey);
    
    // Load other settings via store
    loadStoreSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (groqKeyManager.key.trim()) {
      aiConfigStorage.setGroqKey(groqKeyManager.key);
    }
    if (firecrawlKeyManager.key.trim()) {
      aiConfigStorage.setFirecrawlKey(firecrawlKeyManager.key);
    }
  }, [openaiKeyManager.key, geminiKeyManager.key, groqKeyManager.key, firecrawlKeyManager.key]);

  // We can strip these out since Zustand now handles persistence automatically on state changes!

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
   * Wrapper for clearGroqKey with persistence
   */
  const clearGroqKey = useCallback(() => {
    groqKeyManager.clearKey();
    aiConfigStorage.clearGroqKey();
  }, [groqKeyManager]);

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

    // Groq API Key
    groqKey: groqKeyManager.key,
    hasGroqKey: groqKeyManager.hasKey,
    setGroqKey: groqKeyManager.setKey,
    clearGroqKey,

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
    availableModels,

    // Custom Providers
    customProviders,
    addCustomProvider,
    removeCustomProvider,

    // Custom Prompt
    customPrompt,
    setCustomPrompt,

    // Ollama Configuration
    ollamaBaseUrl,
    setOllamaBaseUrl,

    // Advanced Settings
    temperature,
    setTemperature,
    maxTokens,
    setMaxTokens,
    topK,
    setTopK,

    // Thinking Mode
    thinkingMode,
    setThinkingMode,

    // Actions
    saveAllSettings,
    loadSettings,
  };
};
