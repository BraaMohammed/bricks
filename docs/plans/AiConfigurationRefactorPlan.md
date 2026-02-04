# AI Configuration Component Refactor Plan

**Created:** February 4, 2026  
**Status:** Planning Phase  
**Component:** `src/components/AIConfiguration.tsx`  
**Current LOC:** 531 lines

## Executive Summary

The `AIConfiguration.tsx` component is severely bloated with 531 lines handling multiple concerns: API key management, provider selection, Ollama connection status, model selection, custom prompts, and localStorage persistence. This document outlines a comprehensive refactoring strategy to decompose it into maintainable, testable, and reusable pieces.

## Current Issues

### 1. **Single Responsibility Violation**
- Managing 11+ state variables in one component
- Handling both UI rendering and business logic
- Direct localStorage operations mixed with UI code
- Ollama connection logic embedded in component

### 2. **Excessive State Management**
```tsx
// 11 useState declarations
const [open, setOpen] = useState(false);
const [apiKey, setApiKey] = useState('');
const [model, setModel] = useState('gpt-3.5-turbo');
const [customPrompt, setCustomPrompt] = useState('');
const [hasApiKey, setHasApiKey] = useState(false);
const [firecrawlKey, setFirecrawlKey] = useState('');
const [hasFirecrawlKey, setHasFirecrawlKey] = useState(false);
const [aiProvider, setAiProvider] = useState<'openai' | 'ollama'>('openai');
const [ollamaConnected, setOllamaConnected] = useState(false);
const [ollamaModels, setOllamaModels] = useState<string[]>([]);
const [checkingOllama, setCheckingOllama] = useState(false);
const [ollamaBaseUrl, setOllamaBaseUrl] = useState('http://localhost:11434');
```

### 3. **Mixed Concerns**
- UI components (Cards, Dialog, Inputs)
- Business logic (validation, saving)
- Side effects (localStorage, API calls)
- Connection management (Ollama status checking)

### 4. **Poor Testability**
- Hard to unit test due to tight coupling
- localStorage access scattered throughout
- Side effects not isolated
- Complex useEffect dependencies

### 5. **Code Duplication**
- Similar patterns for OpenAI and Firecrawl API key handling
- Repetitive Card structures
- Duplicated localStorage get/set logic

## Refactoring Strategy

### Phase 1: Extract Custom Hooks (High Priority)

#### 1.1 Create `useAISettings` Hook
**File:** `src/hooks/useAISettings.ts`

**Purpose:** Centralize all AI configuration state and localStorage operations

**Responsibilities:**
- Manage all configuration state
- Handle localStorage persistence
- Provide getters and setters
- Initial state loading

**Interface:**
```typescript
interface AISettings {
  // OpenAI
  apiKey: string;
  hasApiKey: boolean;
  setApiKey: (key: string) => void;
  clearApiKey: () => void;
  
  // Firecrawl
  firecrawlKey: string;
  hasFirecrawlKey: boolean;
  setFirecrawlKey: (key: string) => void;
  clearFirecrawlKey: () => void;
  
  // Provider & Model
  aiProvider: 'openai' | 'ollama';
  setAiProvider: (provider: 'openai' | 'ollama') => void;
  model: string;
  setModel: (model: string) => void;
  
  // Custom Prompt
  customPrompt: string;
  setCustomPrompt: (prompt: string) => void;
  
  // Ollama
  ollamaBaseUrl: string;
  setOllamaBaseUrl: (url: string) => void;
  
  // Actions
  saveAllSettings: () => void;
  loadSettings: () => void;
}
```

**Benefits:**
- Single source of truth for settings
- Easy to test in isolation
- Reusable across components
- Clean localStorage abstraction

---

#### 1.2 Create `useOllamaConnection` Hook
**File:** `src/hooks/useOllamaConnection.ts`

**Purpose:** Manage Ollama connection state and model fetching

**Responsibilities:**
- Check Ollama connection status
- Fetch available models
- Handle connection errors
- Auto-reconnect logic

