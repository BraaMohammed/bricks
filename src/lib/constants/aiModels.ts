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
  GEMINI_KEY: 'gemini_api_key',
  AI_MODEL: 'ai_model',
  AI_PROVIDER: 'ai_provider',
  CUSTOM_PROMPT: 'custom_ai_prompt',
  OLLAMA_BASE_URL: 'ollama_base_url',
} as const;

/**
 * Available Gemini models for selection
 */
export const GEMINI_MODELS = [
  'gemini-3-pro',
  'gemini-3-flash',
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite'
] as const;

/**
 * Gemini model information with metadata
 */
export const GEMINI_MODEL_INFO = {
  'gemini-3-pro': {
    name: 'Gemini 3 Pro',
    description: 'Most capable model, 50%+ better than 2.5 Pro',
    contextWindow: '2M tokens',
    pricing: 'Variable pricing',
    tier: 'latest'
  },
  'gemini-3-flash': {
    name: 'Gemini 3 Flash',
    description: 'Fast with advanced reasoning',
    contextWindow: '1M tokens',
    pricing: 'Variable pricing',
    tier: 'latest'
  },
  'gemini-2.5-pro': {
    name: 'Gemini 2.5 Pro',
    description: 'Stable production model with high capability',
    contextWindow: '1M tokens',
    pricing: '$1.25/M input (≤200k)',
    tier: 'stable'
  },
  'gemini-2.5-flash': {
    name: 'Gemini 2.5 Flash',
    description: 'Fast and efficient for most tasks',
    contextWindow: '1M tokens',
    pricing: '$0.40/M input (≤200k)',
    tier: 'stable'
  },
  'gemini-2.5-flash-lite': {
    name: 'Gemini 2.5 Flash Lite',
    description: 'Best value option for high-volume tasks',
    contextWindow: '1M tokens',
    pricing: '$0.10/M input',
    tier: 'stable'
  }
} as const;

/**
 * AI Provider types
 */
export type AIProvider = 'openai' | 'ollama' | 'gemini';

/**
 * OpenAI model type
 */
export type OpenAIModel = typeof OPENAI_MODELS[number];

/**
 * Gemini model type
 */
export type GeminiModel = typeof GEMINI_MODELS[number];
