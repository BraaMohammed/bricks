/**
 * AgentModeEditor
 *
 * UI for the "AI Agent" formula mode. The user writes a natural-language
 * instruction with {ColumnName} placeholders. When executed, the agent
 * autonomously searches the web and reads pages to answer the instruction
 * for every row.
 */

import { Search, Zap } from 'lucide-react';
import { useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Settings2 } from 'lucide-react';
import { ColumnBadges } from '@/components/FormulaEditor/ColumnBadges';
import { getProviderModels, PROVIDERS } from '@/lib/constants/aiModels';
import type { AIProvider } from '@/lib/constants/aiModels';
import { ThinkingModeToggle } from '../ThinkingModeToggle';

interface AgentModeEditorProps {
  headers: string[];
  firstRow: Record<string, string> | null;
  // Agent config
  provider: AIProvider;
  onProviderChange: (provider: AIProvider) => void;
  model: string;
  onModelChange: (model: string) => void;
  maxSteps: number;
  onMaxStepsChange: (steps: number) => void;
  temperature: number;
  onTemperatureChange: (temp: number) => void;
  thinkingMode: boolean;
  onThinkingModeChange: (enabled: boolean) => void;
  instruction: string;
  onInstructionChange: (value: string) => void;
  // list of available ollama models (dynamic)
  ollamaModels?: string[];
  // Change handler
  onInputChange: () => void;
}

export const AgentModeEditor = ({
  headers,
  firstRow,
  provider,
  onProviderChange,
  model,
  onModelChange,
  maxSteps,
  onMaxStepsChange,
  temperature,
  onTemperatureChange,
  thinkingMode,
  onThinkingModeChange,
  instruction,
  onInstructionChange,
  onInputChange,
  ollamaModels,
}: AgentModeEditorProps) => {
  const availableModels = getProviderModels(provider, ollamaModels || []);

  const handleProviderChange = (newProvider: string) => {
    const providerId = newProvider as AIProvider;
    onProviderChange(providerId);
    
    // Disable thinking mode by default for Ollama
    if (providerId === 'ollama') {
      onThinkingModeChange(false);
    }
    
    // Reset model to first available when provider changes
    const firstModel = getProviderModels(providerId, ollamaModels || [])?.[0]?.id ?? '';
    onModelChange(firstModel);
    onInputChange();
  };

  const insertColumnPlaceholder = (col: string) => {
    onInstructionChange(instruction + `{${col}}`);
    onInputChange();
  };

  // if available models list changes (e.g. new ollama models appear),
  // pick the first one when the current selection is gone
  useEffect(() => {
    if (availableModels.length > 0) {
      const exists = availableModels.some(m => m.id === model);
      if (!exists) {
        onModelChange(availableModels[0].id);
      }
    }
  }, [availableModels, model, onModelChange]);

  // Build a preview — replaces placeholders with first row values
  const previewText =
    firstRow && instruction
      ? instruction.replace(/\{([^}]+)\}/g, (_, col) => firstRow[col] ?? `{${col}}`)
      : instruction;

  return (
    <div className="space-y-5">
      {/* Header / description */}
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

      {/* Provider + Model selectors */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">AI Provider</Label>
          <Select value={provider} onValueChange={handleProviderChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              {PROVIDERS.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Model</Label>
          <Select value={model} onValueChange={(v) => { onModelChange(v); onInputChange(); }}>
            <SelectTrigger>
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {availableModels.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Max steps */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium flex items-center gap-1.5">
            <Zap className="h-4 w-4" />
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
          onValueChange={([v]) => { onMaxStepsChange(v); onInputChange(); }}
          className="w-full"
        />
        <p className="text-xs text-muted-foreground">
          Each step lets the agent call a tool (search or read a page). Higher = more thorough but slower.
        </p>
      </div>

      {/* Advanced Settings for Agent */}
      <Collapsible className="border rounded-md p-3 bg-muted/10">
        <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Agent Settings
          </div>
          <ChevronDown className="h-4 w-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4 space-y-5">
          {/* Temperature */}
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
              onValueChange={([v]) => { onTemperatureChange(v); onInputChange(); }}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Precise</span>
              <span>Creative</span>
            </div>
          </div>

          {/* Thinking Mode */}
          {availableModels.find(m => m.id === model)?.supportsThinking && (
            <ThinkingModeToggle
              enabled={thinkingMode}
              modelName={model}
              onToggle={(v) => { onThinkingModeChange(v); onInputChange(); }}
            />
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Instruction textarea */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Research Instruction</Label>
        <Textarea
          value={instruction}
          onChange={(e) => { onInstructionChange(e.target.value); onInputChange(); }}
          placeholder={"Find the CEO of {Company Name} who works at {Website}. Return their full name only."}
          className="min-h-[100px] font-mono text-sm resize-y"
        />
        <p className="text-xs text-muted-foreground">
          Use <code className="bg-muted px-1 rounded">{'{ColumnName}'}</code> to inject cell values from any column.
        </p>
      </div>

      {/* Column badges */}
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

      {/* Live preview */}
      {instruction && (
        <Card className="p-3 bg-muted/20">
          <p className="text-xs font-medium text-muted-foreground mb-1">Preview (row 1):</p>
          <p className="text-sm italic text-foreground/80 break-words">{previewText}</p>
        </Card>
      )}
    </div>
  );
};
