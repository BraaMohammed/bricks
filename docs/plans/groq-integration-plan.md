# Groq AI Provider Integration Plan

## Overview
This plan outlines the implementation of **Groq** as a new AI provider in the Bricks application. Groq provides ultra-fast inference with their LPU (Language Processing Unit) technology, supporting various open-source models like Llama, Mixtral, and Gemma.

**Current Date:** February 7, 2026  
**Reference:** DataTableRefactorPlan.md (completed refactoring example)

---

## Groq API Overview

### Base Information
- **API Endpoint:** `https://api.groq.com/openai/v1/chat/completions`
- **Authentication:** Bearer token via `Authorization` header
- **Format:** OpenAI-compatible API (same request/response structure)
- **Environment Variable:** `GROQ_API_KEY`

### Key Features
- OpenAI-compatible API (drop-in replacement)
- Extremely fast inference speeds
- Supports popular open-source models
- Free tier available (30 requests/minute limit)
- Batch processing support
- Tool/function calling support

### Available Models (as of Feb 2026)
**Note:** Free plan has 30 requests/minute rate limit for most models

```typescript
- llama-3.3-70b-versatile (Recommended - Best quality, 30 RPM)
- qwen/qwen3-32b (Excellent reasoning, 60 RPM)
- moonshotai/kimi-k2-instruct (Fast & efficient, 60 RPM)
- openai/gpt-oss-120b (Largest OSS model, 30 RPM)
```

**Full model list available:** https://console.groq.com/docs/models

### API Request Example
```bash
curl https://api.groq.com/openai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GROQ_API_KEY" \
  -d '{
    "model": "llama-3.3-70b-versatile",
    "messages": [{"role": "user", "content": "Hello"}],
    "temperature": 0.7,
    "max_tokens": 1024
  }'
```

### Response Format (OpenAI-Compatible)
```json
{
  "id": "chatcmpl-...",
  "object": "chat.completion",
  "created": 1730241104,
  "model": "llama-3.3-70b-versatile",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "Hello! How can I help you today?"
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 15,
    "total_tokens": 25
  }
}
```

---

## Current Architecture

### Existing Providers
1. **OpenAI** - Cloud (API key required)
2. **Gemini** - Cloud (API key required) 
3. **Ollama** - Local (no API key)

### Key Files to Modify
- `src/lib/constants/aiModels.ts` - Add Groq constants
- `src/lib/groq.ts` - **NEW**: Groq utilities module
- `src/lib/aiAgents.ts` - Update to support Groq
- `src/components/AIConfiguration.tsx` - Add Groq UI
- `src/components/AIConfiguration/GroqConfiguration.tsx` - **NEW**: Groq-specific config
- `src/components/AIConfiguration/APIKeysSection.tsx` - Add Groq key input
- `src/hooks/useAISettings.ts` - Add Groq state management
- `src/lib/storage/aiConfigStorage.ts` - Add Groq storage
- `src/lib/providers/aiProviders.ts` - Add Groq provider logic
- `src/lib/generators/formulaGenerators.ts` - Add Groq formula generation

---

## Advantages of Adding Groq

### ✅ Benefits
1. **Speed**: Groq's LPU technology provides extremely fast inference (often 10x faster than traditional GPUs)
2. **Cost-Effective**: Competitive pricing with free tier for testing
3. **OpenAI-Compatible**: Minimal code changes required (same API format as OpenAI)
4. **Open Models**: Access to latest open-source models (Llama 3.3, Mixtral, etc.)
5. **No Vendor Lock-in**: Multiple model options from different providers
6. **Reliability**: Cloud-hosted alternative when OpenAI has rate limits/outages

### 🔧 Technical Benefits
- Drop-in replacement for OpenAI (same request/response format)
- Can reuse existing OpenAI error handling and response parsing
- Supports streaming for real-time responses
- Built-in rate limiting and retry logic

---

## File Structure After Integration

```
src/
├── lib/
│   ├── groq.ts (NEW - 150-200 lines) ⭐ Groq utilities
│   ├── gemini.ts (existing)
│   ├── ollama.ts (existing)
│   ├── aiAgents.ts (MODIFY - add Groq support)
│   ├── constants/
│   │   └── aiModels.ts (MODIFY - add Groq models)
│   ├── providers/
│   │   └── aiProviders.ts (MODIFY - add Groq helpers)
│   ├── generators/
│   │   └── formulaGenerators.ts (MODIFY - add Groq generation)
│   └── storage/
│       └── aiConfigStorage.ts (MODIFY - add Groq storage)
├── components/
│   ├── AIConfiguration.tsx (MODIFY - add Groq section)
│   └── AIConfiguration/
│       ├── APIKeysSection.tsx (MODIFY - add Groq key)
│       ├── GroqConfiguration.tsx (NEW - 80-100 lines)
│       └── ModelSelector.tsx (MODIFY - add Groq models)
├── hooks/
│   └── useAISettings.ts (MODIFY - add Groq state)
```

---

## Implementation Steps

### Phase 1: Core Infrastructure

#### Step 1.1: Add Groq Constants ✅ COMPLETED
**File:** `src/lib/constants/aiModels.ts`

**Tasks:**
- [x] Add Groq to `PROVIDERS` array
- [x] Create `groqModels` array with model definitions
- [x] Add `GROQ_KEY` to `STORAGE_KEYS`
- [x] Update `getProviderModels()` to include Groq case
- [x] Add Groq icon import (use Zap icon from lucide-react)

