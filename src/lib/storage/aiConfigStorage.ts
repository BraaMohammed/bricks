/**
 * AI Configuration Storage Utility
 * 
 * Abstracts localStorage operations for AI configuration settings.
 * Provides type-safe access to all AI-related settings with proper
 * error handling.
 */

import { STORAGE_KEYS, DEFAULT_OPENAI_MODEL, DEFAULT_OLLAMA_BASE_URL, AIProvider } from '@/lib/constants/aiModels';

/**
 * Complete AI configuration interface
 */
export interface AIConfig {
  openaiKey: string;
  geminiKey: string;
  groqKey: string;
  firecrawlKey: string;
  provider: AIProvider;
  model: string;
  customPrompt: string;
  ollamaBaseUrl: string;
}

/**
 * Safely get item from localStorage with error handling
 */
const getItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error(`Error reading from localStorage (${key}):`, error);
    return null;
  }
};

/**
 * Safely set item in localStorage with error handling
 */
const setItem = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.error(`Error writing to localStorage (${key}):`, error);
  }
};

/**
 * Safely remove item from localStorage with error handling
 */
const removeItem = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing from localStorage (${key}):`, error);
  }
};

/**
 * AI Configuration Storage API
 */
export const aiConfigStorage = {
  // ==================== OpenAI API Key ====================

  /**
   * Get the stored OpenAI API key
   */
  getOpenAIKey: (): string | null => {
    return getItem(STORAGE_KEYS.OPENAI_KEY);
  },

  /**
   * Store the OpenAI API key
   */
  setOpenAIKey: (key: string): void => {
    setItem(STORAGE_KEYS.OPENAI_KEY, key.trim());
  },

  /**
   * Clear the stored OpenAI API key
   */
  clearOpenAIKey: (): void => {
    removeItem(STORAGE_KEYS.OPENAI_KEY);
  },

  // ==================== Gemini API Key ====================

  /**
   * Get the stored Gemini API key
   */
  getGeminiKey: (): string | null => {
    return getItem(STORAGE_KEYS.GEMINI_KEY);
  },

  /**
   * Store the Gemini API key
   */
  setGeminiKey: (key: string): void => {
    setItem(STORAGE_KEYS.GEMINI_KEY, key.trim());
  },

  /**
   * Clear the stored Gemini API key
   */
  clearGeminiKey: (): void => {
    removeItem(STORAGE_KEYS.GEMINI_KEY);
  },

  // ==================== Groq API Key ====================

  /**
   * Get the stored Groq API key
   */
  getGroqKey: (): string | null => {
    return getItem(STORAGE_KEYS.GROQ_KEY);
  },

  /**
   * Store the Groq API key
   */
  setGroqKey: (key: string): void => {
    setItem(STORAGE_KEYS.GROQ_KEY, key.trim());
  },

  /**
   * Clear the stored Groq API key
   */
  clearGroqKey: (): void => {
    removeItem(STORAGE_KEYS.GROQ_KEY);
  },

  // ==================== Firecrawl API Key ====================

  /**
   * Get the stored Firecrawl API key
   */
  getFirecrawlKey: (): string | null => {
    return getItem(STORAGE_KEYS.FIRECRAWL_KEY);
  },

  /**
   * Store the Firecrawl API key
   */
  setFirecrawlKey: (key: string): void => {
    setItem(STORAGE_KEYS.FIRECRAWL_KEY, key.trim());
  },

  /**
   * Clear the stored Firecrawl API key
   */
  clearFirecrawlKey: (): void => {
    removeItem(STORAGE_KEYS.FIRECRAWL_KEY);
  },

  // ==================== AI Provider ====================

  /**
   * Get the stored AI provider
   * Defaults to 'openai' if not set or invalid
   */
  getProvider: (): AIProvider => {
    const provider = getItem(STORAGE_KEYS.AI_PROVIDER);
    return (provider === 'openai' || provider === 'ollama' || provider === 'gemini' || provider === 'groq') ? provider : 'openai';
  },

  /**
   * Store the AI provider
   */
  setProvider: (provider: AIProvider): void => {
    setItem(STORAGE_KEYS.AI_PROVIDER, provider);
  },

  // ==================== AI Model ====================

  /**
   * Get the stored AI model
   */
  getModel: (): string | null => {
    return getItem(STORAGE_KEYS.AI_MODEL);
  },

  /**
   * Store the AI model
   */
  setModel: (model: string): void => {
    setItem(STORAGE_KEYS.AI_MODEL, model);
  },

  // ==================== Custom Prompt ====================

  /**
   * Get the stored custom AI prompt
   */
  getCustomPrompt: (): string | null => {
    return getItem(STORAGE_KEYS.CUSTOM_PROMPT);
  },

  /**
   * Store the custom AI prompt
   */
  setCustomPrompt: (prompt: string): void => {
    setItem(STORAGE_KEYS.CUSTOM_PROMPT, prompt);
  },

  // ==================== Ollama Base URL ====================

  /**
   * Get the stored Ollama base URL
   * Defaults to DEFAULT_OLLAMA_BASE_URL if not set
   */
  getOllamaBaseUrl: (): string => {
    return getItem(STORAGE_KEYS.OLLAMA_BASE_URL) || DEFAULT_OLLAMA_BASE_URL;
  },

  /**
   * Store the Ollama base URL
   */
  setOllamaBaseUrl: (url: string): void => {
    setItem(STORAGE_KEYS.OLLAMA_BASE_URL, url);
  },

  // ==================== Bulk Operations ====================

  /**
   * Save all AI configuration settings at once
   */
  saveAll: (config: Partial<AIConfig>): void => {
    if (config.openaiKey !== undefined) {
      if (config.openaiKey) {
        aiConfigStorage.setOpenAIKey(config.openaiKey);
      } else {
        aiConfigStorage.clearOpenAIKey();
      }
    }

    if (config.geminiKey !== undefined) {
      if (config.geminiKey) {
        aiConfigStorage.setGeminiKey(config.geminiKey);
      } else {
        aiConfigStorage.clearGeminiKey();
      }
    }

    if (config.groqKey !== undefined) {
      if (config.groqKey) {
        aiConfigStorage.setGroqKey(config.groqKey);
      } else {
        aiConfigStorage.clearGroqKey();
      }
    }

    if (config.firecrawlKey !== undefined) {
      if (config.firecrawlKey) {
        aiConfigStorage.setFirecrawlKey(config.firecrawlKey);
      } else {
        aiConfigStorage.clearFirecrawlKey();
      }
    }

    if (config.provider !== undefined) {
      aiConfigStorage.setProvider(config.provider);
    }

    if (config.model !== undefined) {
      aiConfigStorage.setModel(config.model);
    }

    if (config.customPrompt !== undefined) {
      aiConfigStorage.setCustomPrompt(config.customPrompt);
    }

    if (config.ollamaBaseUrl !== undefined) {
      aiConfigStorage.setOllamaBaseUrl(config.ollamaBaseUrl);
    }
  },

  /**
   * Load all AI configuration settings at once
   */
  loadAll: (): AIConfig => {
    return {
      openaiKey: aiConfigStorage.getOpenAIKey() || '',
      geminiKey: aiConfigStorage.getGeminiKey() || '',
      groqKey: aiConfigStorage.getGroqKey() || '',
      firecrawlKey: aiConfigStorage.getFirecrawlKey() || '',
      provider: aiConfigStorage.getProvider(),
      model: aiConfigStorage.getModel() || DEFAULT_OPENAI_MODEL,
      customPrompt: aiConfigStorage.getCustomPrompt() || '',
      ollamaBaseUrl: aiConfigStorage.getOllamaBaseUrl(),
    };
  },

  /**
   * Clear all AI configuration settings
   */
  clearAll: (): void => {
    aiConfigStorage.clearOpenAIKey();
    aiConfigStorage.clearGeminiKey();
    aiConfigStorage.clearGroqKey();
    aiConfigStorage.clearFirecrawlKey();
    removeItem(STORAGE_KEYS.AI_MODEL);
    removeItem(STORAGE_KEYS.AI_PROVIDER);
    removeItem(STORAGE_KEYS.CUSTOM_PROMPT);
    removeItem(STORAGE_KEYS.OLLAMA_BASE_URL);
  },
};
