/**
 * ModelSelector Component
 * 
 * Provides model selection dropdown for Waterfall Gateway, OpenAI, Gemini, Groq, Ollama, and Custom providers.
 */

import { useState } from 'react';
import { Sparks, Globe, Refresh, Flash, Code } from 'iconoir-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AIProvider, GEMINI_MODELS, GEMINI_MODEL_INFO, groqModels, CustomProvider, ModelDefinition } from '@/lib/constants/aiModels';
import { useOpenCodeGoModels } from '@/hooks/useOpenCodeGoModels';
import { toast } from '@/hooks/use-toast';

const MODEL_LABEL_STYLES: Record<string, { label: string; className: string }> = {
  contributor: {
    label: 'Trains on data',
    className: 'border-destructive/50 bg-destructive/15 text-destructive font-semibold',
  },
  free: {
    label: 'Free',
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  'region-limited': {
    label: 'Region-limited',
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  preview: {
    label: 'Preview',
    className: 'border-border bg-muted text-muted-foreground',
  },
};

const ModelLabels = ({ labels }: { labels?: string[] }) => {
  if (!labels || labels.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {labels.map((label) => {
        const style = MODEL_LABEL_STYLES[label];
        if (!style) return null;
        return (
          <Badge
            key={label}
            variant="outline"
            className={`h-4 rounded px-1.5 py-0 font-mono text-[9px] leading-none tracking-wide ${style.className}`}
          >
            {style.label}
          </Badge>
        );
      })}
    </div>
  );
};

export interface ModelSelectorProps {
  provider: AIProvider;
  customProvider?: CustomProvider;
  model: string;
  setModel: (model: string) => void;
  availableModels: ModelDefinition[] | string[] | any[];
  ollamaStatus?: {
    connected: boolean;
    checking: boolean;
  };
}

export const ModelSelector = ({
  provider,
  customProvider,
  model,
  setModel,
  availableModels,
  ollamaStatus,
}: ModelSelectorProps) => {
  const [fetchingModels, setFetchingModels] = useState(false);
  const [customModels, setCustomModels] = useState<string[]>([]);
  const openCodeGo = useOpenCodeGoModels();
  const isCustomProvider = provider.startsWith('custom:') && !!customProvider;

  // Get description text based on provider and state
  const getDescriptionText = () => {
    if (provider === 'waterfall') {
      return ollamaStatus?.connected
        ? `Connected to backend gateway. ${availableModels.length} models available across configured free providers.`
        : 'Connect backend dev server to discover live active models and provider fallbacks.';
    }

    if (provider === 'opencode-go') {
      return openCodeGo.loading
        ? 'Fetching live OpenCode Go models from the backend proxy...'
        : `OpenCode Go is a paid provider configured on the backend. ${openCodeGo.models.length} models fetched live from the Go proxy.`;
    }

    if (isCustomProvider) {
      return `Enter the model ID manually, or fetch available models from ${customProvider?.name}.`;
    }
    
    if (provider === 'openai') {
      return 'GPT-4 / GPT-5 models are more powerful. Mini models are faster and cheaper.';
    }
    
    if (provider === 'gemini') {
      return 'Gemini 3 series are latest models. Gemini 2.5 Flash Lite offers best value.';
    }
    
    if (provider === 'groq') {
      return 'Groq provides ultra-fast inference. Llama 3.3 70B recommended for best quality.';
    }
    
    // Ollama provider
    if (ollamaStatus?.connected) {
      return `${availableModels.length} local models available. No API costs.`;
    }
    return 'Install models with: ollama pull llama3.3';
  };

  // Get placeholder text for empty state
  const getPlaceholderText = () => {
    if (provider === 'waterfall') {
      return ollamaStatus?.connected ? 'Select a waterfall model' : 'Backend offline (using defaults)';
    }

    if (provider === 'opencode-go') {
      return openCodeGo.loading ? 'Loading OpenCode Go models...' : 'Select an OpenCode Go model';
    }

    if (isCustomProvider) {
      return 'Enter model ID (e.g. meta-llama/llama-3-8b-instruct)';
    }

    if (provider === 'openai') {
      return 'Select a model';
    }
    
    // Ollama provider
    if (ollamaStatus?.checking) {
      return 'Loading models...';
    }
    if (ollamaStatus?.connected) {
      return 'No models installed';
    }
    return 'Connect to Ollama first';
  };

  const handleFetchCustomModels = async () => {
    if (!customProvider) return;
    
    setFetchingModels(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (customProvider.apiKey) {
        headers['Authorization'] = `Bearer ${customProvider.apiKey}`;
      }
      
      const response = await fetch(`${customProvider.baseUrl}/models`, {
        method: 'GET',
        headers,
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      if (data && Array.isArray(data.data)) {
        const models = data.data.map((m: any) => m.id).filter(Boolean);
        setCustomModels(models);
        toast({
          title: "Models Fetched",
          description: `Successfully fetched ${models.length} models.`,
        });
      } else {
        throw new Error('Unexpected API response format');
      }
    } catch (error) {
      console.error('Error fetching custom models:', error);
      toast({
        title: "Failed to fetch models",
        description: error instanceof Error ? error.message : "Could not fetch models from the provider.",
        variant: "destructive",
      });
    } finally {
      setFetchingModels(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Model Selection</CardTitle>
        <CardDescription>
          {provider === 'waterfall'
            ? 'Choose which model to route through the free-tier backend waterfall gateway.'
            : isCustomProvider
            ? `Choose which model to use from ${customProvider?.name}.`
            : provider === 'openai' 
            ? 'Choose which OpenAI model to use for AI operations.'
            : provider === 'gemini'
            ? 'Choose which Google Gemini model to use for AI operations.'
            : provider === 'groq'
            ? 'Choose which Groq model to use for AI operations.'
            : provider === 'opencode-go'
            ? 'Choose which OpenCode Go cloud model to use for AI operations.'
            : 'Choose which local Ollama model to use for AI operations.'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="model-select">Model</Label>
            {provider === 'opencode-go' && (
              <button
                type="button"
                onClick={() => void openCodeGo.refresh()}
                disabled={openCodeGo.loading}
                title="Refresh OpenCode Go models"
                className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
              >
                <Refresh className={`h-3 w-3 ${openCodeGo.loading ? 'animate-spin' : ''}`} />
                {openCodeGo.loading ? 'Loading' : `${openCodeGo.models.length} models`}
              </button>
            )}
          </div>
          
          {isCustomProvider ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  id="model-input"
                  placeholder={getPlaceholderText()}
                  value={model || ''}
                  onChange={(e) => setModel(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  variant="outline" 
                  onClick={handleFetchCustomModels}
                  disabled={fetchingModels}
                  className="flex-shrink-0"
                >
                  <Refresh className={`h-4 w-4 mr-2 ${fetchingModels ? 'animate-spin' : ''}`} />
                  Fetch Models
                </Button>
              </div>
              
              {customModels.length > 0 && (
                <Select value={model || ''} onValueChange={setModel}>
                  <SelectTrigger id="custom-model-select">
                    <SelectValue placeholder="Or select from fetched models..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customModels.map((modelOption) => (
                      <SelectItem key={modelOption} value={modelOption}>
                        {modelOption}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ) : (
            <Select value={model || ''} onValueChange={setModel}>
              <SelectTrigger id="model-select">
                <SelectValue placeholder={getPlaceholderText()} />
              </SelectTrigger>
              <SelectContent>
                {provider === 'waterfall' ? (
                  availableModels.map((modelDef: any) => {
                    const id = typeof modelDef === 'string' ? modelDef : modelDef.id;
                    const name = typeof modelDef === 'string' ? modelDef : modelDef.name;
                    const cost = typeof modelDef === 'object' ? modelDef.cost : 'Free';
                    return (
                      <SelectItem key={id} value={id}>
                        <div className="flex items-center justify-between w-full gap-3">
                          <div className="flex items-center gap-1.5 truncate">
                            <Flash className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="truncate">{name}</span>
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                            {cost}
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })
                ) : provider === 'openai' ? (
                  availableModels.map((modelOption: any) => {
                    const id = typeof modelOption === 'string' ? modelOption : modelOption.id;
                    const name = typeof modelOption === 'string' ? modelOption : modelOption.name;
                    return (
                      <SelectItem key={id} value={id}>
                        {name}
                      </SelectItem>
                    );
                  })
                ) : provider === 'gemini' ? (
                  GEMINI_MODELS.map((modelOption) => {
                    const modelInfo = GEMINI_MODEL_INFO[modelOption];
                    return (
                      <SelectItem key={modelOption} value={modelOption}>
                        <div className="flex items-center gap-2">
                          <Sparks className="h-4 w-4" />
                          <div>
                            <div>{modelInfo.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {modelInfo.description} • {modelInfo.pricing}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })
                ) : provider === 'groq' ? (
                  groqModels.map((modelDef) => (
                    <SelectItem key={modelDef.id} value={modelDef.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{modelDef.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {modelDef.cost}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                ) : provider === 'opencode-go' ? (
                  openCodeGo.models.map((modelDef) => (
                    <SelectItem key={modelDef.id} value={modelDef.id}>
                      <div className="flex items-center justify-between w-full gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <Code className="h-3.5 w-3.5 shrink-0 text-primary" />
                          <div className="min-w-0 space-y-0.5">
                            <div className="truncate font-medium">{modelDef.name}</div>
                            <ModelLabels labels={modelDef.labels} />
                          </div>
                        </div>
                        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                          {modelDef.cost}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  availableModels && availableModels.length > 0 ? (
                    availableModels.map((modelOption: any) => {
                      const id = typeof modelOption === 'string' ? modelOption : modelOption.id;
                      return (
                        <SelectItem key={id} value={id}>
                          {id}
                        </SelectItem>
                      );
                    })
                  ) : (
                    <SelectItem value="__placeholder__" disabled>
                      {getPlaceholderText()}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          )}
          
          <p className="text-sm text-muted-foreground">
            {getDescriptionText()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
