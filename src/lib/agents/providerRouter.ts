/**
 * Agent Provider Router
 *
 * Maps a provider + model string to the correct Vercel AI SDK model instance.
 * Supports OpenAI, Google Gemini, Groq, and Ollama (via OpenAI-compatible adapter).
 */

import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { createOllama, ollama } from 'ai-sdk-ollama';
import type { LanguageModel } from 'ai';
import { OllamaChatSettings } from 'ai-sdk-ollama';

export interface AgentProviderConfig {
  provider: 'openai' | 'gemini' | 'groq' | 'ollama';
  model: string;
  openaiKey?: string;
  geminiKey?: string;
  groqKey?: string;
  ollamaBaseUrl?: string;
  thinkingMode?: boolean;
}

/**
 * Returns a Vercel AI SDK LanguageModel instance for the given provider config.
 * Throws with a descriptive message if an API key is required but missing.
 */
export function getAgentModel(config: AgentProviderConfig): LanguageModel {
  const { provider, model } = config;

  switch (provider) {
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
      const baseUrl = config.ollamaBaseUrl || 'http://localhost:11434';
      const ollamaProvider = createOllama({ baseURL: baseUrl });

      return ollamaProvider(model || 'llama3.1', {
        // Disable extended thinking at the Ollama API level.
        // The `think` flag is honoured by Ollama >=0.7 for models that
        // expose a thinking mode (e.g. qwen3, deepseek-r1, phi4-reasoning).
        think: false,
        // Extra safety: also set via the options object that maps to Ollama's
        // ModelOptions, which some builds check instead of the top-level flag.
        options: { thinking: false } as Record<string, unknown>,
      });
    }

    default:
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
  };
}
