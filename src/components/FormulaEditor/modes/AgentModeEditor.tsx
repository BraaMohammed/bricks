import { Search, Flash } from 'iconoir-react';
import { useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { NavArrowDown, Tools } from 'iconoir-react';
import { ColumnBadges } from '@/components/FormulaEditor/ColumnBadges';
import { ThinkingModeToggle } from '../ThinkingModeToggle';
import { ProviderSelector } from '../ProviderSelector';
import { ModelSelector } from '../ModelSelector';

import { useDataStore } from '@/stores/useDataStore';
import { useAgentStore } from '@/stores/editor/useAgentStore';
import { useAISettingsStore, getAvailableModels } from '@/stores/useAISettingsStore';
import { useOllamaConnection } from '@/hooks/useOllamaConnection';
import { useUIStore } from '@/stores/editor/useUIStore';
import type { AIProvider } from '@/lib/constants/aiModels';

export const AgentModeEditor = () => {
  const { headers, rows } = useDataStore();
  const firstRow = rows && rows.length > 0 ? rows[0] : null;

  const { 
    agentProvider: provider, 
    setAgentProvider: onProviderChange,
    agentModel: model,
    setAgentModel: onModelChange,
    agentMaxSteps: maxSteps,
    setAgentMaxSteps: onMaxStepsChange,
    agentTemperature: temperature,
    setAgentTemperature: onTemperatureChange,
    agentThinkingMode: thinkingMode,
    setAgentThinkingMode: onThinkingModeChange,
    agentInstruction: instruction,
    setAgentInstruction: onInstructionChange
  } = useAgentStore();

  const { models: ollamaModels } = useOllamaConnection();
  const { setHasChanges } = useUIStore();
  const { customProviders } = useAISettingsStore();

  const customProvider = provider.startsWith('custom:') 
    ? customProviders.find(p => p.id === provider)
    : undefined;

  const handleInputChange = () => {
    setHasChanges(true);
  };

  const availableModels = getAvailableModels(provider, ollamaModels || []);

  const handleProviderChange = (newProvider: string) => {
    const providerId = newProvider as AIProvider;
    onProviderChange(providerId);
    const firstModel = getAvailableModels(providerId, ollamaModels || [])?.[0]?.id ?? '';
    onModelChange(firstModel);
    handleInputChange();
  };

  const insertColumnPlaceholder = (col: string) => {
    onInstructionChange(instruction + `{${col}}`);
    handleInputChange();
  };

  useEffect(() => {
    if (availableModels.length > 0) {
      const exists = availableModels.some(m => m.id === model);
      if (!exists) {
        onModelChange(availableModels[0].id);
      }
    }
  }, [availableModels, model, onModelChange]);

  const previewText =
    firstRow && instruction
      ? instruction.replace(/\{([^}]+)\}/g, (_, col) => firstRow[col] ?? `{${col}}`)
      : instruction;

  return (
    <div className="space-y-5">
      <Card className="p-4 bg-muted/30 border-dashed">
        <div className="flex gap-3 items-start">
          <Search className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium">AI Web Research Agent</p>
            <p className="text-xs text-muted-foreground">
              Write a research instruction using <code className="bg-muted px-1 rounded">{'{ColumnName}'}</code> placeholders.
              The agent will search the web and read pages to answer your question for each row.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <ProviderSelector
          provider={provider}
          customProviders={customProviders}
          onProviderChange={handleProviderChange}
          compact={true}
        />

        <ModelSelector
          provider={provider}
          customProvider={customProvider}
          availableModels={availableModels}
          selectedModel={model}
          onModelChange={(v) => { onModelChange(v); handleInputChange(); }}
          compact={true}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium flex items-center gap-1.5">
            <Flash className="h-4 w-4" />
            Max Tool Steps
          </Label>
          <Badge variant="secondary" className="tabular-nums">
            {maxSteps} {maxSteps === 1 ? 'step' : 'steps'}
          </Badge>
        </div>
        <Slider
          min={1}
          max={20}
          step={1}
          value={[maxSteps]}
          onValueChange={([v]) => { onMaxStepsChange(v); handleInputChange(); }}
          className="w-full"
        />
        <p className="text-xs text-muted-foreground">
          Each step lets the agent call a tool (search or read a page). Higher = more thorough but slower.
        </p>
      </div>

      <Collapsible className="border rounded-md p-3 bg-muted/10">
        <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <div className="flex items-center gap-2">
            <Tools className="h-4 w-4" />
            Agent Settings
          </div>
          <NavArrowDown className="h-4 w-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4 space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Temperature</Label>
              <Badge variant="secondary" className="tabular-nums">
                {temperature}
              </Badge>
            </div>
            <Slider
              min={0}
              max={2}
              step={0.1}
              value={[temperature]}
              onValueChange={([v]) => { onTemperatureChange(v); handleInputChange(); }}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Precise</span>
              <span>Creative</span>
            </div>
          </div>

          {availableModels.find(m => m.id === model)?.supportsThinking && (
            <ThinkingModeToggle
              enabled={thinkingMode}
              modelName={model}
              onToggle={(v) => { onThinkingModeChange(v); handleInputChange(); }}
            />
          )}
        </CollapsibleContent>
      </Collapsible>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Research Instruction</Label>
        <Textarea
          value={instruction}
          onChange={(e) => { onInstructionChange(e.target.value); handleInputChange(); }}
          placeholder={"Find the CEO of {Company Name} who works at {Website}. Return their full name only."}
          className="min-h-[100px] font-mono text-sm resize-y"
        />
        <p className="text-xs text-muted-foreground">
          Use <code className="bg-muted px-1 rounded">{'{ColumnName}'}</code> to inject cell values from any column.
        </p>
      </div>

      {headers.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">Insert column</Label>
          <div className="flex flex-wrap gap-1.5">
            {headers.map((col) => (
              <Badge
                key={col}
                variant="outline"
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => insertColumnPlaceholder(col)}
              >
                {col}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {instruction && (
        <Card className="p-3 bg-muted/20">
          <p className="text-xs font-medium text-muted-foreground mb-1">Preview (row 1):</p>
          <p className="text-sm italic text-foreground/80 break-words">{previewText}</p>
        </Card>
      )}
    </div>
  );
};
