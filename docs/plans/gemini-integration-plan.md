# Google Gemini Integration Plan

**Date:** February 4, 2026  
**Target:** Bricks Application  
**Goal:** Add Google Gemini as a third AI provider alongside OpenAI and Ollama

---

## Overview

Add Google Gemini models to the Bricks application, following the existing architecture patterns for OpenAI and Ollama providers.

### Key Benefits
- **Latest models**: Gemini 3 Pro/Flash (GA), Gemini 2.5 family
- **Competitive pricing**: Flash-Lite at $0.10/M vs GPT-4o-mini at $0.15/M
- **Large context**: 1M-2M token windows
- **Free tier**: Available for testing (20-100 requests/day)
- **Multimodal**: Text, images, audio, video support

---

## Current Architecture

### Existing Providers
1. **OpenAI** - Cloud (API key required)
2. **Ollama** - Local (no API key)

### Key Files to Modify
- `src/lib/constants/aiModels.ts` - Add Gemini constants
- `src/lib/gemini.ts` - NEW: Gemini utilities
- `src/lib/aiAgents.ts` - Update to support Gemini
- `src/components/AIConfiguration.tsx` - Add Gemini UI
- `src/components/AIConfiguration/` - Provider components
- `src/hooks/useAISettings.ts` - Add Gemini state
- `src/lib/storage/aiConfigStorage.ts` - Add Gemini storage

---

## Gemini Models (February 2026)

### Available Models

**Gemini 3 Series (Latest - GA)**
- `gemini-3-pro` - Most capable, 50%+ better than 2.5 Pro
- `gemini-3-flash` - Fast with advanced reasoning

**Gemini 2.5 Series (Stable Production)**
- `gemini-2.5-pro` - $1.25/M input (≤200k)
- `gemini-2.5-flash` - $0.40/M input (≤200k)
- `gemini-2.5-flash-lite` - $0.10/M input (best value)

### API Details

**Base URL:** `https://generativelanguage.googleapis.com/v1beta`  
**Endpoint:** `/models/{model}:generateContent`  
**Auth:** `x-goog-api-key` header or `?key=` query param  
**Context:** 1M-2M tokens depending on model

### Key Differences from OpenAI
- No separate `system` role (prepend to user message)
- Response format: `candidates[0].content.parts[0].text`
- Request format: `contents` array with `parts`
- Free tier available with daily limits

---

## Implementation Steps

### Phase 1: Core Infrastructure

#### Step 1.1: Update Constants & Types ✅ COMPLETE
**File:** `src/lib/constants/aiModels.ts`

- [x] Add `'gemini'` to `AIProvider` type
- [x] Create `GEMINI_MODELS` array with 5 models
- [x] Add `GEMINI_KEY` to `STORAGE_KEYS`
- [x] Create `GEMINI_MODEL_INFO` with metadata for each model
- [x] Export `GeminiModel` type

**Estimated Time:** 30 minutes

---

#### Step 1.2: Create Gemini Utility Module ✅ COMPLETE
**File:** `src/lib/gemini.ts` (NEW)

- [x] Create interfaces: `GeminiMessage`, `GeminiChatRequest`, `GeminiChatResponse`
- [x] Implement `getGeminiApiKey()` and `hasGeminiApiKey()`
- [x] Implement `convertMessagesToGemini()` - handle system prompts
- [x] Implement `sendGeminiChatRequest()` - main API call function
- [x] Implement `testGeminiConnection()` - test API with simple request
- [x] Implement `isGeminiModel()` - model detection helper
- [x] Add proper error handling for all API calls

**Estimated Time:** 2 hours

---

#### Step 1.3: Update AI Agents Module ✅ COMPLETE
**File:** `src/lib/aiAgents.ts`

