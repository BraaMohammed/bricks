import { useEffect } from 'react';
import { Mail, Flash, Tools, NavArrowDown, InfoCircle } from 'iconoir-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ColumnBadges } from '@/components/FormulaEditor/ColumnBadges';
import { ThinkingModeToggle } from '../ThinkingModeToggle';
import { ProviderSelector } from '../ProviderSelector';
import { ModelSelector } from '../ModelSelector';

import { useDataStore } from '@/stores/useDataStore';
import { useEmailFinderStore } from '@/stores/editor/useEmailFinderStore';
import { useAISettingsStore, getAvailableModels } from '@/stores/useAISettingsStore';
import { useOllamaConnection } from '@/hooks/useOllamaConnection';
import { useBackendStatus } from '@/hooks/useBackendStatus';
import { useUIStore } from '@/stores/editor/useUIStore';
import type { AIProvider } from '@/lib/constants/aiModels';

export const EmailFinderModeEditor = () => {
  const { headers, rows } = useDataStore();
  const firstRow = rows && rows.length > 0 ? rows[0] : null;

  const { 
    emailProvider: provider, 
    setEmailProvider: onProviderChange,
    emailModel: model,
    setEmailModel: onModelChange,
    emailMaxSteps: maxSteps,
    setEmailMaxSteps: onMaxStepsChange,
    emailTemperature: temperature,
    setEmailTemperature: onTemperatureChange,
    emailThinkingMode: thinkingMode,
    setEmailThinkingMode: onThinkingModeChange,
    emailContext: context,
    setEmailContext: onContextChange
  } = useEmailFinderStore();

  const { models: ollamaModels } = useOllamaConnection();
  const backend = useBackendStatus();
  const { setHasChanges } = useUIStore();
  const { customProviders } = useAISettingsStore();

  const customProvider = provider.startsWith('custom:') 
    ? customProviders.find(p => p.id === provider)
    : undefined;

  const handleInputChange = () => {
    setHasChanges(true);
  };

  const availableModels = getAvailableModels(provider, ollamaModels || [], backend.models);

  const handleProviderChange = (newProvider: string) => {
    const providerId = newProvider as AIProvider;
    onProviderChange(providerId);
    const firstModel = getAvailableModels(providerId, ollamaModels || [], backend.models)?.[0]?.id ?? '';
    onModelChange(firstModel);
    handleInputChange();
  };

  const insertColumnPlaceholder = (col: string) => {
    onContextChange(context + `{${col}}`);
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
    firstRow && context
      ? context.replace(/\{([^}]+)\}/g, (_, col) => firstRow[col] ?? `{${col}}`)
      : context;

  return (
    <div className="space-y-5">
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

      <Card className="p-3 bg-muted/10 border">
        <div className="flex items-center gap-1.5 mb-2">
          <InfoCircle className="h-3.5 w-3.5 text-muted-foreground" />
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
          min={5}
          max={30}
          step={1}
          value={[maxSteps]}
          onValueChange={([v]) => { onMaxStepsChange(v); handleInputChange(); }}
          className="w-full"
        />
        <p className="text-xs text-muted-foreground">
          Each step = one tool call (validate, search, or read a page).
          More steps = more thorough but slower. <strong>15</strong> is recommended.
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
              max={1}
              step={0.1}
              value={[temperature]}
              onValueChange={([v]) => { onTemperatureChange(v); handleInputChange(); }}
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
        <Label className="text-sm font-medium">Lead Context</Label>
        <Textarea
          value={context}
          onChange={(e) => { onContextChange(e.target.value); handleInputChange(); }}
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

      {headers.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">Insert column</Label>
          <ColumnBadges
            headers={headers}
            onColumnClick={insertColumnPlaceholder}
          />
        </div>
      )}

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
