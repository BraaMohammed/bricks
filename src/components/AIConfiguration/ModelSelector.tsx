/**
 * ModelSelector Component
 * 
 * Provides model selection dropdown for both OpenAI and Ollama.
 * Handles different states (loading, no models, etc.) and provides
 * appropriate descriptions based on the selected provider.
 */

import { Sparkles } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AIProvider, GEMINI_MODELS, GEMINI_MODEL_INFO } from '@/lib/constants/aiModels';

export interface ModelSelectorProps {
  provider: AIProvider;
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
  model,
  setModel,
  availableModels,
  ollamaStatus,
}: ModelSelectorProps) => {
  // Get description text based on provider and state
  const getDescriptionText = () => {
    if (provider === 'openai') {
      return 'GPT-4 models are more powerful but cost more. GPT-3.5-turbo is faster and cheaper.';
    }
    
    if (provider === 'gemini') {
      return 'Gemini 3 series are latest models. Gemini 2.5 Flash Lite offers best value at $0.10/M tokens.';
    }
    
    // Ollama provider
    if (ollamaStatus?.connected) {
      return `${availableModels.length} local models available. No API costs.`;
    }
    return 'Install models with: ollama pull llama2';
  };

  // Get placeholder text for empty state
  const getPlaceholderText = () => {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Model Selection</CardTitle>
        <CardDescription>
          {provider === 'openai' 
            ? 'Choose which OpenAI model to use for AI operations.'
            : provider === 'gemini'
            ? 'Choose which Google Gemini model to use for AI operations.'
            : 'Choose which local Ollama model to use for AI operations.'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label htmlFor="model-select">Model</Label>
          <Select value={model || ''} onValueChange={setModel}>
            <SelectTrigger id="model-select">
              <SelectValue placeholder="Select a model" />
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
          <p className="text-sm text-muted-foreground">
            {getDescriptionText()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
