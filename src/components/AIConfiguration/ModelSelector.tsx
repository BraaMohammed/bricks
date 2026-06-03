/**
 * ModelSelector Component
 * 
 * Provides model selection dropdown for both OpenAI and Ollama.
 * Handles different states (loading, no models, etc.) and provides
 * appropriate descriptions based on the selected provider.
 */

import { useState } from 'react';
import { Sparkles, Globe, RefreshCw, Search } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AIProvider, GEMINI_MODELS, GEMINI_MODEL_INFO, groqModels, CustomProvider } from '@/lib/constants/aiModels';
import { toast } from '@/hooks/use-toast';

export interface ModelSelectorProps {
  provider: AIProvider;
  customProvider?: CustomProvider;
  model: string;
  setModel: (model: string) => void;
  availableModels: string[];
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
  const isCustomProvider = provider.startsWith('custom:') && !!customProvider;
  // Get description text based on provider and state
  const getDescriptionText = () => {
    if (isCustomProvider) {
      return `Enter the model ID manually, or fetch available models from ${customProvider?.name}.`;
    }
    
    if (provider === 'openai') {
      return 'GPT-4 models are more powerful but cost more. GPT-3.5-turbo is faster and cheaper.';
    }
    
    if (provider === 'gemini') {
      return 'Gemini 3 series are latest models. Gemini 2.5 Flash Lite offers best value at $0.10/M tokens.';
    }
    
    if (provider === 'groq') {
      return 'Groq provides ultra-fast inference. Llama 3.3 70B recommended for best quality. Free tier: 30-60 req/min.';
    }
    
    // Ollama provider
    if (ollamaStatus?.connected) {
      return `${availableModels.length} local models available. No API costs.`;
    }
    return 'Install models with: ollama pull llama2';
  };

  // Get placeholder text for empty state
  const getPlaceholderText = () => {
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
          {isCustomProvider
            ? `Choose which model to use from ${customProvider?.name}.`
            : provider === 'openai' 
            ? 'Choose which OpenAI model to use for AI operations.'
            : provider === 'gemini'
            ? 'Choose which Google Gemini model to use for AI operations.'
            : provider === 'groq'
            ? 'Choose which Groq model to use for AI operations.'
            : 'Choose which local Ollama model to use for AI operations.'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label htmlFor="model-select">Model</Label>
          
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
                  <RefreshCw className={`h-4 w-4 mr-2 ${fetchingModels ? 'animate-spin' : ''}`} />
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
                {provider === 'openai' ? (
                  // OpenAI models
                  availableModels.map((modelOption) => (
                    <SelectItem key={modelOption} value={modelOption}>
                      {modelOption}
                    </SelectItem>
                  ))
                ) : provider === 'gemini' ? (
                  // Gemini models
                  GEMINI_MODELS.map((modelOption) => {
                    const modelInfo = GEMINI_MODEL_INFO[modelOption];
                    return (
                      <SelectItem key={modelOption} value={modelOption}>
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
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
                  // Groq models
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
                ) : (
                  // Ollama models
                  availableModels && availableModels.length > 0 ? (
                    availableModels.map((modelOption) => (
                      <SelectItem key={modelOption} value={modelOption}>
                        {modelOption}
                      </SelectItem>
                    ))
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
