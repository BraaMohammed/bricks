import { create } from 'zustand';
import { aiConfigStorage } from '@/lib/storage/aiConfigStorage';
import {
  STORAGE_KEYS,
  AIProvider,
  DEFAULT_OPENAI_MODEL,
  ModelDefinition,
  openAIModels,
  geminiModels,
  groqModels
} from '@/lib/constants/aiModels';

interface AISettingsState {
  aiProvider: AIProvider;
  model: string;
  customPrompt: string;
  ollamaBaseUrl: string;
  temperature: number;
  maxTokens: number;
  topK: number;
  thinkingMode: boolean;

  setAiProvider: (provider: AIProvider) => void;
  setModel: (model: string) => void;
  setCustomPrompt: (prompt: string) => void;
  setOllamaBaseUrl: (url: string) => void;
  setTemperature: (value: number) => void;
  setMaxTokens: (value: number) => void;
  setTopK: (value: number) => void;
  setThinkingMode: (enabled: boolean) => void;

  loadSettings: () => void;
}

const initialConfig = aiConfigStorage.loadAll();

export const useAISettingsStore = create<AISettingsState>((set, get) => ({
  aiProvider: initialConfig.provider,
  model: initialConfig.model || DEFAULT_OPENAI_MODEL,
  customPrompt: initialConfig.customPrompt,
  ollamaBaseUrl: initialConfig.ollamaBaseUrl,

  temperature: parseFloat(localStorage.getItem(STORAGE_KEYS.AI_TEMPERATURE) || '0.7'),
  maxTokens: parseInt(localStorage.getItem(STORAGE_KEYS.AI_MAX_TOKENS) || '2048'),
  topK: parseInt(localStorage.getItem(STORAGE_KEYS.AI_TOP_K) || '40'),
  thinkingMode: localStorage.getItem(STORAGE_KEYS.THINKING_MODE) === 'true',

  setAiProvider: (provider) => {
    set({ aiProvider: provider });
    if (provider === 'openai') {
      set({ model: DEFAULT_OPENAI_MODEL });
    } else {
      set({ model: '' });
    }
    aiConfigStorage.setProvider(provider);
  },

  setModel: (model) => {
    set({ model });
    aiConfigStorage.setModel(model);
  },

  setCustomPrompt: (prompt) => {
    set({ customPrompt: prompt });
    aiConfigStorage.setCustomPrompt(prompt);
  },

  setOllamaBaseUrl: (url) => {
    set({ ollamaBaseUrl: url });
    aiConfigStorage.setOllamaBaseUrl(url);
  },

  setTemperature: (value) => {
    set({ temperature: value });
    localStorage.setItem(STORAGE_KEYS.AI_TEMPERATURE, value.toString());
  },

  setMaxTokens: (value) => {
    set({ maxTokens: value });
    localStorage.setItem(STORAGE_KEYS.AI_MAX_TOKENS, value.toString());
  },

  setTopK: (value) => {
    set({ topK: value });
    localStorage.setItem(STORAGE_KEYS.AI_TOP_K, value.toString());
  },

  setThinkingMode: (enabled) => {
    set({ thinkingMode: enabled });
    localStorage.setItem(STORAGE_KEYS.THINKING_MODE, enabled.toString());
  },

  loadSettings: () => {
    const config = aiConfigStorage.loadAll();
    set({
      aiProvider: config.provider,
      model: config.model || DEFAULT_OPENAI_MODEL,
      customPrompt: config.customPrompt,
      ollamaBaseUrl: config.ollamaBaseUrl,
      temperature: parseFloat(localStorage.getItem(STORAGE_KEYS.AI_TEMPERATURE) || '0.7'),
      maxTokens: parseInt(localStorage.getItem(STORAGE_KEYS.AI_MAX_TOKENS) || '2048'),
      topK: parseInt(localStorage.getItem(STORAGE_KEYS.AI_TOP_K) || '40'),
      thinkingMode: localStorage.getItem(STORAGE_KEYS.THINKING_MODE) === 'true',
    });
  }
}));

export const getAvailableModels = (aiProvider: AIProvider, ollamaModels: string[]): ModelDefinition[] => {
  if (aiProvider === 'openai') {
    return openAIModels;
  } else if (aiProvider === 'gemini') {
    return geminiModels;
  } else if (aiProvider === 'groq') {
    return groqModels;
  } else {
    return ollamaModels.map(modelName => ({
      id: modelName,
      name: modelName,
      supportsThinking: false,
      cost: 'Free (Local)'
    }));
  }
};
