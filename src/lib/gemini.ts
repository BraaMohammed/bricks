/**
 * Google Gemini API Integration
 * 
 * Utilities for interacting with Google's Gemini API.
 * Handles API key management, request formatting, and response parsing.
 */

import { STORAGE_KEYS, GEMINI_MODELS, type GeminiModel } from './constants/aiModels';

/**
 * Gemini API base configuration
 */
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Message format for Gemini API
 */
export interface GeminiMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

/**
 * Gemini chat request structure
 */
export interface GeminiChatRequest {
  contents: GeminiMessage[];
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
    topK?: number;
  };
}

/**
 * Gemini API response structure
 */
export interface GeminiChatResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    finishReason?: string;
    index?: number;
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

/**
 * Get the stored Gemini API key
 */
export function getGeminiApiKey(): string {
  return localStorage.getItem(STORAGE_KEYS.GEMINI_KEY) || '';
}

/**
 * Check if a Gemini API key is configured
 */
export function hasGeminiApiKey(): boolean {
  return !!getGeminiApiKey();
}

/**
 * Check if a model is a Gemini model
 */
export function isGeminiModel(model: string): model is GeminiModel {
  return GEMINI_MODELS.includes(model as GeminiModel);
}

/**
 * Convert OpenAI-style messages to Gemini format
 * Note: Gemini doesn't have a separate 'system' role, so system messages
 * are prepended to the first user message
 */
export function convertMessagesToGemini(messages: Array<{ role: string; content: string }>): GeminiMessage[] {
  const geminiMessages: GeminiMessage[] = [];
  let systemPrompt = '';

  for (const message of messages) {
    if (message.role === 'system') {
      // Collect system prompts
      systemPrompt += (systemPrompt ? '\n\n' : '') + message.content;
    } else if (message.role === 'user') {
      // Prepend system prompt to first user message if exists
      const content = systemPrompt 
        ? `${systemPrompt}\n\n${message.content}`
        : message.content;
      
      geminiMessages.push({
        role: 'user',
        parts: [{ text: content }]
      });
      
      // Clear system prompt after first use
      systemPrompt = '';
    } else if (message.role === 'assistant') {
      geminiMessages.push({
        role: 'model',
        parts: [{ text: message.content }]
      });
    }
  }

  // If only system messages exist, create a user message with the system content
  if (geminiMessages.length === 0 && systemPrompt) {
    geminiMessages.push({
      role: 'user',
      parts: [{ text: systemPrompt }]
    });
  }

  return geminiMessages;
}

/**
 * Send a chat request to Gemini API
 */
export async function sendGeminiChatRequest(
  model: GeminiModel,
  messages: Array<{ role: string; content: string }>,
  options?: {
    temperature?: number;
    maxOutputTokens?: number;
  }
): Promise<string> {
  const apiKey = getGeminiApiKey();
  
  if (!apiKey) {
    throw new Error('Gemini API key is not configured. Please add your API key in AI Configuration.');
  }

  const geminiMessages = convertMessagesToGemini(messages);
  
  const requestBody: GeminiChatRequest = {
    contents: geminiMessages,
    generationConfig: {
      temperature: options?.temperature ?? 0.7,
      maxOutputTokens: options?.maxOutputTokens ?? 2048,
    }
  };

  const url = `${GEMINI_API_BASE_URL}/models/${model}:generateContent`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      
      if (response.status === 401) {
        throw new Error('Invalid Gemini API key. Please check your API key in AI Configuration.');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later or upgrade your Gemini API plan.');
      } else if (response.status === 400) {
        throw new Error(`Bad request: ${errorMessage}`);
      }
      
      throw new Error(`Gemini API error: ${errorMessage}`);
    }

    const data: GeminiChatResponse = await response.json();

    // Extract text from response
    if (data.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0];
      if (candidate.content?.parts && candidate.content.parts.length > 0) {
        return candidate.content.parts[0].text;
      }
    }

    throw new Error('No response generated from Gemini API');
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to communicate with Gemini API. Please check your internet connection.');
  }
}

/**
 * Test the Gemini API connection
 */
export async function testGeminiConnection(): Promise<{ success: boolean; message: string; model?: string }> {
  try {
    const apiKey = getGeminiApiKey();
    
    if (!apiKey) {
      return {
        success: false,
        message: 'No API key configured'
      };
    }

    // Use the most cost-effective model for testing
    const testModel: GeminiModel = 'gemini-2.5-flash-lite';
    
    const testMessages = [
      { role: 'user', content: 'Reply with just the word "success" and nothing else.' }
    ];

    const response = await sendGeminiChatRequest(testModel, testMessages, {
      temperature: 0,
      maxOutputTokens: 10,
    });

    return {
      success: true,
      message: 'Connection successful!',
      model: testModel
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