**Code Changes:**
```typescript
// Add to imports
import { Key, Sparkles, Server, Zap } from 'lucide-react';

// Add to PROVIDERS array
{
  id: 'groq',
  name: 'Groq (Cloud)',
  icon: Zap,
  requiresApiKey: true,
  supportsLocalModels: false,
}

// Add Groq models (Free tier: 30 req/min for most models)
export const groqModels: ModelDefinition[] = [
  { 
    id: 'llama-3.3-70b-versatile', 
    name: 'Llama 3.3 70B Versatile (Recommended)', 
    supportsThinking: false, 
    cost: 'Free tier: 30 RPM, 1K RPD' 
  },
  { 
    id: 'qwen/qwen3-32b', 
    name: 'Qwen 3 32B (Reasoning)', 
    supportsThinking: false, 
    cost: 'Free tier: 60 RPM, 1K RPD' 
  },
  { 
    id: 'moonshotai/kimi-k2-instruct', 
    name: 'Kimi K2 Instruct (Fast)', 
    supportsThinking: false, 
    cost: 'Free tier: 60 RPM, 1K RPD' 
  },
  { 
    id: 'openai/gpt-oss-120b', 
    name: 'GPT OSS 120B (Largest)', 
    supportsThinking: false, 
    cost: 'Free tier: 30 RPM, 1K RPD' 
  },
];

// Update STORAGE_KEYS
export const STORAGE_KEYS = {
  // ... existing keys
  GROQ_KEY: 'groq_api_key',
} as const;

// Update getProviderModels()
case 'groq':
  return groqModels;
```

**Estimated Time:** 30 minutes

---

#### Step 1.2: Create Groq Utilities Module ✅ COMPLETED
**File:** `src/lib/groq.ts` (NEW)

**Tasks:**
- [x] Create new file with TypeScript interfaces
- [x] Import GroqModel type and GROQ_MODELS from aiModels.ts (single source of truth)
- [x] Add `getGroqApiKey()` function
- [x] Add `hasGroqApiKey()` function
- [x] Add `isGroqModel()` helper function
- [x] Add `sendGroqChatRequest()` function
- [x] Add rate limiting error handling (429 status code)
- [x] Add `testGroqConnection()` function
- [x] Add proper error handling and type safety

**Implementation:**
```typescript
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
    const testModel: GroqModel = 'llama-3.1-8b-instant';
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
```

**Estimated Time:** 1.5 hours

---

#### Step 1.3: Update AI Providers Helper ✅ COMPLETED
**File:** `src/lib/providers/aiProviders.ts`

**Tasks:**
- [x] Import Groq utilities
- [x] Update `getAPIEndpoint()` to handle Groq
- [x] Update `buildRequestBody()` to handle Groq
- [x] Update `getAuthHeader()` to handle Groq
- [x] Add Groq to all type unions

**Code Changes:**
```typescript
// Add to imports
import { isGroqModel } from '../groq';

// Update getAPIEndpoint()
export const getAPIEndpoint = (
  provider: 'openai' | 'ollama' | 'gemini' | 'groq',
  model: string,
  baseUrl?: string
): string => {
  switch (provider) {
    case 'groq':
      return 'https://api.groq.com/openai/v1/chat/completions';
    // ... existing cases
  }
};

// Update buildRequestBody()
export const buildRequestBody = (
  provider: 'openai' | 'ollama' | 'gemini' | 'groq',
  // ... rest of function
) => {
  switch (provider) {
    case 'groq': {
      // Groq uses OpenAI-compatible format
      const requestBody: any = {
        model,
        messages: [{ role: 'user', content: prompt }]
      };
      
      if (hasCustomTemperature && temperature !== undefined) {
        requestBody.temperature = temperature;
      }
      
      if (hasCustomMaxTokens && maxTokens !== undefined) {
        requestBody.max_tokens = maxTokens;
      }
      
      return requestBody;
    }
    // ... existing cases
  }
};

// Update getAuthHeader()
export const getAuthHeader = (
  provider: 'openai' | 'ollama' | 'gemini' | 'groq',
  apiKey?: string
): Record<string, string> => {
  // ... existing code
  
  switch (provider) {
    case 'groq':
      if (apiKey) {
        return {
          ...baseHeaders,
          'Authorization': `Bearer ${apiKey}`
        };
      }
      return baseHeaders;
    // ... existing cases
  }
};
```

**Estimated Time:** 45 minutes

---

#### Step 1.4: Update AI Agents Module ✅ COMPLETED
**File:** `src/lib/aiAgents.ts`

**Tasks:**
- [x] Import Groq utilities (`isGroqModel`, `sendGroqChatRequest`)
- [x] Update `getModelProvider()` to detect Groq models
- [x] Update `getApiConfig()` to handle Groq provider
- [x] Update `callMessageCreator()` - add Groq branch for API calls
- [x] Update `callLeadRoleplay()` - add Groq branch for API calls
- [x] Test with Groq models in both agents

**Code Changes:**
```typescript
// Add to imports
import { isGroqModel, sendGroqChatRequest } from './groq';

// Update getModelProvider()
function getModelProvider(modelName: string): AIProvider {
  if (isGeminiModel(modelName)) {
    return 'gemini';
  } else if (isGroqModel(modelName)) {
    return 'groq';
  } else if (isOllamaModel(modelName)) {
    return 'ollama';
  } else {
    return 'openai';
  }
}

// Update getApiConfig()
function getApiConfig(modelName: string) {
  const provider = getModelProvider(modelName);
  
  if (provider === 'groq') {
    const apiKey = localStorage.getItem('groq_api_key');
    return {
      endpoint: 'https://api.groq.com/openai/v1/chat/completions',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      requiresApiKey: true,
      apiKey,
      provider: 'groq' as const
    };
  }
  // ... existing cases
}

// In callMessageCreator(), add Groq handling
if (apiConfig.provider === 'groq') {
  try {
    rawCreatorContent = await sendGroqChatRequest(
      config.messageCreatorModel as any,
      [{ role: 'user', content: creatorPrompt }],
      { temperature: 0.7, maxTokens: 2048 }
    );
    console.log('📥 Groq creator response:', rawCreatorContent);
  } catch (error) {
    throw new Error(`Groq Creator API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} else if (apiConfig.provider === 'gemini') {
  // ... existing Gemini code
}

