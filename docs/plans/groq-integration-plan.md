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

#### Step 1.1: Add Groq Constants ⏳ TODO
**File:** `src/lib/constants/aiModels.ts`

**Tasks:**
- [ ] Add Groq to `PROVIDERS` array
- [ ] Create `groqModels` array with model definitions
- [ ] Add `GROQ_KEY` to `STORAGE_KEYS`
- [ ] Update `getProviderModels()` to include Groq case
- [ ] Add Groq icon import (use Zap icon from lucide-react)

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

#### Step 1.2: Create Groq Utilities Module ⏳ TODO
**File:** `src/lib/groq.ts` (NEW)

**Tasks:**
- [ ] Create new file with TypeScript interfaces
- [ ] Add `getGroqApiKey()` function
- [ ] Add `hasGroqApiKey()` function
- [ ] Add `isGroqModel()` helper function
- [ ] Add `sendGroqChatRequest()` function
- [ ] Add `testGroqConnection()` function
- [ ] Add proper error handling and type safety

**Implementation:**
```typescript
/**
 * Groq API Integration
 * 
 * Utilities for interacting with Groq's ultra-fast LPU inference API.
 * Compatible with OpenAI API format for easy integration.
 */

import { STORAGE_KEYS } from './constants/aiModels';

/**
 * Groq API base configuration
 */
const GROQ_API_BASE_URL = 'https://api.groq.com/openai/v1';

/**
 * Groq model type
 * Note: Free tier has 30 req/min rate limit for most models
 */
export type GroqModel = 
  | 'llama-3.3-70b-versatile'
  | 'qwen/qwen3-32b'
  | 'moonshotai/kimi-k2-instruct'
  | 'openai/gpt-oss-120b';

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
 */
ex// Free tier: 30 req/min for most models, 60 req/min for Qwen/Kimi
  const groqModels: GroqModel[] = [
    'llama-3.3-70b-versatile',
    'qwen/qwen3-32b',
    'moonshotai/kimi-k2-instruct',
    'openai/gpt-oss-120b-32768',
    'gemma2-9b-it',
  ];
  return groqModels.includes(model as GroqModel);
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

#### Step 1.3: Update AI Providers Helper ⏳ TODO
**File:** `src/lib/providers/aiProviders.ts`

**Tasks:**
- [ ] Import Groq utilities
- [ ] Update `getAPIEndpoint()` to handle Groq
- [ ] Update `buildRequestBody()` to handle Groq
- [ ] Update `getAuthHeader()` to handle Groq
- [ ] Add Groq to all type unions

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

#### Step 1.4: Update AI Agents Module ⏳ TODO
**File:** `src/lib/aiAgents.ts`

**Tasks:**
- [ ] Import Groq utilities (`isGroqModel`, `sendGroqChatRequest`)
- [ ] Update `getModelProvider()` to detect Groq models
- [ ] Update `getApiConfig()` to handle Groq provider
- [ ] Update `callMessageCreator()` - add Groq branch for API calls
- [ ] Update `callLeadRoleplay()` - add Groq branch for API calls
- [ ] Test with Groq models in both agents

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

#### Step 2.1: Update AI Config Storage ⏳ TODO
**File:** `src/lib/storage/aiConfigStorage.ts`

**Tasks:**
- [ ] Add `groqKey` to storage interface
- [ ] Add `getGroqKey()` method
- [ ] Add `setGroqKey()` method
- [ ] Add `clearGroqKey()` method
- [ ] Update `loadAll()` to include Groq key
- [ ] Update `clearAll()` to include Groq key

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

#### Step 2.2: Update useAISettings Hook ⏳ TODO
**File:** `src/hooks/useAISettings.ts`

**Tasks:**
- [ ] Add Groq key state management
- [ ] Add Groq to AIProvider type unions
- [ ] Update model selection logic for Groq
- [ ] Add Groq to `availableModels` calculation
- [ ] Update `saveAllSettings()` to save Groq key

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

#### Step 3.1: Update API Keys Section ⏳ TODO
**File:** `src/components/AIConfiguration/APIKeysSection.tsx`

**Tasks:**
- [ ] Add Groq API key input field
- [ ] Add Groq key visibility toggle
- [ ] Add Groq key clear button
- [ ] Add status indicator for Groq key
- [ ] Add link to Groq API keys page

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

#### Step 3.2: Create Groq Configuration Component ⏳ TODO
**File:** `src/components/AIConfiguration/GroqConfiguration.tsx` (NEW)

**Tasks:**
- [ ] Create new component for Groq-specific settings
- [ ] Add test connection button
- [ ] Add connection status indicator
- [ ] Add speed/latency display
- [ ] Add model information display
- [ ] Add helpful links to Groq documentation

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

#### Step 3.3: Update Provider Selector ⏳ TODO
**File:** `src/components/AIConfiguration/ProviderSelector.tsx`

**Tasks:**
- [ ] Add Groq option to provider dropdown
- [ ] Add Zap icon for Groq
- [ ] Update provider description

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

#### Step 3.4: Update AI Configuration Dialog ⏳ TODO
**File:** `src/components/AIConfiguration.tsx`

**Tasks:**
- [ ] Add Groq key props to APIKeysSection
- [ ] Add Groq configuration section (conditional render)
- [ ] Add `handleTestGroq` function
- [ ] Pass Groq state from useAISettings

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

#### Step 3.5: Update Model Selector ⏳ TODO
**File:** `src/components/AIConfiguration/ModelSelector.tsx`

**Tasks:**
- [ ] Add Groq provider case in model display
- [ ] Add Groq-specific help text
- [ ] Update model selection UI for Groq models

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

#### Step 4.1: Update Formula Generators ⏳ TODO
**File:** `src/lib/generators/formulaGenerators.ts`

**Tasks:**
- [ ] Import Groq utilities
- [ ] Add Groq detection in formula generation
- [ ] Update `generateFormulaCode()` for Groq API calls
- [ ] Add Groq-specific API endpoint handling
- [ ] Test generated formulas with Groq models

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

#### Step 4.2: Update Formula Validation ⏳ TODO
**File:** `src/hooks/useFormulaValidation.ts`

**Tasks:**
- [ ] Add Groq to provider type unions
- [ ] Update validation logic for Groq
- [ ] Add Groq-specific error messages

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
| **Total** | | **20 hours** |

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

### Future Enhancements
- [ ] Add streaming support for real-time responses
- [ ] Implement automatic provider failover (if Groq fails, try OpenAI)
- [ ] Add usage tracking and cost estimation
- [ ] Support for Groq's function calling capabilities
- [ ] Integration with Groq's batch processing API
- [ ] Add model performance benchmarks to UI

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
- [ ] Step 1.1: Add Groq Constants
- [ ] Step 1.2: Create Groq Utilities Module
- [ ] Step 1.3: Update AI Providers Helper
- [ ] Step 1.4: Update AI Agents Module

### Phase 2: Storage & State Management
- [ ] Step 2.1: Update AI Config Storage
- [ ] Step 2.2: Update useAISettings Hook

### Phase 3: UI Components
- [ ] Step 3.1: Update API Keys Section
- [ ] Step 3.2: Create Groq Configuration Component
- [ ] Step 3.3: Update Provider Selector
- [ ] Step 3.4: Update AI Configuration Dialog
- [ ] Step 3.5: Update Model Selector

### Phase 4: Formula Generation & Validation
- [ ] Step 4.1: Update Formula Generators
- [ ] Step 4.2: Update Formula Validation

### Phase 5: Testing & Documentation
- [ ] Step 5.1: Manual Testing
- [ ] Step 5.2: Integration Testing
- [ ] Step 5.3: Documentation Updates

---

**Status:** ⏳ Planning Complete - Ready for Implementation  
**Last Updated:** February 7, 2026  
**Created By:** GitHub Copilot
