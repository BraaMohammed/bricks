import { create } from 'zustand';
import { aiConfigStorage } from '@/lib/storage/aiConfigStorage';
import {
  STORAGE_KEYS,
  AIProvider,
  DEFAULT_OPENAI_MODEL,
  ModelDefinition,
  openAIModels,
  geminiModels,
  groqModels,
  waterfallModels,
  CustomProvider
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
  customProviders: CustomProvider[];

  setAiProvider: (provider: AIProvider) => void;
  setModel: (model: string) => void;
  setCustomPrompt: (prompt: string) => void;
  setOllamaBaseUrl: (url: string) => void;
  setTemperature: (value: number) => void;
  setMaxTokens: (value: number) => void;
  setTopK: (value: number) => void;
  setThinkingMode: (enabled: boolean) => void;
  setCustomProviders: (providers: CustomProvider[]) => void;
  addCustomProvider: (provider: CustomProvider) => void;
  removeCustomProvider: (id: string) => void;

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
  customProviders: initialConfig.customProviders || [],

  setAiProvider: (provider) => {
    set({ aiProvider: provider });
    if (provider === 'openai') {
      set({ model: DEFAULT_OPENAI_MODEL });
    } else if (provider === 'waterfall') {
      set({ model: 'deepseek-v4-flash' });
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

  setCustomProviders: (providers) => {
    set({ customProviders: providers });
    aiConfigStorage.saveCustomProviders(providers);
  },

  addCustomProvider: (provider) => {
    set((state) => {
      const providers = [...state.customProviders];
      const existingIndex = providers.findIndex(p => p.id === provider.id);
      if (existingIndex >= 0) {
        providers[existingIndex] = provider;
      } else {
        providers.push(provider);
      }
      aiConfigStorage.saveCustomProviders(providers);
      return { customProviders: providers };
    });
  },

  removeCustomProvider: (id) => {
    set((state) => {
      const providers = state.customProviders.filter(p => p.id !== id);
      aiConfigStorage.saveCustomProviders(providers);
      
      // If the active provider is being deleted, fallback to openai
      if (state.aiProvider === id) {
        aiConfigStorage.setProvider('openai');
        return { customProviders: providers, aiProvider: 'openai' };
      }
      
      return { customProviders: providers };
    });
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
      customProviders: config.customProviders || [],
    });
  }
}));

export const getAvailableModels = (
  aiProvider: AIProvider,
  ollamaModels: string[] = [],
  dynamicWaterfallModels: ModelDefinition[] = []
): ModelDefinition[] => {
  if (aiProvider === 'waterfall') {
    return dynamicWaterfallModels.length > 0 ? dynamicWaterfallModels : waterfallModels;
  } else if (aiProvider === 'openai') {
    return openAIModels;
  } else if (aiProvider === 'gemini') {
    return geminiModels;
  } else if (aiProvider === 'groq') {
    return groqModels;
  } else if (aiProvider === 'ollama') {
    return ollamaModels.map(modelName => ({
      id: modelName,
      name: modelName,
      supportsThinking: false,
      cost: 'Free (Local)'
    }));
  }
  return [];
};