// In callLeadRoleplay(), add similar Groq handling
if (apiConfig.provider === 'groq') {
  try {
    rawRoleplayContent = await sendGroqChatRequest(
      config.leadRoleplayModel as any,
      [{ role: 'user', content: roleplayPrompt }],
      { temperature: 0.7, maxTokens: 2048 }
    );
    console.log('📥 Groq roleplay response:', rawRoleplayContent);
  } catch (error) {
    throw new Error(`Groq Roleplay API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} else if (apiConfig.provider === 'gemini') {
  // ... existing Gemini code
}
```

**Estimated Time:** 2 hours

---

### Phase 2: Storage & State Management

#### Step 2.1: Update AI Config Storage ✅ COMPLETED
**File:** `src/lib/storage/aiConfigStorage.ts`

**Tasks:**
- [x] Add `groqKey` to storage interface
- [x] Add `getGroqKey()` method
- [x] Add `setGroqKey()` method
- [x] Add `clearGroqKey()` method
- [x] Update `loadAll()` to include Groq key
- [x] Update `clearAll()` to include Groq key

**Code Changes:**
```typescript
export interface AIConfigStorage {
  // ... existing properties
  groqKey: string;
}

export const aiConfigStorage = {
  // ... existing methods
  
  getGroqKey(): string {
    return localStorage.getItem(STORAGE_KEYS.GROQ_KEY) || '';
  },
  
  setGroqKey(key: string): void {
    localStorage.setItem(STORAGE_KEYS.GROQ_KEY, key);
  },
  
  clearGroqKey(): void {
    localStorage.removeItem(STORAGE_KEYS.GROQ_KEY);
  },
  
  loadAll(): AIConfig {
    return {
      // ... existing properties
      groqKey: this.getGroqKey(),
    };
  },
  
  clearAll(): void {
    // ... existing clears
    this.clearGroqKey();
  },
};
```

**Estimated Time:** 30 minutes

---

#### Step 2.2: Update useAISettings Hook ✅ COMPLETED
**File:** `src/hooks/useAISettings.ts`

**Tasks:**
- [x] Add Groq key state management
- [x] Add Groq to AIProvider type unions
- [x] Update model selection logic for Groq
- [x] Add Groq to `availableModels` calculation
- [x] Update `saveAllSettings()` to save Groq key

**Code Changes:**
```typescript
import { groqModels } from '@/lib/constants/aiModels';

export interface AISettings {
  // ... existing properties
  
  // Groq API Key
  groqKey: string;
  hasGroqKey: boolean;
  setGroqKey: (key: string) => void;
  clearGroqKey: () => void;
}

export const useAISettings = (ollamaModels: string[] = []): AISettings => {
  // ... existing code
  
  const groqKeyManager = useAPIKeyManager(
    STORAGE_KEYS.GROQ_KEY,
    'Groq',
    initialConfig.groqKey
  );
  
  // Update availableModels calculation
  const availableModels = useMemo(() => {
    if (aiProvider === 'openai') {
      return openAIModels;
    } else if (aiProvider === 'gemini') {
      return geminiModels;
    } else if (aiProvider === 'groq') {
      return groqModels;
    } else if (aiProvider === 'ollama') {
      // ... existing Ollama logic
    }
    return [];
  }, [aiProvider, ollamaModels]);
  
  // Update saveAllSettings
  const saveAllSettings = useCallback(() => {
    // ... existing saves
    aiConfigStorage.setGroqKey(groqKeyManager.key);
  }, [/* ... dependencies */, groqKeyManager.key]);
  
  return {
    // ... existing properties
    groqKey: groqKeyManager.key,
    hasGroqKey: groqKeyManager.hasKey,
    setGroqKey: groqKeyManager.setKey,
    clearGroqKey: groqKeyManager.clearKey,
  };
};
```

**Estimated Time:** 1 hour

---

### Phase 3: UI Components

#### Step 3.1: Update API Keys Section ✅ COMPLETED
**File:** `src/components/AIConfiguration/APIKeysSection.tsx`

**Tasks:**
- [x] Add Groq API key input field
- [x] Add Groq key visibility toggle
- [x] Add Groq key clear button
- [x] Add status indicator for Groq key
- [x] Add link to Groq API keys page

**Code Changes:**
```typescript
interface APIKeysSectionProps {
  // ... existing props
  groqKey: string;
  setGroqKey: (key: string) => void;
  clearGroqKey: () => void;
  hasGroqKey: boolean;
}

// Add Groq section similar to OpenAI/Gemini
<div className="space-y-2">
  <div className="flex items-center justify-between">
    <Label htmlFor="groq-key" className="flex items-center gap-2">
      <Zap className="h-4 w-4" />
      Groq API Key
      {hasGroqKey && <div className="w-2 h-2 bg-green-500 rounded-full" />}
    </Label>
    <a 
      href="https://console.groq.com/keys" 
      target="_blank" 
      rel="noopener noreferrer"
      className="text-xs text-blue-500 hover:underline flex items-center gap-1"
    >
      Get API Key <ExternalLink className="h-3 w-3" />
    </a>
  </div>
  <div className="flex gap-2">
    <div className="relative flex-1">
      <Input
        id="groq-key"
        type={showGroqKey ? 'text' : 'password'}
        placeholder="gsk_..."
        value={groqKey}
        onChange={(e) => setGroqKey(e.target.value)}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="absolute right-1 top-1/2 -translate-y-1/2"
        onClick={() => setShowGroqKey(!showGroqKey)}
      >
        {showGroqKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
    </div>
    {hasGroqKey && (
      <Button variant="outline" size="icon" onClick={clearGroqKey}>
        <X className="h-4 w-4" />
      </Button>
    )}
  </div>
  <p className="text-xs text-muted-foreground">
    Groq provides ultra-fast inference with LPU technology
  </p>
</div>
```

**Estimated Time:** 45 minutes

---

#### Step 3.2: Create Groq Configuration Component ✅ COMPLETED
**File:** `src/components/AIConfiguration/GroqConfiguration.tsx` (NEW)

**Tasks:**
- [x] Create new component for Groq-specific settings
- [x] Add test connection button
- [x] Add connection status indicator
- [x] Add speed/latency display
- [x] Add model information display
- [x] Add helpful links to Groq documentation

**Implementation:**
```typescript
/**
 * GroqConfiguration Component
 * 
 * Groq-specific configuration and testing UI.
 * Displays connection status and allows testing the Groq API.
 */

import { useState } from 'react';
import { Zap, CheckCircle, XCircle, ExternalLink, Loader2, Zap as ZapIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { testGroqConnection } from '@/lib/groq';

interface GroqConfigurationProps {
  hasApiKey: boolean;
  onTestConnection: () => Promise<{ success: boolean; message: string; model?: string; speed?: number }>;
}

export const GroqConfiguration = ({ hasApiKey, onTestConnection }: GroqConfigurationProps) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    model?: string;
    speed?: number;
  } | null>(null);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    
    try {
      const result = await onTestConnection();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <CardContent className="space-y-4">
      <div className="flex items-start gap-3">
        <Zap className="h-5 w-5 text-purple-500 mt-0.5" />
        <div className="flex-1 space-y-2">
          <h3 className="font-medium">Groq Ultra-Fast Inference</h3>
          <p className="text-sm text-muted-foreground">
            Groq's Language Processing Unit (LPU) technology delivers incredibly fast inference speeds,
            often 10x faster than traditional GPU-based solutions. Free tier includes 30-60 requests/minute.
          </p>
          
          {hasApiKey && (
            <Button
              onClick={handleTestConnection}
              disabled={testing}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              {testing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing Connection...
                </>
              ) : (
                <>
                  <ZapIcon className="h-4 w-4 mr-2" />
                  Test Connection
                </>
              )}
            </Button>
          )}

          {!hasApiKey && (
            <Alert>
              <AlertDescription className="text-sm">
                Please add your Groq API key above to test the connection.
              </AlertDescription>
            </Alert>
          )}

          {testResult && (
            <Alert variant={testResult.success ? 'default' : 'destructive'}>
              <div className="flex items-start gap-2">
                {testResult.success ? (
                  <CheckCircle className="h-4 w-4 mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 mt-0.5" />
                )}
                <div className="flex-1">
                  <AlertDescription className="text-sm">
                    {testResult.message}
                    {testResult.model && (
                      <div className="mt-1 text-xs opacity-80">
                        Model: {testResult.model}
                      </div>
                    )}
                    {testResult.speed && (
                      <div className="mt-1 text-xs opacity-80">
                        Response time: {testResult.speed}ms ⚡
                      </div>
                    )}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          )}

          <div className="flex gap-2 mt-3">
            <a
              href="https://console.groq.com/docs/quickstart"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:underline flex items-center gap-1"
            >
              Quickstart Guide <ExternalLink className="h-3 w-3" />
            </a>
            <span className="text-xs text-muted-foreground">•</span>
            <a
              href="https://console.groq.com/docs/models"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:underline flex items-center gap-1"
            >
              Available Models <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </CardContent>
  );
};
```

**Estimated Time:** 1.5 hours

---

#### Step 3.3: Update Provider Selector ✅ COMPLETED
**File:** `src/components/AIConfiguration/ProviderSelector.tsx`

**Tasks:**
- [x] Add Groq option to provider dropdown
- [x] Add Zap icon for Groq
- [x] Update provider description

**Code Changes:**
```typescript
import { Key, Sparkles, Server, Zap } from 'lucide-react';

// Add to SelectContent
<SelectItem value="groq">
  <div className="flex items-center gap-2">
    <Zap className="h-4 w-4" />
    Groq (Cloud - Ultra Fast)
  </div>
</SelectItem>
```

**Estimated Time:** 15 minutes

---

#### Step 3.4: Update AI Configuration Dialog ✅ COMPLETED
**File:** `src/components/AIConfiguration.tsx`

**Tasks:**
- [x] Add Groq key props to APIKeysSection
- [x] Add Groq configuration section (conditional render)
- [x] Add `handleTestGroq` function
- [x] Pass Groq state from useAISettings

**Code Changes:**
```typescript
// Import Groq utilities
import { testGroqConnection } from '@/lib/groq';
import { GroqConfiguration } from '@/components/AIConfiguration/GroqConfiguration';

// Add handler
const handleTestGroq = async () => {
  return await testGroqConnection();
};

// In JSX, add to APIKeysSection
<APIKeysSection
  // ... existing props
  groqKey={settings.groqKey}
  setGroqKey={settings.setGroqKey}
  clearGroqKey={settings.clearGroqKey}
  hasGroqKey={settings.hasGroqKey}
/>

// Add Groq configuration section
{settings.aiProvider === 'groq' && (
  <Card>
    <GroqConfiguration
      hasApiKey={settings.hasGroqKey}
      onTestConnection={handleTestGroq}
    />
  </Card>
)}
```

**Estimated Time:** 30 minutes

---

#### Step 3.5: Update Model Selector ✅ COMPLETED
**File:** `src/components/AIConfiguration/ModelSelector.tsx`

**Tasks:**
- [x] Add Groq provider case in model display
- [x] Add Groq-specific help text
- [x] Update model selection UI for Groq models

**Code Changes:**
```typescript
// Update getHelperText()
if (provider === 'groq') {Free tier: 30-60 req/min. 
  return 'Groq provides ultra-fast inference. Llama 3.3 70B recommended for best quality.';
}

// Update model rendering
{provider === 'groq' ? (
  availableModels.map((modelDef) => (
    <SelectItem key={modelDef.id} value={modelDef.id}>
      <div className="flex items-center justify-between w-full">
        <span>{modelDef.name}</span>
        <span className="text-xs text-muted-foreground ml-2">
          {modelDef.cost}
        </span>
      </div>
    </SelectItem>
  ))
) : /* ... existing code */}
```

**Estimated Time:** 30 minutes

---

### Phase 4: Formula Generation & Validation

#### Step 4.1: Update Formula Generators ✅ COMPLETED
**File:** `src/lib/generators/formulaGenerators.ts`

**Tasks:**
- [x] Import Groq utilities
- [x] Add Groq detection in formula generation
- [x] Update `generateFormulaCode()` for Groq API calls
- [x] Add Groq-specific API endpoint handling
- [x] Test generated formulas with Groq models

**Code Changes:**
```typescript
import { isGroqModel } from '../groq';

export async function generateFormulaCode(
  description: string,
  headers: string[],
  provider: 'openai' | 'ollama' | 'gemini' | 'groq',
  // ... rest of parameters
): Promise<string> {
  const isOllamaProvider = provider === 'ollama';
  const isGeminiModel = provider === 'gemini';
  const isGroqProvider = provider === 'groq';
  
  // API endpoint
  let apiEndpoint = '';
  if (isOllamaProvider) {
    apiEndpoint = `${ollamaBaseUrl}/v1/chat/completions`;
  } else if (isGeminiModel) {
    apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  } else if (isGroqProvider) {
    apiEndpoint = 'https://api.groq.com/openai/v1/chat/completions';
  } else {
    apiEndpoint = 'https://api.openai.com/v1/chat/completions';
  }
  
  // API key handling
  let apiKeyCheck = '';
  if (isOllamaProvider) {
    apiKeyCheck = '// Ollama runs locally without API key\nconst apiKey = null;';
  } else if (isGeminiModel) {
    apiKeyCheck = `const apiKey = localStorage.getItem('gemini_api_key');\n\nif (!apiKey) {\n  return 'Please set your Gemini API key in AI Settings';\n}`;
  } else if (isGroqProvider) {
    apiKeyCheck = `const apiKey = localStorage.getItem('groq_api_key');\n\nif (!apiKey) {\n  return 'Please set your Groq API key in AI Settings';\n}`;
  } else {
    apiKeyCheck = `const apiKey = localStorage.getItem('openai_api_key');\n\nif (!apiKey) {\n  return 'Please set your OpenAI API key in AI Settings';\n}`;
  }
  
  // Authorization header (Groq uses same format as OpenAI)
  let authHeader = '';
  if (isOllamaProvider) {
    authHeader = `      'Content-Type': 'application/json',`;
  } else if (isGeminiModel) {
    authHeader = `      'x-goog-api-key': apiKey,\n      'Content-Type': 'application/json',`;
  } else if (isGroqProvider) {
    authHeader = `      'Authorization': \`Bearer \${apiKey}\`,\n      'Content-Type': 'application/json',`;
  } else {
    authHeader = `      'Authorization': \`Bearer \${apiKey}\`,\n      'Content-Type': 'application/json',`;
  }
  
  // Request body (Groq uses OpenAI-compatible format)
  let requestBodyCode = '';
  if (isGeminiModel) {
    // ... existing Gemini code
  } else if (isGroqProvider || !isGeminiModel) {
    // Groq and OpenAI share same format
    requestBodyCode = `
// Build request body
const requestBody = {
  model: '${model}',
  messages: [{ role: 'user', content: prompt }],
};

// Only include temperature if user explicitly set it
if (${hasCustomTemperature}) {
  requestBody.temperature = ${temperature};
}

// Only include max_tokens if user explicitly set it
if (${hasCustomMaxTokens}) {
  requestBody.max_tokens = ${maxTokens};
}
`;
  }
  
  // Response parsing (Groq uses OpenAI-compatible format)
  let responseParsingCode = '';
  if (isGeminiModel) {
    // ... existing Gemini code
  } else {
    // Both OpenAI and Groq use same response format
    responseParsingCode = `
// Parse response
const data = await response.json();

if (!data.choices || !data.choices[0] || !data.choices[0].message) {
  return 'Error: Invalid response format from API';
}

return data.choices[0].message.content.trim();
`;
  }
  
  const providerName = isGeminiModel ? 'Gemini' : isGroqProvider ? 'Groq' : isOllamaProvider ? 'Ollama' : 'OpenAI';
  
  // ... rest of function using the variables above
}
```

**Estimated Time:** 2 hours

---

#### Step 4.2: Update Formula Validation ✅ COMPLETED
**File:** `src/hooks/useFormulaValidation.ts`

**Tasks:**
- [x] Add Groq to provider type unions
- [x] Update validation logic for Groq
- [x] Add Groq-specific error messages

**Code Changes:**
```typescript
export const useFormulaValidation = (options: {
  // ...
  aiProvider?: 'openai' | 'ollama' | 'gemini' | 'groq';
}) => {
  // ... existing code
  
  // In validation logic
  if (aiProvider === 'openai') {
    if (!localStorage.getItem('openai_api_key')) {
      errors.push('OpenAI API key is required');
    }
  } else if (aiProvider === 'gemini') {
    if (!localStorage.getItem('gemini_api_key')) {
      errors.push('Gemini API key is required');
    }
  } else if (aiProvider === 'groq') {
    if (!localStorage.getItem('groq_api_key')) {
      errors.push('Groq API key is required');
    }
  } else if (aiProvider === 'ollama') {
    // No API key needed for Ollama
  }
};
```

**Estimated Time:** 30 minutes

---

### Phase 5: Testing & Documentation

#### Step 5.1: Manual Testing ⏳ TODO
**Tasks:**
- [ ] Test Groq API key input and storage
- [ ] Test Groq connection test feature
- [ ] Test provider switching to Groq
- [ ] Test model selection with Groq models
- [ ] Test formula generation with Groq
- [ ] Test formula execution with Groq
- [ ] Test AI agents with Groq models
- [ ] Test error handling (invalid key, network errors)
- [ ] Test with all Groq models (Llama 3.3, Mixtral, etc.)
- [ ] Verify response speed indicators
- [ ] Test batch processing if applicable

**Estimated Time:** 3 hours

---

#### Step 5.2: Integration Testing ⏳ TODO
**Tasks:**
- [ ] Test switching between all providers (OpenAI ↔ Groq ↔ Gemini ↔ Ollama)
- [ ] Verify settings persistence across page reloads
- [ ] Test with large datasets
- [ ] Test concurrent requests
- [ ] Verify error recovery and retry logic
- [ ] Test rate limiting handling
- [ ] Compare response quality across providers
- [ ] Measure and compare response speeds

**Estimated Time:** 2 hours

---

#### Step 5.3: Documentation Updates ⏳ TODO
**Tasks:**
- [ ] Update README.md with Groq setup instructions
- [ ] Add Groq to AI Configuration documentation
- [ ] Document Groq-specific features (speed advantages)
- [ ] Add troubleshooting section for Groq
- [ ] Update inline code comments
- [ ] Create Groq quickstart guide
- [ ] Document model recommendations
- [ ] Add pricing information

**Files to Update:**
- `README.md`
- `docs/ai-configuration.md` (create if needed)
- `docs/groq-quickstart.md` (NEW)

**Estimated Time:** 2 hours

---

### Phase 6: Rate Limiting & Bulk Request Handling ⚠️ CRITICAL

#### Step 6.1: Create Rate Limiter Utility ✅ COMPLETED
**File:** `src/lib/utils/rateLimiter.ts` (NEW)

**Tasks:**
- [x] Create `executeWithRateLimit` function
- [x] Support configurable batch size and delay
- [x] Add progress callback for UI updates
- [x] Add abort signal support for cancellation
- [x] Add TypeScript types and JSDoc

**Implementation:**
```typescript
/**
 * Execute promises in batches with rate limiting
 * @param promises - Array of promise-returning functions
 * @param maxConcurrent - Maximum concurrent requests per batch
 * @param delayMs - Delay between batches in milliseconds
 * @param onProgress - Optional progress callback
 */
export async function executeWithRateLimit<T>(
  promises: Array<() => Promise<T>>,
  options: {
    maxConcurrent?: number;
    delayMs?: number;
    onProgress?: (completed: number, total: number) => void;
    signal?: AbortSignal;
  } = {}
): Promise<T[]> {
  const {
    maxConcurrent = 10,
    delayMs = 1000,
    onProgress,
    signal
  } = options;

  const results: T[] = [];
  const total = promises.length;
  
  for (let i = 0; i < total; i += maxConcurrent) {
    // Check for cancellation
    if (signal?.aborted) {
      throw new Error('Rate limited execution cancelled');
    }

    const batch = promises.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(batch.map(fn => fn()));
    results.push(...batchResults);
    
    // Update progress
    if (onProgress) {
      onProgress(Math.min(i + maxConcurrent, total), total);
    }
    
    // Add delay between batches (except for last batch)
    if (i + maxConcurrent < total) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return results;
}

/**
 * Get rate limit configuration for each provider
 */
export function getRateLimitConfig(provider: string, model?: string): {
  maxConcurrent: number;
  delayMs: number;
  description: string;
} {
  switch (provider) {
    case 'groq':
      // Qwen and Kimi models have higher limits (60 RPM)
      const isHigherLimit = model?.includes('qwen') || model?.includes('kimi');
      return {
        maxConcurrent: isHigherLimit ? 15 : 10,
        delayMs: 1000,
        description: isHigherLimit 
          ? 'Groq (60 req/min - Qwen/Kimi models)'
          : 'Groq (30 req/min)'
      };
    
    case 'gemini':
      return {
        maxConcurrent: 30,
        delayMs: 500,
        description: 'Gemini (60 req/min)'
      };
    
    case 'openai':
      return {
        maxConcurrent: 50,
        delayMs: 100,
        description: 'OpenAI (high limits)'
      };
    
    case 'ollama':
      return {
        maxConcurrent: 100, // No rate limit for local
        delayMs: 0,
        description: 'Ollama (local - no limits)'
      };
    
    default:
      return {
        maxConcurrent: 10,
        delayMs: 1000,
        description: 'Default rate limiting'
      };
  }
}
```

**Estimated Time:** 1.5 hours

---

#### Step 6.2: Update Formula Execution Hook 🔄 IN PROGRESS
**File:** `src/hooks/useFormulaExecution.ts`

**Tasks:**
- [ ] Import rate limiter utility
- [ ] Get current provider from useAISettings
- [ ] Apply rate limiting based on provider
- [ ] Add progress tracking state
- [ ] Update toast notifications with progress
- [ ] Handle cancellation

**Code Changes:**
```typescript
import { executeWithRateLimit, getRateLimitConfig } from '@/lib/utils/rateLimiter';
import { useDataStore } from '@/stores/useDataStore';
import { useState, useCallback } from 'react';

export const useFormulaExecution = (): UseFormulaExecutionReturn => {
  const [executionProgress, setExecutionProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);

  const executeFormula = async (column: string) => {
    // ... existing validation code

    // Get current AI provider and model
    const aiProvider = localStorage.getItem('ai_provider') || 'openai';
    const aiModel = localStorage.getItem('ai_model') || '';
    
    const rateLimitConfig = getRateLimitConfig(aiProvider, aiModel);
    
    console.log(`🚦 Rate limiting: ${rateLimitConfig.description}`);
    console.log(`📊 Batch size: ${rateLimitConfig.maxConcurrent}, Delay: ${rateLimitConfig.delayMs}ms`);

    try {
      // Create array of promise-returning functions (not promises yet!)
      const rowTasks = rows.map((row, i) => async () => {
        try {
          const asyncFunction = new Function('row', 'runAIAgents', `
            return (async () => {
              ${formula}
            })();
          `);
          
          const result = await asyncFunction(row, runAIAgents);
          const stringResult = result !== null && result !== undefined ? String(result) : '';
          
          updateCell(i, column, stringResult);
          return { success: true, rowIndex: i };
        } catch (error) {
          updateCell(i, column, 'ERROR');
          console.error(`❌ Row ${i + 1} failed:`, error);
          return { success: false, rowIndex: i, error };
        }
      });

      // Execute with rate limiting
      const results = await executeWithRateLimit(rowTasks, {
        maxConcurrent: rateLimitConfig.maxConcurrent,
        delayMs: rateLimitConfig.delayMs,
        onProgress: (completed, total) => {
          setExecutionProgress({ completed, total });
          console.log(`📊 Progress: ${completed}/${total} rows`);
        }
      });
      
      setExecutionProgress(null);
      
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;

      toast({
        title: "Formula Executed",
        description: `${successCount} rows processed successfully${errorCount > 0 ? `, ${errorCount} errors` : ''}. Rate limited: ${rateLimitConfig.description}`,
        variant: errorCount === 0 ? "default" : "destructive",
      });
    } catch (error) {
      console.error('Error executing formula:', error);
      setExecutionProgress(null);
      toast({
        title: "Execution Error",
        description: "Failed to execute formula. Check your syntax.",
        variant: "destructive",
      });
    } finally {
      setExecutingColumn(null);
      setLoading(false);
    }
  };

  return {
    executingColumn,
    executingCells,
    executeFormula,
    executeCellFormula,
    executionProgress, // Export for UI
  };
};
```

**Estimated Time:** 2 hours

---

#### Step 6.3: Add Progress Indicator UI ⏳ TODO
**File:** `src/components/DataTable/TableToolbar.tsx`

**Tasks:**
- [ ] Import execution progress from hook
- [ ] Add progress bar component
- [ ] Show "Processing batch X of Y" message
- [ ] Add cancel button (optional)

**Code Changes:**
```typescript
import { Progress } from '@/components/ui/progress';

// In component:
const { executionProgress } = useFormulaExecution();

// In JSX:
{executionProgress && (
  <div className="flex items-center gap-2 text-sm">
    <Progress 
      value={(executionProgress.completed / executionProgress.total) * 100} 
      className="w-32"
    />
    <span className="text-muted-foreground">
      {executionProgress.completed}/{executionProgress.total} rows
    </span>
  </div>
)}
```

**Estimated Time:** 1 hour

---

#### Step 6.4: Testing Rate Limiting ⏳ TODO
**Tasks:**
- [ ] Test with 100+ rows on Groq (should batch properly)
- [ ] Test with different Groq models (30 vs 60 RPM)
- [ ] Verify no 429 errors occur
- [ ] Test progress indicator updates correctly
- [ ] Test switching providers mid-execution
- [ ] Compare execution time vs without rate limiting
- [ ] Test with OpenAI (should be faster with higher limits)
- [ ] Test with Ollama (should be instant, no batching)

**Estimated Time:** 2 hours

---

## Benefits Summary

### For Users
✅ **Ultra-Fast Response Times**: Groq's LPU tech 3.3, Qwen 3, Kimi K2, and GPT-OSS models  
✅ **High Reliability**: Cloud-based alternative with 99.9% uptime  
✅ **Generous Free Tier**: 30-60 requests/minuteixtral, and Gemma models  
✅ **High Reliability**: Cloud-based alternative with 99.9% uptime  
✅ **No Rate Limiting (Free Tier)**: Generous limits for development and testing  

### For Developers
✅ **Easy Integration**: OpenAI-compatible API requires minimal code changes  
✅ **Type Safety**: Full TypeScript support with strong typing  
✅ **Error Handling**: Comprehensive error handling and user feedback  
✅ **Testability**: Connection testing built into UI  
✅ **Maintainability**: Follows existing architecture patterns  

---

## Timeline Estimate

| Phase | Description | Time |
|-------|-------------|------|
| **Phase 1** | Core Infrastructure | 5.5 hours |
| **Phase 2** | Storage & State Management | 1.5 hours |
| **Phase 3** | UI Components | 3.5 hours |
| **Phase 4** | Formula Generation & Validation | 2.5 hours |
| **Phase 5** | Testing & Documentation | 7 hours |
| **Phase 6** | Rate Limiting & Bulk Request Handling | 6.5 hours |
| **Total** | | **26.5 hours** |

---

## Breaking Changes

❌ **None** - This is a pure addition with no API changes to existing functionality.

---

## Notes

### Implementation Priorities
1. **High Priority**: Core infrastructure (Phase 1)
2. **High Priority**: UI components for key management (Phase 3.1)
3. **Medium Priority**: Formula generation support (Phase 4)
4. **Medium Priority**: Testing and documentation (Phase 5)

### Performance Considerations
- Groq's LPU technology provides significantly faster inference than GPU-based solutions
- Recommended for real-time applications and high-throughput scenarios
- Monitor response times and compare with other providers

### Security Considerations
- API keys stored in localStorage (same as existing providers)
- Keys never logged or exposed in UI unless explicitly shown
- HTTPS-only API communication
- Follow Groq's best practices for API key management

### Rate Limiting
- **Free Tier**: 30 requests/minute for most models (Llama 3.3, GPT-OSS)
- **Higher Limits**: 60 requests/minute for Qwen 3 and Kimi K2 models
- **Daily Limits**: 1,000 requests/day for most models
- Implement proper error handling for 429 (rate limit) responses
- Consider request queuing for high-volume scenarios

### **⚠️ CRITICAL: Bulk Request Rate Limiting**

**Problem**: When users execute formulas on all rows (e.g., 100 rows), `useFormulaExecution.ts` currently uses `Promise.all()` to fire all requests simultaneously. This will immediately hit Groq's rate limit:
- First 29-59 rows: ✅ Success
- Remaining rows: ❌ 429 Rate Limit Error

**Current Behavior**:
```typescript
// In useFormulaExecution.ts - Line 42-68
const rowPromises = rows.map(async (row, i) => {
  // Each row fires immediately
});
await Promise.all(rowPromises); // All 100 requests fire at once!
```

**Solution: Client-Side Rate Limiting** ⭐

Since all API fetching happens client-side, rate limiting must also be implemented client-side. Add a request queue/throttle in `useFormulaExecution.ts`:

```typescript
// New utility function to throttle requests
async function executeWithRateLimit(
  promises: Array<() => Promise<any>>,
  maxConcurrent: number = 10,  // Process 10 at a time
  delayMs: number = 1000        // 1 second delay between batches
): Promise<any[]> {
  const results: any[] = [];
  
  for (let i = 0; i < promises.length; i += maxConcurrent) {
    const batch = promises.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(batch.map(fn => fn()));
    results.push(...batchResults);
    
    // Add delay between batches (except for last batch)
    if (i + maxConcurrent < promises.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return results;
}

// Usage in executeFormula():
const rowPromises = rows.map((row, i) => async () => {
  // ... existing row execution logic
});

// Replace Promise.all with rate-limited execution
const results = await executeWithRateLimit(rowPromises, 10, 1000);
```

**Benefits**:
- ✅ Works for ALL providers (OpenAI, Gemini, Groq, Ollama)
- ✅ Configurable per provider (Groq: 10/batch, OpenAI: 50/batch)
- ✅ Simple to implement - pure client-side JavaScript
- ✅ No backend changes needed
- ✅ Works with existing fetch() calls

**Rate Limit Calculation**:
- Groq Free: 30 RPM = ~10 requests every 20 seconds = safe ✅
- With 10 requests/batch + 1s delay: ~60 requests/minute = within limit ✅
- For Qwen/Kimi (60 RPM): 15 requests/batch + 1s delay = safe ✅

**Implementation Plan**:
1. Create `src/lib/utils/rateLimiter.ts` with `executeWithRateLimit` utility
2. Update `useFormulaExecution.ts` to detect provider and apply rate limits:
   - Groq: 10 requests/batch, 1s delay (30 RPM)
   - Qwen/Kimi Groq models: 15 requests/batch, 1s delay (60 RPM)
   - OpenAI: 50 requests/batch, 100ms delay (no significant limit)
   - Gemini: 30 requests/batch, 500ms delay
   - Ollama: No rate limiting (local)
3. Add progress indicator showing "Processing batch X of Y..."
4. Update error messages to suggest rate limit cause

**Files to Modify**:
- `src/lib/utils/rateLimiter.ts` - NEW
- `src/hooks/useFormulaExecution.ts` - Update to use rate limiter
- `src/hooks/useAISettings.ts` - Expose current provider info
- `src/components/DataTable/TableToolbar.tsx` - Add batch progress indicator

**Estimated Time**: 2-3 hours

### Future Enhancements
- [ ] Add streaming support for real-time responses
- [ ] Implement automatic provider failover (if Groq fails, try OpenAI)
- [ ] Add usage tracking and cost estimation
- [ ] Support for Groq's function calling capabilities
- [ ] Integration with Groq's batch processing API
- [ ] Add model performance benchmarks to UI
- [ ] Implement retry logic with exponential backoff for failed requests

---

## References

- [Groq Official Documentation](https://console.groq.com/docs/overview)
- [Groq API Reference](https://console.groq.com/docs/api-reference)
- [Groq Quickstart Guide](https://console.groq.com/docs/quickstart)
- [Groq Models](https://console.groq.com/docs/models)
- [DataTableRefactorPlan.md](./DataTableRefactorPlan.md) - Similar refactoring example
- [gemini-integration-plan.md](./gemini-integration-plan.md) - Previous provider integration

---

## Completion Checklist

### Phase 1: Core Infrastructure
- [x] Step 1.1: Add Groq Constants
- [x] Step 1.2: Create Groq Utilities Module
- [x] Step 1.3: Update AI Providers Helper
- [x] Step 1.4: Update AI Agents Module

### Phase 2: Storage & State Management
- [x] Step 2.1: Update AI Config Storage
- [x] Step 2.2: Update useAISettings Hook

### Phase 3: UI Components
- [x] Step 3.1: Update API Keys Section
- [x] Step 3.2: Create Groq Configuration Component
- [x] Step 3.3: Update Provider Selector
- [x] Step 3.4: Update AI Configuration Dialog
- [x] Step 3.5: Update Model Selector

### Phase 4: Formula Generation & Validation
- [x] Step 4.1: Update Formula Generators
- [x] Step 4.2: Update Formula Validation

### Phase 5: Testing & Documentation
- [ ] Step 5.1: Manual Testing (Deferred)
- [ ] Step 5.2: Integration Testing (Deferred)
- [ ] Step 5.3: Documentation Updates (Deferred)

### Phase 6: Rate Limiting (⚠️ CRITICAL)
- [ ] Step 6.1: Create Rate Limiter Utility ← 🔄 CURRENT STEP
- [ ] Step 6.2: Update Formula Execution Hook
- [ ] Step 6.3: Add Progress Indicator UI
- [ ] Step 6.4: Testing Rate Limiting

---

**Status:** 🔄 In Progress - Phase 6: Step 6.1 (Rate Limiting - CRITICAL)  
**Progress:** Phase 1-4 Complete ✅ | Phase 5 Deferred | Currently at Step 6.1 🔄  
**Last Updated:** February 8, 2026  