- [x] Import Gemini utilities (`isGeminiModel`, `sendGeminiChatRequest`)
- [x] Create `getModelProvider()` function (returns 'openai' | 'ollama' | 'gemini')
- [x] Update `getApiConfig()` to handle Gemini provider
- [x] Update `callMessageCreator()` - add Gemini branch for API calls
- [x] Update `callLeadRoleplay()` - add Gemini branch for API calls
- [x] Handle Gemini response format: `candidates[0].content.parts[0].text`
- [x] Test with Gemini models in both agents

**Estimated Time:** 3 hours

---

### Phase 2: UI Components

#### Step 2.1: Update ProviderSelector Component ✅ COMPLETE
**File:** `src/components/AIConfiguration/ProviderSelector.tsx`

- [ ] Add Gemini option to provider Select dropdown
- [ ] Add Sparkles icon for Gemini
- [ ] Update description text to include Gemini
- [ ] Update type to accept `'gemini'` value

**Estimated Time:** 30 minutes

---

#### Step 2.2: Create GeminiConfiguration Component ✅ COMPLETE
**File:** `src/components/AIConfiguration/GeminiConfiguration.tsx` (NEW)

- [ ] Create component showing Gemini API status
- [ ] Add "Test Connection" button
- [ ] Display connection result (success/error)
- [ ] Add getting started guide for new users
- [ ] Add link to Google AI Studio for API key
- [ ] Show free tier info
- [ ] Display recommended models

**Estimated Time:** 1.5 hours

---

#### Step 2.3: Update APIKeysSection Component ✅ COMPLETE
**File:** `src/components/AIConfiguration/APIKeysSection.tsx`

- [ ] Add Gemini API key input field
- [ ] Add Sparkles icon for Gemini section
- [ ] Add password input with show/hide toggle
- [ ] Add "Clear" button for saved keys
- [ ] Add link to Google AI Studio
- [ ] Update props interface for Gemini key

**Estimated Time:** 45 minutes

---

#### Step 2.4: Update ModelSelector Component ✅ COMPLETE
**File:** `src/components/AIConfiguration/ModelSelector.tsx`

- [ ] Import `GEMINI_MODELS` and `GEMINI_MODEL_INFO`
- [ ] Add logic to display Gemini models when provider is 'gemini'
- [ ] Add Sparkles icon to Gemini model options
- [ ] Display model info (description, pricing, context window)
- [ ] Update description text based on provider
- [ ] Handle Gemini-specific model selection

**Estimated Time:** 1 hour

---

#### Step 2.5: Update Main AIConfiguration Component ✅ COMPLETE
**File:** `src/components/AIConfiguration.tsx`

- [ ] Import GeminiConfiguration component
- [ ] Add Gemini test connection state
- [ ] Add `handleTestGemini()` function
- [ ] Add Gemini configuration section (conditional render)
- [ ] Update API Keys section props with Gemini key
- [ ] Update Model Selector to include Gemini models
- [ ] Update save handler for Gemini settings
- [ ] Add Gemini key indicator in trigger button

**Estimated Time:** 2 hours

---

### Phase 3: State Management

#### Step 3.1: Update useAISettings Hook ✅ COMPLETE
**File:** `src/hooks/useAISettings.ts`

- [ ] Import Gemini key manager
- [ ] Add Gemini key properties to interface
- [ ] Create Gemini API key manager with `useAPIKeyManager`
- [ ] Update `loadSettings()` to include Gemini key
- [ ] Update `saveAllSettings()` to save Gemini key
- [ ] Add Gemini properties to return object

**Estimated Time:** 1 hour

---

#### Step 3.2: Update Storage Module ✅ COMPLETE
**File:** `src/lib/storage/aiConfigStorage.ts`

- [ ] Add `setGeminiKey()` function
- [ ] Add `getGeminiKey()` function
- [ ] Add `clearGeminiKey()` function
- [ ] Update `loadAll()` to include Gemini key
- [ ] Update AIConfig interface if needed

**Estimated Time:** 30 minutes

---

### Phase 4: Testing & Documentation

#### Step 4.1: Functionality Testing

