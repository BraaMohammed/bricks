/**
 * AIConfiguration Component
 * 
 * Main dialog for configuring AI settings including API keys,
 * provider selection, model configuration, and backend waterfall gateway status.
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
import { useBackendStatus } from '@/hooks/useBackendStatus';

// Sub-components
import { APIKeysSection } from '@/components/AIConfiguration/APIKeysSection';
import { ProviderSelector } from '@/components/AIConfiguration/ProviderSelector';
import { WaterfallConfiguration } from '@/components/AIConfiguration/WaterfallConfiguration';
import { OllamaConfiguration } from '@/components/AIConfiguration/OllamaConfiguration';
import { GeminiConfiguration } from '@/components/AIConfiguration/GeminiConfiguration';
import { GroqConfiguration } from '@/components/AIConfiguration/GroqConfiguration';
import { ModelSelector } from '@/components/AIConfiguration/ModelSelector';
import { CustomPromptSection } from '@/components/AIConfiguration/CustomPromptSection';
import { CustomProviderSection } from '@/components/AIConfiguration/CustomProviderSection';

// Utilities
import { testGeminiConnection } from '@/lib/gemini';
import { testGroqConnection } from '@/lib/groq';

export const AIConfiguration = () => {
  const [open, setOpen] = useState(false);

  // Connection hooks
  const ollama = useOllamaConnection();
  const backend = useBackendStatus();

  // Custom hooks handle all state management with live models
  const settings = useAISettings(ollama.models, backend.models);

  // Poll connections when modal opens or provider changes
  useEffect(() => {
    if (open) {
      if (settings.aiProvider === 'waterfall') {
        backend.checkConnection();
      } else if (settings.aiProvider === 'ollama') {
        ollama.checkConnection();
      }
    }
  }, [settings.aiProvider, open]);

  // Auto-select first Waterfall model when models are loaded
  useEffect(() => {
    if (
      settings.aiProvider === 'waterfall' &&
      backend.models.length > 0 &&
      (!settings.model || !backend.models.some((m) => m.id === settings.model))
    ) {
      settings.setModel(backend.models[0].id);
    }
  }, [settings.aiProvider, backend.models, settings.model]);

  // Auto-select first Ollama model when models are loaded
  useEffect(() => {
    if (
      settings.aiProvider === 'ollama' &&
      ollama.models.length > 0 &&
      !settings.model
    ) {
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
    settings.setAiProvider(provider as any);

    if (provider === 'waterfall') {
      setTimeout(() => {
        backend.checkConnection();
      }, 50);
    } else if (provider === 'ollama') {
      setTimeout(() => {
        ollama.checkConnection();
      }, 50);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex h-9 items-center gap-2 rounded-md border-border font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:border-primary/60 hover:bg-transparent hover:text-foreground">
          <Key className="text-[14px]" />
          AI Config
          {(settings.aiProvider === 'waterfall' || settings.hasApiKey || settings.hasGeminiKey || settings.hasGroqKey || settings.customProviders.some(p => !!p.apiKey)) && (
            <div className="w-1.5 h-1.5 bg-primary rounded-full brick-pulse-dot" />
          )}
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

          {/* Waterfall Configuration - only shown when Waterfall is selected */}
          {settings.aiProvider === 'waterfall' && (
            <WaterfallConfiguration
              connected={backend.connected}
              checking={backend.checking}
              backendUrl={backend.backendUrl}
              setBackendUrl={backend.setBackendUrl}
              latency={backend.latency}
              configuredProviders={backend.configuredProviders}
              modelsCount={backend.models.length}
              onRefresh={backend.checkConnection}
            />
          )}

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
            availableModels={settings.availableModels}
            ollamaStatus={{
              connected: settings.aiProvider === 'waterfall' ? backend.connected : ollama.connected,
              checking: settings.aiProvider === 'waterfall' ? backend.checking : ollama.checking,
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
