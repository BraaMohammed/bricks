import { Wand2, Brain } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ModelDefinition, AIProvider } from '@/lib/constants/aiModels';

interface ModelSelectorProps {
  provider: AIProvider;
  availableModels: ModelDefinition[];
  selectedModel: string;
  onModelChange: (model: string) => void;
  ollamaConnected?: boolean;
  ollamaModelsCount?: number;
}

export const ModelSelector = ({
  provider,
  availableModels,
  selectedModel,
  onModelChange,
  ollamaConnected,
  ollamaModelsCount
}: ModelSelectorProps) => {
  const selectedModelInfo = availableModels.find(m => m.id === selectedModel);

  return (
    <div>
      <Label htmlFor="ai-model" className="text-base font-semibold flex items-center gap-2 mb-3">
        <Wand2 className="h-4 w-4" />
        AI Model
      </Label>
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
      {availableModels.length === 0 && (
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