**Interface:**
```typescript
interface OllamaConnection {
  connected: boolean;
  models: string[];
  checking: boolean;
  error: string | null;
  checkConnection: () => Promise<void>;
  refreshModels: () => Promise<void>;
}
```

**Benefits:**
- Isolates Ollama-specific logic
- Can be reused in other components
- Easier error handling
- Testable without UI

---

#### 1.3 Create `useAPIKeyManager` Hook (Generic)
**File:** `src/hooks/useAPIKeyManager.ts`

**Purpose:** Generic hook for managing any API key

**Responsibilities:**
- Store/retrieve API key from localStorage
- Track key presence
- Clear key functionality
- Toast notifications

**Interface:**
```typescript
interface APIKeyManager {
  key: string;
  hasKey: boolean;
  setKey: (key: string, storageKey: string) => void;
  clearKey: (storageKey: string, serviceName: string) => void;
}

// Usage:
const openaiKey = useAPIKeyManager('openai_api_key', 'OpenAI');
const firecrawlKey = useAPIKeyManager('firecrawl_api_key', 'Firecrawl');
```

**Benefits:**
- DRY principle (eliminates duplication)
- Consistent key management
- Easy to add new API keys
- Centralized toast notifications

---

### Phase 2: Create Sub-Components (Medium Priority)

#### 2.1 Create `APIKeysSection` Component
**File:** `src/components/AIConfiguration/APIKeysSection.tsx`

**Purpose:** Handle all API key inputs

**Props:**
```typescript
interface APIKeysSectionProps {
  openaiKey: string;
  setOpenaiKey: (key: string) => void;
  clearOpenaiKey: () => void;
  hasOpenaiKey: boolean;
  
  firecrawlKey: string;
  setFirecrawlKey: (key: string) => void;
  clearFirecrawlKey: () => void;
  hasFirecrawlKey: boolean;
}
```

**Structure:**
- Card wrapper
- OpenAI key input with clear button
- Firecrawl key input with clear button
- Help links

**Lines Reduced:** ~80 lines → component ~60 lines

---

#### 2.2 Create `ProviderSelector` Component
**File:** `src/components/AIConfiguration/ProviderSelector.tsx`

**Purpose:** AI provider selection (OpenAI vs Ollama)

**Props:**
```typescript
interface ProviderSelectorProps {
  provider: 'openai' | 'ollama';
  onProviderChange: (provider: 'openai' | 'ollama') => void;
}
```

**Structure:**
- Card wrapper
- Select dropdown with icons
- Provider-specific descriptions

**Lines Reduced:** ~40 lines → component ~35 lines

---

#### 2.3 Create `OllamaConfiguration` Component
**File:** `src/components/AIConfiguration/OllamaConfiguration.tsx`

**Purpose:** All Ollama-specific settings

**Props:**
```typescript
interface OllamaConfigurationProps {
  baseUrl: string;
  setBaseUrl: (url: string) => void;
  connected: boolean;
  checking: boolean;
  models: string[];
  onRefresh: () => void;
}
```

**Structure:**
- Base URL input
- Connection status indicator
- Refresh button
- Setup instructions (when disconnected)
- Model suggestions (when no models)

**Lines Reduced:** ~150 lines → component ~120 lines

---

#### 2.4 Create `ModelSelector` Component
**File:** `src/components/AIConfiguration/ModelSelector.tsx`

**Purpose:** Model selection dropdown

**Props:**
```typescript
interface ModelSelectorProps {
  provider: 'openai' | 'ollama';
  model: string;
  setModel: (model: string) => void;
  availableModels: string[];
  ollamaStatus?: {
    connected: boolean;
    checking: boolean;
  };
}
```

**Structure:**
- Card wrapper
- Model select dropdown
- Dynamic description based on provider
- Placeholder states (loading, no models, etc.)

**Lines Reduced:** ~70 lines → component ~50 lines

---

#### 2.5 Create `CustomPromptSection` Component
**File:** `src/components/AIConfiguration/CustomPromptSection.tsx`

**Purpose:** Custom AI prompt configuration

**Props:**
```typescript
interface CustomPromptSectionProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
}
```

