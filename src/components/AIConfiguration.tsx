/**
 * AIConfiguration Component
 * 
 * Main dialog for configuring AI settings including API keys,
 * provider selection, and model configuration.
 * 
 * Refactored to use custom hooks and sub-components for better
 * maintainability and testability.
 */

import { useState, useEffect } from 'react';
import { Settings, Key, FloppyDisk } from 'iconoir-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

// Custom Hooks
import { useAISettings } from '@/hooks/useAISettings';
import { useOllamaConnection } from '@/hooks/useOllamaConnection';

// Sub-components
import { APIKeysSection } from '@/components/AIConfiguration/APIKeysSection';
import { ProviderSelector } from '@/components/AIConfiguration/ProviderSelector';
import { OllamaConfiguration } from '@/components/AIConfiguration/OllamaConfiguration';
import { GeminiConfiguration } from '@/components/AIConfiguration/GeminiConfiguration';
import { GroqConfiguration } from '@/components/AIConfiguration/GroqConfiguration';
import { ModelSelector } from '@/components/AIConfiguration/ModelSelector';
import { CustomPromptSection } from '@/components/AIConfiguration/CustomPromptSection';
import { CustomProviderSection } from '@/components/AIConfiguration/CustomProviderSection';

// Utilities
import { testGeminiConnection } from '@/lib/gemini';
import { testGroqConnection } from '@/lib/groq';

// Constants
import { OPENAI_MODELS } from '@/lib/constants/aiModels';

export const AIConfiguration = () => {
  const [open, setOpen] = useState(false);

  // Custom hooks handle all state management
  const settings = useAISettings();
  const ollama = useOllamaConnection();

  // Check Ollama connection when provider switches to Ollama
  useEffect(() => {
    if (settings.aiProvider === 'ollama' && open) {
      // Delay to avoid blocking UI
      setTimeout(() => {
        ollama.checkConnection();
      }, 100);
    }
  }, [settings.aiProvider, open]);

  // Auto-select first Ollama model when models are loaded
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

  const handleTestGemini = async () => {
    return await testGeminiConnection();
  };

  const handleTestGroq = async () => {
    return await testGroqConnection();
  };

  const handleProviderChange = (provider: string) => {
    // Need to cast to any to handle custom provider strings
    settings.setAiProvider(provider as any);

    // Trigger Ollama connection check if switching to Ollama
    if (provider === 'ollama') {
      setTimeout(() => {
        ollama.checkConnection();
      }, 100);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex h-9 items-center gap-2 rounded-md border-border font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:border-primary/60 hover:bg-transparent hover:text-foreground">
          <Key className="text-[14px]" />
          AI Config
          {(settings.hasApiKey || settings.hasGeminiKey || settings.hasGroqKey || settings.customProviders.some(p => !!p.apiKey)) && <div className="w-1.5 h-1.5 bg-primary rounded-full brick-pulse-dot" />}
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
          {/* API Keys Section */}
          <APIKeysSection
            openaiKey={settings.apiKey}
            setOpenaiKey={settings.setApiKey}
            clearOpenaiKey={settings.clearApiKey}
            hasOpenaiKey={settings.hasApiKey}
            geminiKey={settings.geminiKey}
            setGeminiKey={settings.setGeminiKey}
            clearGeminiKey={settings.clearGeminiKey}
            hasGeminiKey={settings.hasGeminiKey}
            groqKey={settings.groqKey}
            setGroqKey={settings.setGroqKey}
            clearGroqKey={settings.clearGroqKey}
            hasGroqKey={settings.hasGroqKey}
            firecrawlKey={settings.firecrawlKey}
            setFirecrawlKey={settings.setFirecrawlKey}
            clearFirecrawlKey={settings.clearFirecrawlKey}
            hasFirecrawlKey={settings.hasFirecrawlKey}
          />

          {/* Provider Selection */}
          <ProviderSelector
            provider={settings.aiProvider}
            customProviders={settings.customProviders}
            onProviderChange={handleProviderChange}
          />

          {/* Ollama Configuration - only shown when Ollama is selected */}
          {settings.aiProvider === 'ollama' && (
            <Card>
              <OllamaConfiguration
                baseUrl={settings.ollamaBaseUrl}
                setBaseUrl={settings.setOllamaBaseUrl}
                connected={ollama.connected}
                checking={ollama.checking}
                models={ollama.models}
                onRefresh={ollama.checkConnection}
              />
            </Card>
          )}

          {/* Gemini Configuration - only shown when Gemini is selected */}
          {settings.aiProvider === 'gemini' && (
            <GeminiConfiguration
              hasApiKey={settings.hasGeminiKey}
              onTestConnection={handleTestGemini}
            />
          )}

          {/* Groq Configuration - only shown when Groq is selected */}
          {settings.aiProvider === 'groq' && (
            <Card>
              <GroqConfiguration
                hasApiKey={settings.hasGroqKey}
                onTestConnection={handleTestGroq}
              />
            </Card>
          )}

          {/* Custom Providers Configuration */}
          <CustomProviderSection
            customProviders={settings.customProviders}
            addCustomProvider={settings.addCustomProvider}
            removeCustomProvider={settings.removeCustomProvider}
          />

          {/* Model Selection */}
          <ModelSelector
            provider={settings.aiProvider}
            customProvider={settings.customProviders.find(p => p.id === settings.aiProvider)}
            model={settings.model}
            setModel={settings.setModel}
            availableModels={
              settings.aiProvider === 'openai'
                ? [...OPENAI_MODELS]
                : ollama.models
            }
            ollamaStatus={{
              connected: ollama.connected,
              checking: ollama.checking,
            }}
          />

          {/* Custom Prompt */}
          <CustomPromptSection
            prompt={settings.customPrompt}
            setPrompt={settings.setCustomPrompt}
          />

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="flex items-center gap-2">
              <FloppyDisk className="h-4 w-4" />
              Save Configuration
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
