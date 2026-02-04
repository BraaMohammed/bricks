/**
 * AI Models and Configuration Constants
 * 
 * Central location for all AI-related constants including model lists,
 * default values, and localStorage keys.
 */

/**
 * Available OpenAI models for selection
 */
export const OPENAI_MODELS = [
  'gpt-3.5-turbo',
  'gpt-4',
  'gpt-4-turbo',
  'gpt-4o',
  'gpt-4o-mini'
] as const;

/**
 * Default OpenAI model to use when none is selected
 */
export const DEFAULT_OPENAI_MODEL = 'gpt-3.5-turbo' as const;

/**
 * Default Ollama server base URL
 */
export const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434' as const;

/**
 * localStorage keys used for persisting AI configuration
 */
export const STORAGE_KEYS = {
  OPENAI_KEY: 'openai_api_key',
  FIRECRAWL_KEY: 'firecrawl_api_key',
  AI_MODEL: 'ai_model',
  AI_PROVIDER: 'ai_provider',
  CUSTOM_PROMPT: 'custom_ai_prompt',
  OLLAMA_BASE_URL: 'ollama_base_url',
} as const;

/**
 * AI Provider types
 */
export type AIProvider = 'openai' | 'ollama';

/**
 * OpenAI model type
 */
export type OpenAIModel = typeof OPENAI_MODELS[number];