**Structure:**
- Card wrapper
- Textarea input
- Help text

**Lines Reduced:** ~40 lines → component ~30 lines

---

#### 2.6 Create `OllamaStatusIndicator` Component
**File:** `src/components/AIConfiguration/OllamaStatusIndicator.tsx`

**Purpose:** Reusable Ollama connection status display

**Props:**
```typescript
interface OllamaStatusIndicatorProps {
  connected: boolean;
  checking: boolean;
  modelCount: number;
}
```

**Structure:**
- Icon (Wifi/WifiOff/Loading)
- Status text
- Model count badge

**Lines Reduced:** ~25 lines → component ~20 lines

---

#### 2.7 Create `ModelSuggestionCard` Component
**File:** `src/components/AIConfiguration/ModelSuggestionCard.tsx`

**Purpose:** Display suggested Ollama models

**Props:**
```typescript
interface ModelSuggestionCardProps {
  models: Array<{
    name: string;
    description: string;
    command: string;
    size: string;
  }>;
}
```

**Structure:**
- Grid of model cards
- Model name, description, command, size
- Installation instructions

**Lines Reduced:** ~40 lines → component ~35 lines

---

### Phase 3: Extract Utilities (Medium Priority)

#### 3.1 Create `aiConfigStorage` Utility
**File:** `src/lib/storage/aiConfigStorage.ts`

**Purpose:** Abstract localStorage operations

**Interface:**
```typescript
export const aiConfigStorage = {
  // API Keys
  getOpenAIKey: () => string | null,
  setOpenAIKey: (key: string) => void,
  clearOpenAIKey: () => void,
  
  getFirecrawlKey: () => string | null,
  setFirecrawlKey: (key: string) => void,
  clearFirecrawlKey: () => void,
  
  // Provider & Model
  getProvider: () => 'openai' | 'ollama',
  setProvider: (provider: 'openai' | 'ollama') => void,
  
  getModel: () => string | null,
  setModel: (model: string) => void,
  
  // Custom Prompt
  getCustomPrompt: () => string | null,
  setCustomPrompt: (prompt: string) => void,
  
  // Ollama
  getOllamaBaseUrl: () => string,
  setOllamaBaseUrl: (url: string) => void,
  
  // Bulk operations
  saveAll: (config: AIConfig) => void,
  loadAll: () => AIConfig,
  clearAll: () => void,
};
```

**Benefits:**
- Easy to mock for testing
- Can switch storage mechanism (e.g., IndexedDB)
- Type-safe storage keys
- Consistent error handling

---

#### 3.2 Create `constants` File
**File:** `src/lib/constants/aiModels.ts`

**Purpose:** Centralize model lists and defaults

**Content:**
```typescript
export const OPENAI_MODELS = [
  'gpt-3.5-turbo',
  'gpt-4',
  'gpt-4-turbo',
  'gpt-4o',
  'gpt-4o-mini'
] as const;

export const DEFAULT_OPENAI_MODEL = 'gpt-3.5-turbo';
export const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434';

export const STORAGE_KEYS = {
  OPENAI_KEY: 'openai_api_key',
  FIRECRAWL_KEY: 'firecrawl_api_key',
  AI_MODEL: 'ai_model',
  AI_PROVIDER: 'ai_provider',
  CUSTOM_PROMPT: 'custom_ai_prompt',
  OLLAMA_BASE_URL: 'ollama_base_url',
} as const;
```

**Benefits:**
- Single source of truth for constants
- Type safety with `as const`
- Easy to update models
- Prevents typos in storage keys

---

### Phase 4: Refactor Main Component (High Priority)

#### 4.1 Simplified `AIConfiguration` Component
**File:** `src/components/AIConfiguration.tsx`

