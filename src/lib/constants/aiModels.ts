/**
 * AI Models and Configuration Constants
 * 
 * Central location for all AI-related constants including model lists,
 * default values, and localStorage keys.
 * 
 * ==========================================
 * TO ADD A NEW AI PROVIDER:
 * ==========================================
 * 1. Add entry to PROVIDERS array below
 * 2. Add models array in "AI MODELS BY PROVIDER" section
 * 3. Add storage key if needed in STORAGE_KEYS
 * 4. Update getProviderModels() function
 * 5. Update icon imports if needed
 */

import { Key, Sparkles, Server } from 'lucide-react';

/**
 * Model definition interface
 */
export interface ModelDefinition {
  id: string;
  name: string;
  supportsThinking: boolean;
  cost: string;
}

/**
 * ==========================================
 * AI PROVIDERS CONFIGURATION
 * ==========================================
 */

export const PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI (Cloud)',
    icon: Key,
    requiresApiKey: true,
    supportsLocalModels: false,
  },
  {
    id: 'gemini',
    name: 'Google Gemini (Cloud)',
    icon: Sparkles,
    requiresApiKey: true,
    supportsLocalModels: false,
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    icon: Server,
    requiresApiKey: false,
    supportsLocalModels: true,
  },
] as const;

/**
 * AI Provider type - automatically derived from PROVIDERS array
 */
export type AIProvider = typeof PROVIDERS[number]['id'];

/**
 * Helper function to get provider metadata by id
 */
export function getProviderById(providerId: AIProvider) {
  return PROVIDERS.find(provider => provider.id === providerId);
}

/**
 * ==========================================
 * AI MODELS BY PROVIDER
 * ==========================================
 */

/**
 * Available OpenAI models with metadata
 */
