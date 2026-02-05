import { Brain } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { ProviderSelector } from '@/components/FormulaEditor/ProviderSelector';
import { ModelSelector } from '@/components/FormulaEditor/ModelSelector';
import { ThinkingModeToggle } from '@/components/FormulaEditor/ThinkingModeToggle';
import { AdvancedSettings } from '@/components/FormulaEditor/AdvancedSettings';
import { FormulaPreview } from '@/components/FormulaEditor/FormulaPreview';
import { ColumnBadges } from '@/components/FormulaEditor/ColumnBadges';
import type { AIProvider, ModelDefinition } from '@/lib/constants/aiModels';

interface AIModeEditorProps {
  headers: string[];
  firstRow: Record<string, string> | null;
  // Provider settings
  provider: AIProvider;
  onProviderChange: (provider: AIProvider) => void;
  ollamaConnected: boolean;
  ollamaModels: string[];
  ollamaBaseUrl: string;
  onRefreshConnection: () => void;
  onBaseUrlChange: (url: string) => void;
  // Model settings
  availableModels: ModelDefinition[];
  selectedModel: string;
  onModelChange: (model: string) => void;
  // AI settings
  temperature: number;
  onTemperatureChange: (value: number) => void;
  maxTokens: number;
  onMaxTokensChange: (value: number) => void;
  topK: number;
  onTopKChange: (value: number) => void;
  // Thinking mode
  thinkingMode: boolean;
  onThinkingModeChange: (enabled: boolean) => void;
  // Prompts
  prompt: string;
  onPromptChange: (value: string) => void;
  message: string;
  onMessageChange: (value: string) => void;
  // Advanced settings
  showAdvancedSettings: boolean;
  onAdvancedSettingsChange: (open: boolean) => void;
  // Change handler
  onInputChange: () => void;
}

export const AIModeEditor = ({
  headers,
  firstRow,
  provider,
  onProviderChange,
  ollamaConnected,
  ollamaModels,
  ollamaBaseUrl,
  onRefreshConnection,
  onBaseUrlChange,
  availableModels,
  selectedModel,
  onModelChange,
  temperature,
  onTemperatureChange,
  maxTokens,
  onMaxTokensChange,
  topK,
  onTopKChange,
  thinkingMode,
  onThinkingModeChange,
  prompt,
  onPromptChange,
  message,
  onMessageChange,
  showAdvancedSettings,
  onAdvancedSettingsChange,
  onInputChange
}: AIModeEditorProps) => {
  const selectedModelInfo = availableModels.find(m => m.id === selectedModel);
  const supportsThinking = selectedModelInfo?.supportsThinking || false;

  const handleColumnClick = (columnName: string) => {
    const insertion = `{${columnName}}`;
    const newPrompt = prompt + (prompt ? ' ' : '') + insertion;
    onPromptChange(newPrompt);
    onInputChange();
  };

  return (
    <div className="space-y-6">
      {/* Provider Selection */}
      <ProviderSelector
        provider={provider}
        ollamaConnected={ollamaConnected}
        ollamaModels={ollamaModels}
        ollamaBaseUrl={ollamaBaseUrl}
        onProviderChange={(value) => {
          onProviderChange(value);
          onInputChange();
        }}
        onRefreshConnection={onRefreshConnection}
        onBaseUrlChange={(url) => {
          onBaseUrlChange(url);
          onInputChange();
        }}
      />

      {/* Available columns */}
      <ColumnBadges
        headers={headers}
        onColumnClick={handleColumnClick}
        helpText="Click on a column to add it to your prompt. The AI will have access to all this data for each row:"
      />

      {/* Model Selection */}
      <ModelSelector
        provider={provider}
        availableModels={availableModels}
        selectedModel={selectedModel}
        onModelChange={(model) => {
          onModelChange(model);
          onInputChange();
        }}
        ollamaConnected={ollamaConnected}
        ollamaModelsCount={ollamaModels.length}
      />

      {/* Advanced Settings (Temperature, MaxTokens, TopK) */}
      <AdvancedSettings
        provider={provider}
        temperature={temperature}
        maxTokens={maxTokens}
        topK={topK}
        onTemperatureChange={(value) => {
          onTemperatureChange(value);
          onInputChange();
        }}
        onMaxTokensChange={(value) => {
          onMaxTokensChange(value);
          onInputChange();
        }}
        onTopKChange={(value) => {
          onTopKChange(value);
          onInputChange();
        }}
        open={showAdvancedSettings}
        onOpenChange={onAdvancedSettingsChange}
      />

      {/* Thinking Mode Toggle (for reasoning models) */}
      {supportsThinking && (
        <ThinkingModeToggle
          enabled={thinkingMode}
          modelName={selectedModel}
          onToggle={(enabled) => {
            onThinkingModeChange(enabled);
            onInputChange();
          }}
        />
      )}

      {/* AI Prompt */}
      <div>
        <Label htmlFor="ai-prompt" className="text-base font-semibold flex items-center gap-2 mb-3">
          <Brain className="h-4 w-4" />
          Prompt
        </Label>
        <Textarea
          id="ai-prompt"
          value={prompt}
          onChange={(e) => {
            onPromptChange(e.target.value);
            onInputChange();
          }}
          placeholder="What do you want the AI to do with this row data? For example:
- Generate a personalized message for {Full Name}
- Analyze the sentiment of {Feedback}
- Create an email subject line for {Company}
- Classify this lead based on {Industry} and {Company Size}"
          rows={4}
        />
      </div>

      {/* Additional Context */}
      <div>
        <Label htmlFor="ai-message" className="text-base font-semibold mb-3 block">
          Additional Context (Optional)
        </Label>
        <Textarea
          id="ai-message"
          value={message}
          onChange={(e) => {
            onMessageChange(e.target.value);
            onInputChange();
          }}
          placeholder="Add any additional context or instructions for the AI..."
          rows={3}
        />
      </div>

      {/* Preview */}
      {prompt && firstRow && prompt.includes('{') && (
        <Card className="p-4 bg-muted/50">
          <FormulaPreview
            mode="ai"
            content={`${prompt}${message ? `. Additional context: ${message}` : ''}`}
            firstRow={firstRow}
            additionalInfo="Example with actual data from the first row. Column references like {Column Name} will be replaced with actual values from each row."
          />
        </Card>
      )}
    </div>
  );
};