**New Structure:**
```tsx
export const AIConfiguration = () => {
  const [open, setOpen] = useState(false);
  
  // Custom hooks handle all complexity
  const settings = useAISettings();
  const ollama = useOllamaConnection(settings.ollamaBaseUrl);
  
  // Auto-select first Ollama model
  useEffect(() => {
    if (settings.aiProvider === 'ollama' && 
        ollama.models.length > 0 && 
        !settings.model) {
      settings.setModel(ollama.models[0]);
    }
  }, [settings.aiProvider, ollama.models, settings.model]);
  
  const handleSave = () => {
    settings.saveAllSettings();
    toast({
      title: "AI Settings Saved",
      description: "Your AI configuration has been saved successfully.",
    });
    setOpen(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <KeyRound className="h-4 w-4" />
          API Keys
          {settings.hasApiKey && <div className="w-2 h-2 bg-green-500 rounded-full" />}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl h-[80vh] overflow-y-scroll">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            AI Configuration
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <APIKeysSection 
            openaiKey={settings.apiKey}
            setOpenaiKey={settings.setApiKey}
            clearOpenaiKey={settings.clearApiKey}
            hasOpenaiKey={settings.hasApiKey}
            firecrawlKey={settings.firecrawlKey}
            setFirecrawlKey={settings.setFirecrawlKey}
            clearFirecrawlKey={settings.clearFirecrawlKey}
            hasFirecrawlKey={settings.hasFirecrawlKey}
          />
          
          <ProviderSelector
            provider={settings.aiProvider}
            onProviderChange={settings.setAiProvider}
          />
          
          {settings.aiProvider === 'ollama' && (
            <OllamaConfiguration
              baseUrl={settings.ollamaBaseUrl}
              setBaseUrl={settings.setOllamaBaseUrl}
              connected={ollama.connected}
              checking={ollama.checking}
              models={ollama.models}
              onRefresh={ollama.checkConnection}
            />
          )}
          
          <ModelSelector
            provider={settings.aiProvider}
            model={settings.model}
            setModel={settings.setModel}
            availableModels={
              settings.aiProvider === 'openai' 
                ? OPENAI_MODELS 
                : ollama.models
            }
            ollamaStatus={{
              connected: ollama.connected,
              checking: ollama.checking
            }}
          />
          
          <CustomPromptSection
            prompt={settings.customPrompt}
            setPrompt={settings.setCustomPrompt}
          />
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save Configuration
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
```

**Lines:** ~531 lines → ~80 lines (85% reduction)

---

### Phase 5: Testing Strategy (High Priority)

#### 5.1 Hook Tests
**Files:**
- `src/hooks/__tests__/useAISettings.test.ts`
- `src/hooks/__tests__/useOllamaConnection.test.ts`
- `src/hooks/__tests__/useAPIKeyManager.test.ts`

**Coverage:**
- State management
- localStorage interactions
- Side effects
- Error handling

#### 5.2 Component Tests
**Files:**
- `src/components/AIConfiguration/__tests__/APIKeysSection.test.tsx`
- `src/components/AIConfiguration/__tests__/ModelSelector.test.tsx`
- `src/components/AIConfiguration/__tests__/OllamaConfiguration.test.tsx`

**Coverage:**
- Rendering
- User interactions
- Props handling
- Edge cases

#### 5.3 Utility Tests
**Files:**
- `src/lib/storage/__tests__/aiConfigStorage.test.ts`

**Coverage:**
- Get/set operations
- Error handling
- Edge cases

---

## Implementation Plan

### Sprint 1: Foundation (Week 1)
**Goal:** Extract core logic without breaking existing functionality

#### Step 1.1: Create Utilities and Constants (Day 1-2)
- [ ] Create `src/lib/constants/aiModels.ts`
  - [ ] Define OPENAI_MODELS array
  - [ ] Define DEFAULT_OPENAI_MODEL constant
  - [ ] Define DEFAULT_OLLAMA_BASE_URL constant
  - [ ] Define STORAGE_KEYS object
  - [ ] Add TypeScript const assertions
- [ ] Create `src/lib/storage/aiConfigStorage.ts`
  - [ ] Implement getOpenAIKey/setOpenAIKey/clearOpenAIKey
  - [ ] Implement getFirecrawlKey/setFirecrawlKey/clearFirecrawlKey
  - [ ] Implement getProvider/setProvider
  - [ ] Implement getModel/setModel
  - [ ] Implement getCustomPrompt/setCustomPrompt
  - [ ] Implement getOllamaBaseUrl/setOllamaBaseUrl
  - [ ] Implement saveAll/loadAll/clearAll bulk operations
  - [ ] Add error handling for localStorage access
