/**
 * EmailFinderModeEditor
 *
 * UI for the "Email Finder" formula mode. The user provides a lead context
 * template using {ColumnName} placeholders. When executed, the AI agent
 * autonomously finds and validates the lead's email address for every row.
 *
 * Mirrors AgentModeEditor.tsx in structure and component usage.
 */

import { useEffect } from 'react';
import { Mail, Zap, Settings2, ChevronDown, Info } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ColumnBadges } from '@/components/FormulaEditor/ColumnBadges';
import { getProviderModels, PROVIDERS } from '@/lib/constants/aiModels';
import type { AIProvider } from '@/lib/constants/aiModels';
import { ThinkingModeToggle } from '../ThinkingModeToggle';

interface EmailFinderModeEditorProps {
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
  // Lead context template
  context: string;
  onContextChange: (value: string) => void;
  // Ollama models (dynamic)
  ollamaModels?: string[];
  // Change handler
  onInputChange: () => void;
}

export const EmailFinderModeEditor = ({
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
  context,
  onContextChange,
  ollamaModels,
  onInputChange,
}: EmailFinderModeEditorProps) => {
  const availableModels = getProviderModels(provider, ollamaModels || []);

  const handleProviderChange = (newProvider: string) => {
    const providerId = newProvider as AIProvider;
    onProviderChange(providerId);
    const firstModel = getProviderModels(providerId, ollamaModels || [])?.[0]?.id ?? '';
    onModelChange(firstModel);
    onInputChange();
  };

  const insertColumnPlaceholder = (col: string) => {
    onContextChange(context + `{${col}}`);
    onInputChange();
  };

  // Sync model selection when provider or ollama models change
  useEffect(() => {
    if (availableModels.length > 0) {
      const exists = availableModels.some(m => m.id === model);
      if (!exists) {
        onModelChange(availableModels[0].id);
      }
    }
  }, [availableModels, model, onModelChange]);

  // Live preview — replace {ColumnName} with first row values
  const previewText =
    firstRow && context
      ? context.replace(/\{([^}]+)\}/g, (_, col) => firstRow[col] ?? `{${col}}`)
      : context;

  return (
    <div className="space-y-5">

      {/* Header card */}
      <Card className="p-4 bg-muted/30 border-dashed">
        <div className="flex gap-3 items-start">
          <Mail className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium">AI Email Finder</p>
            <p className="text-xs text-muted-foreground">
              Provide lead context using{' '}
              <code className="bg-muted px-1 rounded">{'{ColumnName}'}</code> placeholders.
              The agent will scan the context, try common email patterns, and search the web
              — validating every candidate before returning a result.
            </p>
          </div>
        </div>
      </Card>

      {/* Validation status legend */}
      <Card className="p-3 bg-muted/10 border">
        <div className="flex items-center gap-1.5 mb-2">
          <Info className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-xs font-medium text-muted-foreground">What the agent returns</p>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-muted-foreground"><span className="font-mono">email@company.com</span> — confirmed valid</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-yellow-500" />
            <span className="text-xs text-muted-foreground"><span className="font-mono">email [catch-all]</span> — probably valid</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
            <span className="text-xs text-muted-foreground"><span className="font-mono">not found</span> — exhausted all options</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-orange-500" />
            <span className="text-xs text-muted-foreground"><span className="font-mono">service_error</span> — try again later</span>
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

      {/* Max Steps slider */}
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
          min={5}
          max={30}
          step={1}
          value={[maxSteps]}
          onValueChange={([v]) => { onMaxStepsChange(v); onInputChange(); }}
          className="w-full"
        />
        <p className="text-xs text-muted-foreground">
          Each step = one tool call (validate, search, or read a page).
          More steps = more thorough but slower. <strong>15</strong> is recommended.
        </p>
      </div>

      {/* Advanced settings */}
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
              max={1}
              step={0.1}
              value={[temperature]}
              onValueChange={([v]) => { onTemperatureChange(v); onInputChange(); }}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Systematic (0.0)</span>
              <span>Creative (1.0)</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Keep low (0.2–0.4) for more systematic pattern guessing.
            </p>
          </div>

          {/* Thinking Mode (only for supported models) */}
          {availableModels.find(m => m.id === model)?.supportsThinking && (
            <ThinkingModeToggle
              enabled={thinkingMode}
              modelName={model}
              onToggle={(v) => { onThinkingModeChange(v); onInputChange(); }}
            />
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Lead Context textarea */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Lead Context</Label>
        <Textarea
          value={context}
          onChange={(e) => { onContextChange(e.target.value); onInputChange(); }}
          placeholder={
            '{First Name} {Last Name}, {Job Title} at {Company}.\nWebsite: {Website}\nLinkedIn: {LinkedIn URL}'
          }
          className="min-h-[120px] font-mono text-sm resize-y"
        />
        <p className="text-xs text-muted-foreground">
          Provide as much context as possible — name, company, website, LinkedIn, job title.
          Use <code className="bg-muted px-1 rounded">{'{ColumnName}'}</code> to inject values from any column.
          The more context, the better and faster the agent will find the email.
        </p>
      </div>

      {/* Column badges */}
      {headers.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">Insert column</Label>
          <ColumnBadges
            headers={headers}
            onColumnClick={insertColumnPlaceholder}
          />
        </div>
      )}

      {/* Live preview */}
      {context && (
        <Card className="p-3 bg-muted/20">
          <p className="text-xs font-medium text-muted-foreground mb-1">Preview (row 1):</p>
          <p className="text-sm italic text-foreground/80 break-words whitespace-pre-wrap">
            {previewText}
          </p>
        </Card>
      )}
    </div>
  );
};
