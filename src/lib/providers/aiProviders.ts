/**
 * AI Provider Utilities
 * 
 * This module contains utility functions for working with different AI providers
 * (OpenAI, Ollama, Gemini, Groq) in a unified way.
 */

/**
 * Detects if a model name belongs to Ollama
 * @param modelName - The name of the model to check
 * @returns true if the model is an Ollama model
 */
export const isOllamaModel = (modelName: string): boolean => {
  const ollamaPatterns = [
    'llama', 'mistral', 'codellama', 'vicuna', 'alpaca', 'orca', 
    'phi', 'neural-chat', 'starling', 'openhermes', 'dolphin',
    'wizardlm', 'evo', 'gemma', 'qwen', 'mixtral'
  ];
  
  const lowerModel = modelName.toLowerCase();
  return ollamaPatterns.some(pattern => lowerModel.includes(pattern)) ||
         lowerModel.includes(':') && !lowerModel.startsWith('gpt');
};

/**
 * Detects if a model supports thinking/reasoning mode
 * @param modelName - The name of the model to check
 * @returns true if the model supports thinking mode
 */
export const detectThinkingSupport = (modelName: string): boolean => {
  const thinkingPatterns = [
    'deepseek', 'r1', 'thinking', 'reasoning', 'o1', 'o3', 'qwq'
  ];
  const lowerModel = modelName.toLowerCase();
  return thinkingPatterns.some(pattern => lowerModel.includes(pattern));
};

/**
 * Gets the API endpoint for a given provider and model
 * @param provider - The AI provider ('openai', 'ollama', 'gemini', or 'groq')
 * @param model - The model name
 * @param baseUrl - The base URL for Ollama (optional, defaults to localhost)
 * @returns The API endpoint URL
 */
export const getAPIEndpoint = (
  provider: 'openai' | 'ollama' | 'gemini' | 'groq',
  model: string,
  baseUrl?: string
): string => {
  switch (provider) {
    case 'groq':
      return 'https://api.groq.com/openai/v1/chat/completions';
    case 'ollama':
      return `${baseUrl || 'http://localhost:11434'}/v1/chat/completions`;
    case 'gemini':
      return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    case 'openai':
    default:
      return 'https://api.openai.com/v1/chat/completions';
  }
};

/**
 * Builds the request body for different AI providers
 * @param provider - The AI provider
 * @param model - The model name
 * @param prompt - The prompt text
 * @param settings - Additional settings (temperature, maxTokens, topK, thinkingMode)
 * @returns The request body object
 */
export const buildRequestBody = (
  provider: 'openai' | 'ollama' | 'gemini' | 'groq',
  model: string,
  prompt: string,
  settings: {
    temperature?: number;
    maxTokens?: number;
    topK?: number;
    thinkingMode?: boolean;
    hasCustomTemperature?: boolean;
    hasCustomMaxTokens?: boolean;
    hasCustomTopK?: boolean;
  }
): object => {
  const {
    temperature,
    maxTokens,
    topK,
    thinkingMode,
    hasCustomTemperature,
    hasCustomMaxTokens,
    hasCustomTopK
  } = settings;

  switch (provider) {
    case 'gemini': {
      const generationConfig: any = {};
      
      if (hasCustomTemperature && temperature !== undefined) {
        generationConfig.temperature = temperature;
      }
      
      if (hasCustomMaxTokens && maxTokens !== undefined) {
        generationConfig.maxOutputTokens = maxTokens;
      }
      
      return {
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig
      };
    }
    
    case 'groq': {
      // Groq uses OpenAI-compatible format
      const requestBody: any = {
        model,
        messages: [{
          role: 'user',
          content: prompt
        }]
      };
      
      if (hasCustomTemperature && temperature !== undefined) {
        requestBody.temperature = temperature;
      }
      
      if (hasCustomMaxTokens && maxTokens !== undefined) {
        requestBody.max_tokens = maxTokens;
      }
      
      return requestBody;
    }
    
    case 'ollama': {
      const ollamaOptions: any = {};
      
      if (hasCustomTemperature && temperature !== undefined) {
        ollamaOptions.temperature = temperature;
      }
      
      if (hasCustomMaxTokens && maxTokens !== undefined) {
        ollamaOptions.num_predict = maxTokens;
      }
      
      if (hasCustomTopK && topK !== undefined) {
        ollamaOptions.top_k = topK;
      }
      
      return {
        model,
        messages: [{
          role: 'user',
          content: prompt
        }],
        stream: false,
        think: thinkingMode || false,
        options: ollamaOptions
      };
    }
    
    case 'openai':
    default: {
      const requestBody: any = {
        model,
        messages: [{
          role: 'user',
          content: prompt
        }]
      };
      
      if (hasCustomTemperature && temperature !== undefined) {
        requestBody.temperature = temperature;
      }
      
      if (hasCustomMaxTokens && maxTokens !== undefined) {
        // Newer models (GPT-5, o-series) use 'max_completion_tokens'
        const useMaxCompletionTokens = model.startsWith('gpt-5') || model.startsWith('o');
        if (useMaxCompletionTokens) {
          requestBody.max_completion_tokens = maxTokens;
        } else {
          requestBody.max_tokens = maxTokens;
        }
      }
      
      return requestBody;
    }
  }
};

/**
 * Gets the authorization headers for different AI providers
 * @param provider - The AI provider
 * @param apiKey - The API key (not needed for Ollama)
 * @returns The headers object
 */
export const getAuthHeader = (
  provider: 'openai' | 'ollama' | 'gemini' | 'groq',
  apiKey?: string
): Record<string, string> => {
  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  switch (provider) {
    case 'ollama':
      // Ollama runs locally without API key
      return baseHeaders;
    
    case 'gemini':
      if (apiKey) {
        return {
          ...baseHeaders,
          'x-goog-api-key': apiKey
        };
      }
      return baseHeaders;
    
    case 'groq':
      if (apiKey) {
        return {
          ...baseHeaders,
          'Authorization': `Bearer ${apiKey}`
        };
      }
      return baseHeaders;
    
    case 'openai':
    default:
      if (apiKey) {
        return {
          ...baseHeaders,
          'Authorization': `Bearer ${apiKey}`
        };
      }
      return baseHeaders;
  }
};