- [ ] Write unit tests for storage utility
- [ ] Write unit tests for constants

#### Step 1.2: Create Custom Hooks (Day 3-5)
- [ ] Create `src/hooks/useAPIKeyManager.ts`
  - [ ] Implement key state management
  - [ ] Implement hasKey computed state
  - [ ] Implement setKey with localStorage persistence
  - [ ] Implement clearKey with toast notification
  - [ ] Write hook tests
- [ ] Create `src/hooks/useOllamaConnection.ts`
  - [ ] Implement connection state (connected, checking, error)
  - [ ] Implement models state
  - [ ] Implement checkConnection function
  - [ ] Implement refreshModels function
  - [ ] Add proper error handling
  - [ ] Write hook tests
- [ ] Create `src/hooks/useAISettings.ts`
  - [ ] Implement all settings state management
  - [ ] Integrate useAPIKeyManager for both keys
  - [ ] Implement provider/model state
  - [ ] Implement custom prompt state
  - [ ] Implement saveAllSettings function
  - [ ] Implement loadSettings function
  - [ ] Add initial settings load on mount
  - [ ] Write hook tests
- [ ] Test hooks integration together
- [ ] Update main component to use hooks (parallel implementation for testing)

---

### Sprint 2: Component Decomposition (Week 2)
**Goal:** Break down UI into smaller components

#### Step 2.1: Create Simple Sub-Components (Day 1-3)
- [ ] Create `src/components/AIConfiguration/APIKeysSection.tsx`
  - [ ] Implement Card structure
  - [ ] Implement OpenAI key input field
  - [ ] Implement Firecrawl key input field
  - [ ] Add Clear buttons for saved keys
  - [ ] Add help links to API key pages
  - [ ] Define and export props interface
  - [ ] Write component tests
- [ ] Create `src/components/AIConfiguration/CustomPromptSection.tsx`
  - [ ] Implement Card structure
  - [ ] Implement Textarea input
  - [ ] Add help text
  - [ ] Define and export props interface
  - [ ] Write component tests
- [ ] Create `src/components/AIConfiguration/ProviderSelector.tsx`
  - [ ] Implement Card structure
  - [ ] Implement Select dropdown
  - [ ] Add provider icons (Key, Server)
  - [ ] Add provider descriptions
  - [ ] Define and export props interface
  - [ ] Write component tests

#### Step 2.2: Create Complex Sub-Components (Day 4-5)
- [ ] Create `src/components/AIConfiguration/OllamaStatusIndicator.tsx`
  - [ ] Implement status display with icons
  - [ ] Add Wifi/WifiOff/Loading states
  - [ ] Add model count badge
  - [ ] Define and export props interface
  - [ ] Write component tests
- [ ] Create `src/components/AIConfiguration/ModelSuggestionCard.tsx`
  - [ ] Implement model suggestion grid
  - [ ] Display model name, description, command, size
  - [ ] Add proper styling and layout
  - [ ] Define and export props interface
  - [ ] Write component tests
- [ ] Create `src/components/AIConfiguration/OllamaConfiguration.tsx`
  - [ ] Implement Card structure
  - [ ] Add Ollama base URL input
  - [ ] Integrate OllamaStatusIndicator component
  - [ ] Add Refresh button
  - [ ] Add setup instructions (when disconnected)
  - [ ] Integrate ModelSuggestionCard (when no models)
  - [ ] Define and export props interface
  - [ ] Write component tests
- [ ] Create `src/components/AIConfiguration/ModelSelector.tsx`
  - [ ] Implement Card structure
  - [ ] Implement model Select dropdown
  - [ ] Add dynamic descriptions based on provider
  - [ ] Handle loading/empty states
  - [ ] Define and export props interface
  - [ ] Write component tests

---