- [ ] Test Gemini API key save/clear functionality
- [ ] Test provider switching (OpenAI → Gemini → Ollama)
- [ ] Test Gemini model selection and persistence
- [ ] Test "Test Connection" button with valid/invalid keys
- [ ] Test formula execution with Gemini models
- [ ] Test AI Copy Agents with Gemini models
- [ ] Test error handling (invalid key, rate limits, network errors)
- [ ] Test system prompt handling (prepend to user message)
- [ ] Test response parsing for Gemini format
- [ ] Test with all 5 Gemini models

**Estimated Time:** 4 hours

---

#### Step 4.2: Update Documentation

- [ ] Update README.md with Gemini setup instructions
- [ ] Add section for getting Gemini API key
- [ ] Add model recommendations
- [ ] Create `docs/gemini-quick-start.md` guide
- [ ] Include troubleshooting section
- [ ] Document free tier vs paid tier differences
- [ ] Add best practices for Gemini usage

**Estimated Time:** 1.5 hours

---

## File Structure After Implementation

```
src/
├── lib/
│   ├── constants/
│   │   └── aiModels.ts               [Updated: Add Gemini constants]
│   ├── storage/
│   │   └── aiConfigStorage.ts        [Updated: Add Gemini storage]
│   ├── gemini.ts                     [NEW: Gemini API utilities]
│   └── aiAgents.ts                   [Updated: Support Gemini]
├── components/
│   ├── AIConfiguration.tsx           [Updated: Add Gemini UI]
│   └── AIConfiguration/
│       ├── APIKeysSection.tsx        [Updated: Add Gemini key field]
│       ├── ProviderSelector.tsx      [Updated: Add Gemini option]
│       ├── ModelSelector.tsx         [Updated: Add Gemini models]
│       └── GeminiConfiguration.tsx   [NEW: Gemini config component]
└── hooks/
    └── useAISettings.ts              [Updated: Add Gemini state]
```

---

## Timeline Estimate

- **Phase 1** (Core): 5.5 hours
- **Phase 2** (UI): 5.75 hours
- **Phase 3** (State): 1.5 hours
- **Phase 4** (Testing/Docs): 5.5 hours

**Total: ~18 hours** (2-3 days)

---

## Success Criteria

- [ ] Users can add Gemini API key
- [ ] Users can select Gemini as provider
- [ ] Users can choose from 5 Gemini models
- [ ] Test Connection button works
- [ ] Formula execution works with Gemini
- [ ] AI Copy Agents work with Gemini
- [ ] Error messages are clear and helpful
- [ ] Settings persist across sessions
- [ ] Documentation is complete

---

## Risk Assessment

### High Risk
**API Response Format Differences**
- *Issue:* Gemini format differs from OpenAI
- *Mitigation:* Comprehensive response parsing with fallbacks

**System Prompt Handling**
- *Issue:* Gemini has no system role
- *Mitigation:* Prepend system prompts to user messages

### Medium Risk
**Rate Limiting**
- *Issue:* Free tier has restrictive limits
- *Mitigation:* Clear error messages, upgrade prompts

**Token Counting**
- *Issue:* Different tokenization than OpenAI
- *Mitigation:* Use Gemini's usage metadata

### Low Risk
**UI Consistency**
- *Issue:* Third provider may clutter UI
- *Mitigation:* Follow existing patterns, use icons consistently

---

## Future Enhancements (Post-MVP)

### Phase 2.0 Features
1. **Context Caching** - 75% cost savings on repeated prompts
2. **Batch Processing** - 50% discount for non-urgent requests
3. **Model Auto-Selection** - Suggest model based on task
4. **Multimodal Support** - Image input and generation
5. **Usage Analytics** - Track costs per provider
6. **Search Grounding** - Enable Google Search integration

---

## Notes

- Follow existing OpenAI/Ollama patterns for consistency
- Keep all existing functionality intact
- No breaking changes to existing APIs
- Maintain accessibility features
- Use proper TypeScript types throughout

---

*Document Version: 2.0*  
*Last Updated: February 4, 2026*  
*Status: Ready for Implementation*