export const openAIModels: ModelDefinition[] = [
  { id: 'gpt-5', name: 'GPT-5 (Flagship)', supportsThinking: false, cost: 'TBD' },
  { id: 'gpt-5-mini', name: 'GPT-5 Mini', supportsThinking: false, cost: 'TBD' },
  { id: 'gpt-4o', name: 'GPT-4o (Latest)', supportsThinking: false, cost: '$5.00/$15.00 per 1M tokens' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', supportsThinking: false, cost: '$0.15/$0.60 per 1M tokens' },
  { id: 'o3', name: 'OpenAI o3 (Reasoning)', supportsThinking: true, cost: 'TBD' },
  { id: 'o3-pro', name: 'OpenAI o3-pro (Reasoning)', supportsThinking: true, cost: 'TBD' },
  { id: 'o4-mini', name: 'OpenAI o4-mini (Reasoning)', supportsThinking: true, cost: 'TBD' },
];

/**
 * Available Gemini models with metadata
 */
export const geminiModels: ModelDefinition[] = [
  { id: 'gemini-3-pro', name: 'Gemini 3 Pro (Latest)', supportsThinking: false, cost: 'Variable pricing' },
  { id: 'gemini-3-flash', name: 'Gemini 3 Flash', supportsThinking: false, cost: 'Variable pricing' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', supportsThinking: false, cost: '$1.25/M tokens' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', supportsThinking: false, cost: '$0.40/M tokens' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', supportsThinking: false, cost: '$0.10/M tokens' },
];

/**
 * Helper function to get models for a specific provider
 * Ollama models are fetched dynamically from the server
 */
export function getProviderModels(provider: AIProvider, ollamaModels: string[] = []): ModelDefinition[] {
  switch (provider) {
    case 'openai':
      return openAIModels;
    case 'gemini':
      return geminiModels;
    case 'ollama':
      return ollamaModels.map(model => ({
        id: model,
        name: model,
        supportsThinking: detectThinkingSupport(model),
        cost: 'Free (Local)',
      }));
    default:
      return [];
  }
}

/**
 * Helper function to detect if an Ollama model supports thinking mode
 */
function detectThinkingSupport(modelName: string): boolean {
  const thinkingPatterns = [
    'deepseek', 'r1', 'thinking', 'reasoning', 'o1', 'o3', 'qwq'
  ];
  const lowerModel = modelName.toLowerCase();
  return thinkingPatterns.some(pattern => lowerModel.includes(pattern));
}

/**
 * ==========================================
 * DEFAULT VALUES
 * ==========================================
 */

/**
 * Default OpenAI model to use when none is selected
 */
export const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini' as const;

/**
 * Default Ollama server base URL
 */
export const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434' as const;

/**
 * Default AI settings
 */
export const DEFAULT_AI_SETTINGS = {
  temperature: 0.7,
  maxTokens: 2048,
  topK: 40,
} as const;

/**
 * ==========================================
 * AI AGENTS DEFAULT INSTRUCTIONS
 * ==========================================
 */

/**
 * Default Message Creator instructions for AI Agents mode
 */
export const defaultMessageCreatorInstructions = `You are an expert copywriter creating personalized DM messages. 

CRITICAL: You MUST respond with ONLY a valid JSON object. No other text before or after.

REQUIRED JSON FORMAT:
{
  "message": "Your personalized message here",
  "reasoning": "Why this approach was chosen",
  "improvements_made": ["List of improvements based on previous feedback"],
  "personalization_used": ["Specific data points used for personalization"]
}

CONTEXT:
- Lead Data: {columns}
- User's Offer: {userOfferDetails}
- Chat History: {previousIterations}
- Additional Instructions: {customInstructions}

GUIDELINES:
- Keep under 200 characters for DMs
- Integrate user's offer naturally
- Personalize using lead data
- Learn from chat history feedback
- Follow user's additional instructions
- Include clear value proposition
- End with soft CTA

REMEMBER: Output ONLY the JSON object, nothing else.`;

/**
 * Default Lead Roleplay instructions for AI Agents mode
 */
export const defaultLeadRoleplayInstructions = `You roleplay as this lead prospect. Evaluate the message critically and decide approval.

CRITICAL: You MUST respond with ONLY a valid JSON object. No other text before or after.

REQUIRED JSON FORMAT:
{
  "approved": true/false,
  "score": 1-10,
  "feedback": "Your honest reaction as the lead",
  "specific_issues": ["List specific problems"],
  "suggested_improvements": ["Specific actionable suggestions"],
  "decision_reasoning": "Why you approved/rejected this message"
}

CONTEXT:
- Your Profile: {columns}
- Message to Evaluate: {message}
- Previous Iterations: {chatHistory}
- Additional Instructions: {customInstructions}

ROLEPLAY AS: {lead characteristics based on data}
ONLY approve (true) if message is 8+ score and genuinely compelling.
Consider: relevance, personalization, offer appeal, professionalism, likelihood to respond.

REMEMBER: Output ONLY the JSON object, nothing else.`;

/**
 * ==========================================
 * LOCALSTORAGE KEYS
 * ==========================================
 */

/**
 * localStorage keys used for persisting AI configuration
 */
export const STORAGE_KEYS = {
  // API Keys
  OPENAI_KEY: 'openai_api_key',
  FIRECRAWL_KEY: 'firecrawl_api_key',
  GEMINI_KEY: 'gemini_api_key',
  
  // AI Settings
  AI_MODEL: 'ai_model',
  AI_PROVIDER: 'ai_provider',
  CUSTOM_PROMPT: 'custom_ai_prompt',
  OLLAMA_BASE_URL: 'ollama_base_url',
  THINKING_MODE: 'thinking_mode',
  AI_TEMPERATURE: 'ai_temperature',
  AI_MAX_TOKENS: 'ai_max_tokens',
  AI_TOP_K: 'ai_top_k',
  
  // Add new storage keys here as needed
} as const;

/**
 * ==========================================
 * LEGACY COMPATIBILITY
 * ==========================================
 * These are kept for backwards compatibility
 */

/**
 * Legacy OpenAI models list (kept for backwards compatibility)
 */
export const OPENAI_MODELS = [
  'gpt-3.5-turbo',
  'gpt-4',
  'gpt-4-turbo',
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-5',
  'gpt-5-mini',
  'o3',
  'o3-pro',
  'o4-mini'
] as const;

/**
 * Legacy Gemini models list (kept for backwards compatibility)
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
 * OpenAI model type
 */
export type OpenAIModel = typeof OPENAI_MODELS[number];

/**
 * Gemini model type
 */
export type GeminiModel = typeof GEMINI_MODELS[number];
