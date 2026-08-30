import { useEffect } from 'react';
import { Group, EditPencil, UserBadgeCheck, Sparks, Brain, Key, Server } from 'iconoir-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { ColumnBadges } from '@/components/FormulaEditor/ColumnBadges';
import { toast } from 'sonner';

import { useDataStore } from '@/stores/useDataStore';
import { useAIAgentsStore } from '@/stores/editor/useAIAgentsStore';
import { useUIStore } from '@/stores/editor/useUIStore';
import { useOllamaConnection } from '@/hooks/useOllamaConnection';
import { useBackendStatus } from '@/hooks/useBackendStatus';
import { getAvailableModels, useAISettingsStore } from '@/stores/useAISettingsStore';
import type { AIProvider } from '@/lib/constants/aiModels';
import { ProviderSelector } from '../ProviderSelector';
import { ModelSelector } from '../ModelSelector';

export const AIAgentsModeEditor = () => {
  const { headers, rows } = useDataStore();
  const firstRow = rows && rows.length > 0 ? rows[0] : null;

  const {
    creatorProvider,
    setCreatorProvider: onCreatorProviderChange,
    roleplayProvider,
    setRoleplayProvider: onRoleplayProviderChange,
    messageCreatorModel,
    setMessageCreatorModel: onMessageCreatorModelChange,
    messageCreatorThinking,
    setMessageCreatorThinking: onMessageCreatorThinkingChange,
    messageCreatorInstructions,
    setMessageCreatorInstructions: onMessageCreatorInstructionsChange,
    leadRoleplayModel,
    setLeadRoleplayModel: onLeadRoleplayModelChange,
    leadRoleplayThinking,
    setLeadRoleplayThinking: onLeadRoleplayThinkingChange,
    leadRoleplayInstructions,
    setLeadRoleplayInstructions: onLeadRoleplayInstructionsChange,
    maxIterations,
    setMaxIterations: onMaxIterationsChange
  } = useAIAgentsStore();

  const { models: ollamaModelsRaw, connected: ollamaConnected } = useOllamaConnection();
  const backend = useBackendStatus();
  const { setHasChanges } = useUIStore();
  const ollamaModels = ollamaModelsRaw || [];
  const { customProviders } = useAISettingsStore();

  const customCreatorProvider = creatorProvider.startsWith('custom:')
    ? customProviders.find(p => p.id === creatorProvider)
    : undefined;

  const customRoleplayProvider = roleplayProvider.startsWith('custom:')
    ? customProviders.find(p => p.id === roleplayProvider)
    : undefined;

  const handleInputChange = () => {
    setHasChanges(true);
  };

  const handleColumnClick = (columnName: string) => {
    const insertion = `{${columnName}}`;
    navigator.clipboard.writeText(insertion).then(() => {
      toast.success(`Copied ${insertion} to clipboard!`);
    }).catch(() => {
      toast.error('Failed to copy to clipboard');
    });
  };

  const availableCreatorModels = getAvailableModels(creatorProvider, ollamaModels, backend.models);
  const availableRoleplayModels = getAvailableModels(roleplayProvider, ollamaModels, backend.models);

  // Auto-select first model if current isn't in list
  useEffect(() => {
    if (availableCreatorModels.length > 0 && !availableCreatorModels.find(m => m.id === messageCreatorModel)) {
      onMessageCreatorModelChange(availableCreatorModels[0].id);
    }
  }, [availableCreatorModels, messageCreatorModel, onMessageCreatorModelChange]);

  useEffect(() => {
    if (availableRoleplayModels.length > 0 && !availableRoleplayModels.find(m => m.id === leadRoleplayModel)) {
      onLeadRoleplayModelChange(availableRoleplayModels[0].id);
    }
  }, [availableRoleplayModels, leadRoleplayModel, onLeadRoleplayModelChange]);

  const creatorModelInfo = availableCreatorModels.find(m => m.id === messageCreatorModel);
  const roleplayModelInfo = availableRoleplayModels.find(m => m.id === leadRoleplayModel);

  const resolvePreview = (text: string) => {
    if (!text || !firstRow) return text;
    return text.replace(/\{([^}]+)\}/g, (match, columnName) => {
      const value = firstRow[columnName.trim()];
      return value ? String(value) : match;
    });
  };

  const creatorPreview = resolvePreview(messageCreatorInstructions);
  const roleplayPreview = resolvePreview(leadRoleplayInstructions);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Group className="h-5 w-5" />
          AI Copy Agents Configuration
        </CardTitle>
        <CardDescription>
          Two AI agents collaborate to create perfect DM messages through iterative refinement
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Available columns */}
        <ColumnBadges
          headers={headers}
          onColumnClick={handleColumnClick}
          helpText="Click on a column to copy it, then paste it into the custom instructions below to inject row data:"
        />

        {/* Agent Configuration Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Message Creator Agent */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <EditPencil className="h-4 w-4" />
                Message Creator Agent
              </CardTitle>
              <CardDescription>
                Creates personalized DM messages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ProviderSelector
                provider={creatorProvider}
                customProviders={customProviders}
                onProviderChange={(value: AIProvider) => {
                  onCreatorProviderChange(value);
                  handleInputChange();
                }}
                compact={true}
              />

              <ModelSelector
                provider={creatorProvider}
                customProvider={customCreatorProvider}
                availableModels={availableCreatorModels}
                selectedModel={messageCreatorModel}
                onModelChange={(value) => {
                  onMessageCreatorModelChange(value);
                  handleInputChange();
                }}
                compact={true}
              />
              {creatorProvider === 'ollama' && !ollamaConnected && (
                <p className="text-xs text-red-500">Ollama not running</p>
              )}

              {/* Thinking Mode Toggle */}
              {creatorModelInfo?.supportsThinking && (
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Thinking Mode</Label>
                    <p className="text-xs text-muted-foreground">Enable advanced reasoning</p>
                  </div>
                  <Switch
                    checked={messageCreatorThinking}
                    onCheckedChange={(checked) => {
                      onMessageCreatorThinkingChange(checked);
                      handleInputChange();
                    }}
                  />
                </div>
              )}

              <div>
                <Label className="text-sm font-medium">Custom Instructions & Context</Label>
                <Textarea
                  placeholder="Describe the offer and give specific instructions. You can use {Column Name} tags to inject data."
                  value={messageCreatorInstructions}
                  onChange={(e) => {
                    onMessageCreatorInstructionsChange(e.target.value);
                    handleInputChange();
                  }}
                  rows={5}
                />
              </div>
            </CardContent>
          </Card>

          {/* Lead Roleplay Agent */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserBadgeCheck className="h-4 w-4" />
                Lead Roleplay Agent
              </CardTitle>
              <CardDescription>
                Acts as the lead and evaluates messages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ProviderSelector
                provider={roleplayProvider}
                customProviders={customProviders}
                onProviderChange={(value: AIProvider) => {
                  onRoleplayProviderChange(value);
                  handleInputChange();
                }}
                compact={true}
              />

              <ModelSelector
                provider={roleplayProvider}
                customProvider={customRoleplayProvider}
                availableModels={availableRoleplayModels}
                selectedModel={leadRoleplayModel}
                onModelChange={(value) => {
                  onLeadRoleplayModelChange(value);
                  handleInputChange();
                }}
                compact={true}
              />
              {roleplayProvider === 'ollama' && !ollamaConnected && (
                <p className="text-xs text-red-500">Ollama not running</p>
              )}

              {/* Thinking Mode Toggle */}
              {roleplayModelInfo?.supportsThinking && (
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Thinking Mode</Label>
                    <p className="text-xs text-muted-foreground">Enable advanced reasoning</p>
                  </div>
                  <Switch
                    checked={leadRoleplayThinking}
                    onCheckedChange={(checked) => {
                      onLeadRoleplayThinkingChange(checked);
                      handleInputChange();
                    }}
                  />
                </div>
              )}

              <div>
                <Label className="text-sm font-medium">Lead Profile & Instructions</Label>
                <Textarea
                  placeholder="Describe the lead's persona. Use {Column Name} to provide their specific data."
                  value={leadRoleplayInstructions}
                  onChange={(e) => {
                    onLeadRoleplayInstructionsChange(e.target.value);
                    handleInputChange();
                  }}
                  rows={5}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Settings */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Max Iterations</Label>
                  <p className="text-xs text-muted-foreground">Prevent infinite loops</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">{maxIterations}</span>
                  <div className="w-32">
                    <Slider
                      value={[maxIterations]}
                      onValueChange={(value) => {
                        onMaxIterationsChange(value[0]);
                        handleInputChange();
                      }}
                      max={10}
                      min={1}
                      step={1}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        {(messageCreatorInstructions || leadRoleplayInstructions) && firstRow && (
          <Card className="p-4 bg-muted/50">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Sparks className="h-4 w-4" />
              Instructions Preview (Row 1 Data)
            </h4>
            <div className="space-y-4">
              {messageCreatorInstructions && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Creator Instructions:</p>
                  <span className="font-mono bg-background px-2 py-1.5 rounded text-xs block whitespace-pre-wrap border">
                    {creatorPreview}
                  </span>
                </div>
              )}
              {leadRoleplayInstructions && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Roleplay Instructions:</p>
                  <span className="font-mono bg-background px-2 py-1.5 rounded text-xs block whitespace-pre-wrap border">
                    {roleplayPreview}
                  </span>
                </div>
              )}
            </div>
          </Card>
        )}

      </CardContent>
    </Card>
  );
};