### Sprint 3: Integration & Polish (Week 3)
**Goal:** Integrate everything and remove old code

#### Step 3.1: Refactor Main Component (Day 1-2)
- [ ] Import all sub-components into `AIConfiguration.tsx`
- [ ] Import all custom hooks into `AIConfiguration.tsx`
- [ ] Replace state declarations with hook calls
  - [ ] Replace API key states with useAISettings
  - [ ] Replace Ollama states with useOllamaConnection
- [ ] Replace UI sections with sub-components
  - [ ] Replace API keys section with `<APIKeysSection />`
  - [ ] Replace provider selector with `<ProviderSelector />`
  - [ ] Replace Ollama config with `<OllamaConfiguration />`
  - [ ] Replace model selector with `<ModelSelector />`
  - [ ] Replace custom prompt with `<CustomPromptSection />`
- [ ] Update handleSave to use settings.saveAllSettings()
- [ ] Clean up imports (remove unused)
- [ ] Remove all extracted logic
- [ ] Remove all extracted state
- [ ] Remove all extracted functions
- [ ] Verify file is ~80-100 lines
- [ ] Test all functionality still works

#### Step 3.2: Testing & Documentation (Day 3-5)
- [ ] **Functionality Testing**
  - [ ] Test OpenAI API key save/clear
  - [ ] Test Firecrawl API key save/clear
  - [ ] Test provider switching (OpenAI ↔ Ollama)
  - [ ] Test Ollama connection checking
  - [ ] Test Ollama model fetching
  - [ ] Test model selection for both providers
  - [ ] Test custom prompt save/load
  - [ ] Test settings persistence across page reloads
  - [ ] Test auto-model selection for Ollama
- [ ] **Regression Testing**
  - [ ] Verify all toast notifications work
  - [ ] Verify loading states display correctly
  - [ ] Test with no localStorage data (fresh install)
  - [ ] Test with existing localStorage data (migration)
  - [ ] Verify Dialog open/close behavior
  - [ ] Test keyboard interactions
- [ ] **Code Quality**
  - [ ] Run ESLint on all new files
  - [ ] Fix any TypeScript errors/warnings
  - [ ] Ensure consistent code style
  - [ ] Add JSDoc comments where needed
  - [ ] Remove all debug console.log statements
- [ ] **Documentation**
  - [ ] Update this plan with completion status
  - [ ] Add inline code comments for complex logic
  - [ ] Update README if API changes
  - [ ] Create migration guide if needed

---

## File Structure After Refactor

```
src/
├── components/
│   ├── AIConfiguration.tsx (80 lines - main orchestrator)
│   └── AIConfiguration/
│       ├── APIKeysSection.tsx (60 lines)
│       ├── ProviderSelector.tsx (35 lines)
│       ├── OllamaConfiguration.tsx (120 lines)
│       ├── ModelSelector.tsx (50 lines)
│       ├── CustomPromptSection.tsx (30 lines)
│       ├── OllamaStatusIndicator.tsx (20 lines)
│       ├── ModelSuggestionCard.tsx (35 lines)
│       └── __tests__/
│           ├── APIKeysSection.test.tsx
│           ├── ModelSelector.test.tsx
│           └── OllamaConfiguration.test.tsx
├── hooks/
│   ├── useAISettings.ts (150 lines)
│   ├── useOllamaConnection.ts (80 lines)
│   ├── useAPIKeyManager.ts (40 lines)
│   └── __tests__/
│       ├── useAISettings.test.ts
│       ├── useOllamaConnection.test.ts
│       └── useAPIKeyManager.test.ts
└── lib/
    ├── constants/
    │   └── aiModels.ts (30 lines)
    ├── storage/
    │   ├── aiConfigStorage.ts (120 lines)
    │   └── __tests__/
    │       └── aiConfigStorage.test.ts
    └── ollama.ts (existing)
```

**Total Lines:** ~850 lines (vs 531 bloated lines)  
**But:** Much more maintainable, testable, and organized

---

## Benefits After Refactor

### 1. **Maintainability**
- Each file has a single, clear responsibility
- Easy to locate and fix bugs
- Changes are isolated and predictable

