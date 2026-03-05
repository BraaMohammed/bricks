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

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAPIKeyManager } from '@/hooks/useAPIKeyManager';
import { aiConfigStorage } from '@/lib/storage/aiConfigStorage';
import {
  STORAGE_KEYS,
  AIProvider,
  DEFAULT_OPENAI_MODEL,
  openAIModels,
  geminiModels,
  groqModels,
  ModelDefinition
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
 * @returns Complete AI settings interface with state and actions
 */
export const useAISettings = (ollamaModels: string[] = []): AISettings => {
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

  // Provider & Model State
  const [aiProvider, setAiProviderState] = useState<AIProvider>(initialConfig.provider);
  const [model, setModelState] = useState<string>(initialConfig.model || DEFAULT_OPENAI_MODEL);

  // Custom Prompt State
  const [customPrompt, setCustomPromptState] = useState<string>(initialConfig.customPrompt);

  // Ollama Configuration State
  const [ollamaBaseUrl, setOllamaBaseUrlState] = useState<string>(initialConfig.ollamaBaseUrl);

  // Advanced Settings State
  const [temperature, setTemperatureState] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.AI_TEMPERATURE);
    return saved ? parseFloat(saved) : 0.7;
  });

  const [maxTokens, setMaxTokensState] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.AI_MAX_TOKENS);
    return saved ? parseInt(saved) : 2048;
  });

  const [topK, setTopKState] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.AI_TOP_K);
    return saved ? parseInt(saved) : 40;
  });

  // Thinking Mode State
  const [thinkingMode, setThinkingModeState] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THINKING_MODE);
    return saved === 'true';
  });

  // Compute available models based on current provider
  const availableModels = useMemo<ModelDefinition[]>(() => {
    if (aiProvider === 'openai') {
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
  }, [aiProvider, ollamaModels]);

  /**
   * Load all settings from localStorage
   */
  const loadSettings = useCallback(() => {
    const config = aiConfigStorage.loadAll();

    openaiKeyManager.setKey(config.openaiKey);
    geminiKeyManager.setKey(config.geminiKey);
    groqKeyManager.setKey(config.groqKey);
    firecrawlKeyManager.setKey(config.firecrawlKey);
    setAiProviderState(config.provider);
    setModelState(config.model || DEFAULT_OPENAI_MODEL);
    setCustomPromptState(config.customPrompt);
    setOllamaBaseUrlState(config.ollamaBaseUrl);
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

    // Save other settings
    aiConfigStorage.setProvider(aiProvider);
    aiConfigStorage.setModel(model);
    aiConfigStorage.setCustomPrompt(customPrompt);
    aiConfigStorage.setOllamaBaseUrl(ollamaBaseUrl);

    // Save advanced settings
    localStorage.setItem(STORAGE_KEYS.AI_TEMPERATURE, temperature.toString());
    localStorage.setItem(STORAGE_KEYS.AI_MAX_TOKENS, maxTokens.toString());
    localStorage.setItem(STORAGE_KEYS.AI_TOP_K, topK.toString());
    localStorage.setItem(STORAGE_KEYS.THINKING_MODE, thinkingMode.toString());
  }, [
    openaiKeyManager.key,
    geminiKeyManager.key,
    groqKeyManager.key,
    firecrawlKeyManager.key,
    aiProvider,
    model,
    customPrompt,
    ollamaBaseUrl,
    temperature,
    maxTokens,
    topK,
    thinkingMode,
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

  /**
   * Wrapper for setTemperature with persistence
   */
  const setTemperature = useCallback((value: number) => {
    setTemperatureState(value);
    localStorage.setItem(STORAGE_KEYS.AI_TEMPERATURE, value.toString());
  }, []);

  /**
   * Wrapper for setMaxTokens with persistence
   */
  const setMaxTokens = useCallback((value: number) => {
    setMaxTokensState(value);
    localStorage.setItem(STORAGE_KEYS.AI_MAX_TOKENS, value.toString());
  }, []);

  /**
   * Wrapper for setTopK with persistence
   */
  const setTopK = useCallback((value: number) => {
    setTopKState(value);
    localStorage.setItem(STORAGE_KEYS.AI_TOP_K, value.toString());
  }, []);

  /**
   * Wrapper for setThinkingMode with persistence
   */
  const setThinkingMode = useCallback((enabled: boolean) => {
    setThinkingModeState(enabled);
    localStorage.setItem(STORAGE_KEYS.THINKING_MODE, enabled.toString());
  }, []);
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
