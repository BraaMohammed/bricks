/**
 * Agent Provider Router
 *
 * Maps a provider + model string to the correct Vercel AI SDK model instance.
 * Supports OpenAI, Google Gemini, Groq, and Ollama (via OpenAI-compatible adapter).
 */

import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { ollama } from 'ai-sdk-ollama';
import type { LanguageModel } from 'ai';

export interface AgentProviderConfig {
  provider: 'openai' | 'gemini' | 'groq' | 'ollama' | string;
  model: string;
  openaiKey?: string;
  geminiKey?: string;
  groqKey?: string;
  ollamaBaseUrl?: string;
  customBaseUrl?: string;
  customApiKey?: string;
}

/**
 * Returns a Vercel AI SDK LanguageModel instance for the given provider config.
 * Throws with a descriptive message if an API key is required but missing.
 */
export function getAgentModel(config: AgentProviderConfig): LanguageModel {
  const { provider, model } = config;

  switch (provider) {
    case 'waterfall': {
      const backendBase = config.customBaseUrl || (typeof localStorage !== 'undefined' ? localStorage.getItem('backend_api_url') : null) || 'http://localhost:3000';
      const client = createOpenAI({
        apiKey: 'not-needed',
        baseURL: `${backendBase.replace(/\/+$/, '')}/api/ai/v1`,
      });
      return client(model || 'deepseek-v4-flash');
    }

    case 'openai': {
      if (!config.openaiKey) {
        throw new Error('OpenAI API key is required. Add it in AI Configuration.');
      }
      const client = createOpenAI({ apiKey: config.openaiKey });
      return client(model || 'gpt-4o-mini');
    }

    case 'gemini': {
      if (!config.geminiKey) {
        throw new Error('Gemini API key is required. Add it in AI Configuration.');
      }
      const client = createGoogleGenerativeAI({ apiKey: config.geminiKey });
      return client(model || 'gemini-2.5-flash');
    }

    case 'groq': {
      if (!config.groqKey) {
        throw new Error('Groq API key is required. Add it in AI Configuration.');
      }
      const client = createGroq({ apiKey: config.groqKey });
      return client(model || 'llama-3.3-70b-versatile');
    }

    case 'ollama': {
      // Use the dedicated Ollama provider with proper tool calling support
      // It handles response synthesis automatically for tool calling
      const baseUrl = config.ollamaBaseUrl || 'http://localhost:11434';
      return ollama(model || 'llama3.1', {
        baseURL: baseUrl,
      } as any);
    }

    default:
      if (provider.startsWith('custom:')) {
        const client = createOpenAI({ 
          apiKey: config.customApiKey || '', 
          baseURL: config.customBaseUrl 
        });
        return client(model || 'default-model');
      }
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

/**
 * Read all agent-related API keys from localStorage.
 * Call this at the start of each agent run.
 */
export function readAgentKeysFromStorage(): Omit<AgentProviderConfig, 'provider' | 'model'> {
  return {
    openaiKey: localStorage.getItem('openai_api_key') ?? undefined,
    geminiKey: localStorage.getItem('gemini_api_key') ?? undefined,
    groqKey: localStorage.getItem('groq_api_key') ?? undefined,
    ollamaBaseUrl: localStorage.getItem('ollama_base_url') ?? 'http://localhost:11434',
    // Read custom providers array directly from localStorage
    ...(() => {
      try {
        const raw = localStorage.getItem('custom_ai_providers');
        if (!raw) return {};
        const providers = JSON.parse(raw);
        // Find the active custom provider based on ai_provider setting
        const activeProviderId = localStorage.getItem('ai_provider');
        if (activeProviderId?.startsWith('custom:')) {
          const active = providers.find((p: any) => p.id === activeProviderId);
          if (active) {
            return {
              customBaseUrl: active.baseUrl,
              customApiKey: active.apiKey
            };
          }
        }
        return {};
      } catch (e) {
        return {};
      }
    })()
  };
}
