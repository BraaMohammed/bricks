/**
 * ModelSelector Component
 * 
 * Provides model selection dropdown for both OpenAI and Ollama.
 * Handles different states (loading, no models, etc.) and provides
 * appropriate descriptions based on the selected provider.
 */

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AIProvider } from '@/lib/constants/aiModels';

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
