/**
 * Groq API Integration
 * 
 * Utilities for interacting with Groq's ultra-fast LPU inference API.
 * Compatible with OpenAI API format for easy integration.
 */

import { STORAGE_KEYS, GROQ_MODELS, type GroqModel } from './constants/aiModels';

/**
 * Groq API base configuration
 */
const GROQ_API_BASE_URL = 'https://api.groq.com/openai/v1';

/**
 * Get the stored Groq API key
 */
export function getGroqApiKey(): string {
  return localStorage.getItem(STORAGE_KEYS.GROQ_KEY) || '';
}

/**
 * Check if a Groq API key is configured
 */
export function hasGroqApiKey(): boolean {
  return !!getGroqApiKey();
}

/**
 * Check if a model is a Groq model
 * Rate limits (Free tier):
 * - Most models: 30 requests/min, 1K requests/day
 * - Qwen/Kimi models: 60 requests/min, 1K requests/day
 */
export function isGroqModel(model: string): boolean {
  return GROQ_MODELS.includes(model as GroqModel);
}

/**
 * Send a chat request to Groq API (OpenAI-compatible)
 */
export async function sendGroqChatRequest(
  model: GroqModel,
  messages: Array<{ role: string; content: string }>,
  options?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  }
): Promise<string> {
  const apiKey = getGroqApiKey();
  
  if (!apiKey) {
    throw new Error('Groq API key is not configured. Please add your API key in AI Configuration.');
  }
  
  // Free tier rate limit: 30 req/min for most models
  const requestBody = {
    model,
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 1024,
    top_p: options?.topP ?? 1,
  };

  const url = `${GROQ_API_BASE_URL}/chat/completions`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || 
        `Groq API error: ${response.status} ${response.statusText}`
      );
    }
      // Handle rate limiting specifically
      if (response.status === 429) {
        throw new Error(
          'Groq rate limit exceeded. Free tier: 30-60 req/min, 1K req/day. Please wait before retrying.'
        );
      }
      
      

    const data = await response.json();
    
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from Groq API');
    }

    return data.choices[0].message.content;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error occurred while calling Groq API');
  }
}

/**
 * Test the Groq API connection
 */
export async function testGroqConnection(): Promise<{ 
  success: boolean; 
  message: string; 
  model?: string;
  speed?: number;
}> {
  try {
    const testModel: GroqModel = 'llama-3.3-70b-versatile';
    const testMessages = [{ role: 'user', content: 'Say "Connection successful" in 3 words or less.' }];
    
    const startTime = Date.now();
    const response = await sendGroqChatRequest(testModel, testMessages, {
      temperature: 0.5,
      maxTokens: 50,
    });
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    return {
      success: true,
      message: `Connected successfully! Response: "${response.trim()}"`,
      model: testModel,
      speed: responseTime,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error 
        ? `Connection failed: ${error.message}`
        : 'Connection failed with unknown error',
    };
  }
}
