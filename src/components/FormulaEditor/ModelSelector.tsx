import { useState } from 'react';
import { MagicWand, Brain, Refresh } from 'iconoir-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import type { ModelDefinition, AIProvider, CustomProvider } from '@/lib/constants/aiModels';

interface ModelSelectorProps {
  provider: AIProvider;
  customProvider?: CustomProvider;
  availableModels: ModelDefinition[];
  selectedModel: string;
  onModelChange: (model: string) => void;
  ollamaConnected?: boolean;
  ollamaModelsCount?: number;
  compact?: boolean;
}

export const ModelSelector = ({
  provider,
  customProvider,
  availableModels,
  selectedModel,
  onModelChange,
  ollamaConnected,
  ollamaModelsCount,
  compact = false
}: ModelSelectorProps) => {
  const selectedModelInfo = availableModels.find(m => m.id === selectedModel);
  const isCustomProvider = provider.startsWith('custom:') && !!customProvider;
  
  const [fetchingModels, setFetchingModels] = useState(false);
  const [customModels, setCustomModels] = useState<string[]>([]);

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
    <div>
      {!compact && (
        <Label htmlFor="ai-model" className="text-base font-semibold flex items-center gap-2 mb-3">
          <MagicWand className="h-4 w-4" />
          AI Model
        </Label>
      )}
      {compact && (
        <Label htmlFor="ai-model" className="text-sm font-medium mb-2 block">
          AI Model
        </Label>
      )}
      
      {isCustomProvider ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              id="model-input"
              placeholder="Enter model ID..."
              value={selectedModel || ''}
              onChange={(e) => onModelChange(e.target.value)}
              className="flex-1"
            />
            <Button 
              variant="outline" 
              onClick={handleFetchCustomModels}
              disabled={fetchingModels}
              className="flex-shrink-0"
            >
              <Refresh className={`h-4 w-4 mr-2 ${fetchingModels ? 'animate-spin' : ''}`} />
              Fetch
            </Button>
          </div>
          
          {customModels.length > 0 && (
            <Select value={selectedModel || ''} onValueChange={onModelChange}>
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
        <Select 
          value={availableModels.length > 0 ? selectedModel : undefined} 
          onValueChange={onModelChange}
          disabled={availableModels.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select AI model" />
          </SelectTrigger>
          <SelectContent>
            {availableModels.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                <div className="flex items-center gap-2">
                  {model.name}
                  {model.supportsThinking && <Brain className="h-3 w-3" />}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {!isCustomProvider && availableModels.length === 0 && (
        <p className="text-sm text-orange-600 mt-2 p-2 bg-orange-50 rounded border border-orange-200">
          {provider === 'ollama' 
            ? (ollamaConnected ? 'No models installed. Run: ollama pull llama2' : 'Connect to Ollama first')
            : 'No models available'
          }
        </p>
      )}
      <p className="text-xs text-muted-foreground mt-2">
        {availableModels.length > 0 && provider === 'openai' ? (
          <>
            💡 Cost: {selectedModelInfo?.cost || 'Select a model to see pricing'}
            <br />
            Choose based on your needs: GPT-4o Mini for cost efficiency, GPT-4o for multimodal tasks, o1/o3 for complex reasoning, GPT-5 for cutting-edge performance.
          </>
        ) : availableModels.length > 0 && provider === 'ollama' ? (
          <>
            💡 {ollamaConnected 
              ? `${ollamaModelsCount || 0} local models available. No API costs.`
              : 'Install models with: ollama pull llama2'
            }
          </>
        ) : availableModels.length > 0 && provider === 'waterfall' ? (
          <>
            💡 Cost: {selectedModelInfo?.cost || 'Free Gateway Tier'}
            <br />
            Routed via Bricks Waterfall Gateway across free tiers with auto-failover (zero client API keys).
          </>
        ) : availableModels.length > 0 && provider === 'gemini' ? (
          <>
            💡 Cost: {selectedModelInfo?.cost || 'Select a model to see pricing'}
            <br />
            Gemini models offer strong performance with competitive pricing.
          </>
        ) : null}
      </p>
    </div>
  );
};
