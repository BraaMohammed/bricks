/**
 * Ollama API utilities for local model management and communication
 */

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaModelsResponse {
  models: OllamaModel[];
}

export interface OllamaConnectionStatus {
  connected: boolean;
  models: string[];
  error?: string;
  modelCount: number;
}

export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaChatMessage[];
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    repeat_penalty?: number;
  };
}

export interface OllamaChatResponse {
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  created_at: string;
  model: string;
  // Optional fields for extended compatibility
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

const CONNECTION_TIMEOUT = 5000; // 5 seconds

/**
 * Get the Ollama base URL from localStorage or use default
 */
function getOllamaBaseUrl(): string {
  return localStorage.getItem('ollama_base_url') || 'http://localhost:11434';
}

/**
 * Check if Ollama is running and fetch available models
 */
export async function checkOllamaConnection(): Promise<OllamaConnectionStatus> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONNECTION_TIMEOUT);

    const baseUrl = getOllamaBaseUrl();
    const response = await fetch(`${baseUrl}/api/tags`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        connected: false,
        models: [],
        modelCount: 0,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json() as OllamaModelsResponse;
    const modelNames = data.models?.map(model => model.name) || [];

    return {
      connected: true,
      models: modelNames,
      modelCount: modelNames.length,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          connected: false,
          models: [],
          modelCount: 0,
          error: 'Connection timeout - Ollama may not be running',
        };
      }
      return {
        connected: false,
        models: [],
        modelCount: 0,
        error: error.message,
      };
    }
    return {
      connected: false,
      models: [],
      modelCount: 0,
      error: 'Unknown error occurred',
    };
  }
}

/**
 * Get detailed information about available Ollama models
 */
export async function getOllamaModels(): Promise<OllamaModel[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONNECTION_TIMEOUT);

    const baseUrl = getOllamaBaseUrl();
    const response = await fetch(`${baseUrl}/api/tags`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as OllamaModelsResponse;
    return data.models || [];
  } catch (error) {
    console.error('Failed to fetch Ollama models:', error);
    return [];
  }
}

/**
 * Send a chat completion request to Ollama
 */
export async function sendOllamaChatRequest(
  model: string,
  messages: OllamaChatMessage[],
  options?: OllamaChatRequest['options']
): Promise<OllamaChatResponse> {
  const requestBody: OllamaChatRequest = {
    model,
    messages,
    stream: false,
    options,
  };

  const baseUrl = getOllamaBaseUrl();
  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      stream: false,
      ...options,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  // Handle OpenAI-compatible response format (new default for Ollama)
  if (data.choices && data.choices[0] && data.choices[0].message) {
    return {
      message: {
        role: data.choices[0].message.role,
        content: data.choices[0].message.content,
      },
      done: true,
      created_at: data.created ? new Date(data.created * 1000).toISOString() : new Date().toISOString(),
      model: data.model || model,
      usage: data.usage ? {
        prompt_tokens: data.usage.prompt_tokens,
        completion_tokens: data.usage.completion_tokens,
        total_tokens: data.usage.total_tokens,
      } : undefined,
    };
  }

  // Fallback: Handle legacy native Ollama format (if still returned by some endpoints)
  if (data.message) {
    return data as OllamaChatResponse;
  }

  // If neither format is recognized, throw an error with details
  throw new Error(`Unexpected Ollama response format. Keys: ${Object.keys(data).join(', ')}. Data: ${JSON.stringify(data, null, 2)}`);
}

/**
 * Check if a specific model is available in Ollama
 */
export async function isModelAvailable(modelName: string): Promise<boolean> {
  try {
    const status = await checkOllamaConnection();
    return status.connected && status.models.includes(modelName);
  } catch {
    return false;
  }
}

/**
 * Get a user-friendly model name (remove version tags)
 */
export function getDisplayName(modelName: string): string {
  // Remove common version suffixes like :latest, :7b, :13b, etc.
  return modelName.split(':')[0];
}

/**
 * Group models by family (e.g., llama2, mistral, codellama)
 */
export function groupModelsByFamily(models: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  
  models.forEach(model => {
    const family = getDisplayName(model);
    if (!groups[family]) {
      groups[family] = [];
    }
    groups[family].push(model);
  });
  
  return groups;
}

/**
 * Suggest popular models for users to install
 */
export const SUGGESTED_MODELS = [
  {
    name: 'llama2',
    description: 'Meta\'s Llama 2 model - good general purpose model',
    command: 'ollama pull llama2',
    size: '3.8GB',
  },
  {
    name: 'mistral',
    description: 'Mistral 7B - efficient and capable model',
    command: 'ollama pull mistral',
    size: '4.1GB',
  },
  {
    name: 'codellama',
    description: 'Code-specialized Llama model for programming tasks',
    command: 'ollama pull codellama',
    size: '3.8GB',
  },
  {
    name: 'llama2:13b',
    description: 'Larger Llama 2 model - more capable but slower',
    command: 'ollama pull llama2:13b',
    size: '7.3GB',
  },
] as const;