### 2. **Testability**
- Hooks can be tested without rendering components
- Components can be tested in isolation
- Easy to mock dependencies
- Higher test coverage possible

### 3. **Reusability**
- `useAPIKeyManager` can be used for any API key
- `OllamaStatusIndicator` can be used elsewhere
- Settings hooks can be consumed by other components

### 4. **Developer Experience**
- Smaller files are easier to understand
- Clear interfaces and contracts
- Better IDE performance
- Easier code reviews

### 5. **Performance**
- Can memoize sub-components independently
- Reduced re-renders with proper prop passing
- Easier to identify performance bottlenecks

### 6. **Scalability**
- Easy to add new providers (Anthropic, Cohere, etc.)
- Can add more configuration options without bloating main component
- Clear patterns to follow for new features

---

## Migration Strategy

### Option A: Big Bang (Risky)
- Do all changes at once
- High risk of bugs
- Faster completion
- **Not recommended**

### Option B: Gradual (Recommended)
1. Create new components alongside old ones
2. Test thoroughly in isolation
3. Gradually replace sections in main component
4. Keep old component as backup
5. Remove old code once stable
6. **Recommended approach**

### Option C: Feature Flag
1. Implement refactored version
2. Add feature flag to switch between old/new
3. Test in production with small user group
4. Gradual rollout
5. Remove old version after validation
6. **Best for production systems**

---

## Risk Assessment

### High Risk Areas
1. **localStorage key changes**
   - Risk: Breaking existing user configurations
   - Mitigation: Use exact same keys, add migration logic if needed

2. **Ollama connection timing**
   - Risk: Race conditions in connection checking
   - Mitigation: Proper async/await handling, loading states

3. **Model selection logic**
   - Risk: Auto-selection not working correctly
   - Mitigation: Comprehensive tests, fallback values

### Medium Risk Areas
1. **useEffect dependencies**
   - Risk: Infinite loops or missing updates
   - Mitigation: Careful dependency array management

2. **Toast notifications**
   - Risk: Too many or missing notifications
   - Mitigation: Centralize in hooks

### Low Risk Areas
1. **UI changes**
   - Risk: Styling differences
   - Mitigation: Keep exact same UI structure

---

## Success Metrics

### Code Quality
- [ ] Lines of code in main component: < 100
- [ ] Average file size: < 150 lines
- [ ] Test coverage: > 80%
- [ ] Number of state variables in main component: < 3

### Developer Experience
- [ ] Time to understand component: < 10 minutes
- [ ] Time to add new API key field: < 15 minutes
- [ ] Time to add new AI provider: < 30 minutes

### Performance
- [ ] Component render time: < 50ms
- [ ] Initial load time: < 100ms
- [ ] No memory leaks

---

## Future Enhancements

After refactor, these become much easier:

1. **Add more AI providers**
   - Anthropic Claude
   - Google Gemini
   - Mistral AI
   - Local LLM.js

2. **Advanced features**
   - Model performance comparison
   - Cost calculator
   - Usage statistics
   - Model benchmarking

3. **Better UX**
   - Auto-detect Ollama installation
   - Model download progress
   - Configuration presets
   - Import/export settings

4. **Developer features**
   - Settings context provider (avoid prop drilling)
   - Settings sync across tabs
   - Settings versioning
   - Configuration validation

---

## Conclusion

This refactor will transform a 531-line monolithic component into a well-organized, maintainable system. While the total line count increases slightly due to proper separation and tests, the benefits in maintainability, testability, and developer experience are substantial.

**Estimated effort:** 3 weeks for complete implementation with tests  
**Risk level:** Medium (with gradual migration strategy)  
**Recommended approach:** Sprint-based implementation with Option B (Gradual)

---

## Next Steps

1. **Review this plan** with team
2. **Create GitHub issues** for each task
3. **Set up branch** for refactor work
4. **Start with Sprint 1** (utilities and hooks)
5. **Regular check-ins** to adjust plan as needed

Bismillah, let's make this codebase beautiful! 🚀
