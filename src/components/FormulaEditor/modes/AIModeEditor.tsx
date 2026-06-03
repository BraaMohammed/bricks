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

import { useDataStore } from '@/stores/useDataStore';
import { useAIModeStore } from '@/stores/editor/useAIModeStore';
import { useAISettingsStore, getAvailableModels } from '@/stores/useAISettingsStore';
import { useOllamaConnection } from '@/hooks/useOllamaConnection';
import { useUIStore } from '@/stores/editor/useUIStore';

export const AIModeEditor = () => {
  // Store subscriptions
  const { headers, rows } = useDataStore();
  const firstRow = rows && rows.length > 0 ? rows[0] : null;

  const { aiPrompt: prompt, aiMessage: message, setAiPrompt: onPromptChange, setAiMessage: onMessageChange } = useAIModeStore();

  const { 
    aiProvider: provider, 
    setAiProvider: onProviderChange,
    model: selectedModel,
    setModel: onModelChange,
    temperature,
    setTemperature: onTemperatureChange,
    maxTokens,
    setMaxTokens: onMaxTokensChange,
    topK,
    setTopK: onTopKChange,
    thinkingMode,
    setThinkingMode: onThinkingModeChange,
    ollamaBaseUrl,
    setOllamaBaseUrl: onBaseUrlChange,
    customProviders
  } = useAISettingsStore();

  const customProvider = provider.startsWith('custom:') 
    ? customProviders.find(p => p.id === provider)
    : undefined;

  const { connected: ollamaConnected, models: ollamaModels, checkConnection: onRefreshConnection } = useOllamaConnection();
  const { showAdvancedSettings, setShowAdvancedSettings: onAdvancedSettingsChange, setHasChanges } = useUIStore();

  const availableModels = getAvailableModels(provider, ollamaModels);
  const selectedModelInfo = availableModels.find(m => m.id === selectedModel);
  const supportsThinking = selectedModelInfo?.supportsThinking || false;

  const handleInputChange = () => {
    setHasChanges(true);
  };

  const handleColumnClick = (columnName: string) => {
    const insertion = `{${columnName}}`;
    const newPrompt = prompt + (prompt ? ' ' : '') + insertion;
    onPromptChange(newPrompt);
    handleInputChange();
  };

  return (
    <div className="space-y-6">
      {/* Provider Selection */}
      <ProviderSelector
        provider={provider}
        customProviders={customProviders}
        ollamaConnected={ollamaConnected}
        ollamaModels={ollamaModels}
        ollamaBaseUrl={ollamaBaseUrl}
        onProviderChange={(value) => {
          onProviderChange(value);
          handleInputChange();
        }}
        onRefreshConnection={onRefreshConnection}
        onBaseUrlChange={(url) => {
          onBaseUrlChange(url);
          handleInputChange();
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
        customProvider={customProvider}
        availableModels={availableModels}
        selectedModel={selectedModel}
        onModelChange={(model) => {
          onModelChange(model);
          handleInputChange();
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
          handleInputChange();
        }}
        onMaxTokensChange={(value) => {
          onMaxTokensChange(value);
          handleInputChange();
        }}
        onTopKChange={(value) => {
          onTopKChange(value);
          handleInputChange();
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
            handleInputChange();
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
            handleInputChange();
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
            handleInputChange();
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
