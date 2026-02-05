import { Users, PenTool, UserCheck, Info, Sparkles, Server, Key, Brain } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { ColumnBadges } from '@/components/FormulaEditor/ColumnBadges';
import type { ModelDefinition } from '@/lib/constants/aiModels';
import { isOllamaModel } from '@/lib/providers/aiProviders';

interface AIAgentsModeEditorProps {
  headers: string[];
  firstRow: Record<string, string> | null;
  // User offer
  userOfferDetails: string;
  onUserOfferDetailsChange: (value: string) => void;
  // Available models (combined from all providers)
  allAvailableModels: ModelDefinition[];
  // Message Creator Agent
  messageCreatorModel: string;
  onMessageCreatorModelChange: (model: string) => void;
  messageCreatorThinking: boolean;
  onMessageCreatorThinkingChange: (enabled: boolean) => void;
  messageCreatorInstructions: string;
  onMessageCreatorInstructionsChange: (value: string) => void;
  // Lead Roleplay Agent
  leadRoleplayModel: string;
  onLeadRoleplayModelChange: (model: string) => void;
  leadRoleplayThinking: boolean;
  onLeadRoleplayThinkingChange: (enabled: boolean) => void;
  leadRoleplayInstructions: string;
  onLeadRoleplayInstructionsChange: (value: string) => void;
  // Settings
  maxIterations: number;
  onMaxIterationsChange: (value: number) => void;
  // Connection status
  ollamaConnected: boolean;
  // Change handler
  onInputChange: () => void;
}



export const AIAgentsModeEditor = ({
  headers,
  firstRow,
  userOfferDetails,
  onUserOfferDetailsChange,
  allAvailableModels,
  messageCreatorModel,
  onMessageCreatorModelChange,
  messageCreatorThinking,
  onMessageCreatorThinkingChange,
  messageCreatorInstructions,
  onMessageCreatorInstructionsChange,
  leadRoleplayModel,
  onLeadRoleplayModelChange,
  leadRoleplayThinking,
  onLeadRoleplayThinkingChange,
  leadRoleplayInstructions,
  onLeadRoleplayInstructionsChange,
  maxIterations,
  onMaxIterationsChange,
  ollamaConnected,
  onInputChange
}: AIAgentsModeEditorProps) => {
  const handleColumnClick = (columnName: string) => {
    const insertion = `{${columnName}}`;
    onUserOfferDetailsChange(userOfferDetails + (userOfferDetails ? ' ' : '') + insertion);
    onInputChange();
  };

  const messageCreatorModelInfo = allAvailableModels.find(m => m.id === messageCreatorModel);
  const leadRoleplayModelInfo = allAvailableModels.find(m => m.id === leadRoleplayModel);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
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
          helpText="Click on a column to add it to your instructions. The AI agents will have access to all this data:"
        />

        {/* User Offer Details */}
        <div>
          <Label className="text-base font-semibold mb-3 block">
            Your Offer Details
          </Label>
          <Textarea 
            placeholder="Describe your product/service/offer that will be mentioned in messages..."
            value={userOfferDetails}
            onChange={(e) => {
              onUserOfferDetailsChange(e.target.value);
              onInputChange();
            }}
            rows={3}
          />
          <p className="text-xs text-muted-foreground mt-1">
            💡 Tip: Use {`{Column Name}`} to reference lead data in your offer description
          </p>
        </div>

        {/* Agent Configuration Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Message Creator Agent */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <PenTool className="h-4 w-4" />
                Message Creator Agent
              </CardTitle>
              <CardDescription>
                Creates personalized DM messages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Model</Label>
                <Select 
                  value={messageCreatorModel} 
                  onValueChange={(value) => {
                    onMessageCreatorModelChange(value);
                    onInputChange();
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allAvailableModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex items-center gap-2">
                          {model.name}
                          {model.supportsThinking && <Brain className="h-3 w-3" />}
                          {isOllamaModel(model.id) && <Server className="h-3 w-3 text-green-600" />}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {isOllamaModel(messageCreatorModel) ? (
                    <span className="flex items-center gap-1">
                      <Server className="h-3 w-3 text-green-600" />
                      Ollama (Local) - {messageCreatorModelInfo?.cost}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Key className="h-3 w-3 text-blue-600" />
                      {messageCreatorModelInfo?.name.includes('Gemini') ? 'Gemini' : 'OpenAI'} (Cloud) - {messageCreatorModelInfo?.cost}
                    </span>
                  )}
                </p>
              </div>

              {/* Thinking Mode Toggle */}
              {messageCreatorModelInfo?.supportsThinking && (
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Thinking Mode</Label>
                    <p className="text-xs text-muted-foreground">Enable advanced reasoning</p>
                  </div>
                  <Switch
                    checked={messageCreatorThinking}
                    onCheckedChange={(checked) => {
                      onMessageCreatorThinkingChange(checked);
                      onInputChange();
                    }}
                  />
                </div>
              )}

              <div>
                <Label className="text-sm font-medium">Custom Instructions (Optional)</Label>
                <Textarea
                  placeholder="Additional instructions for the message creator..."
                  value={messageCreatorInstructions}
                  onChange={(e) => {
                    onMessageCreatorInstructionsChange(e.target.value);
                    onInputChange();
                  }}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Lead Roleplay Agent */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserCheck className="h-4 w-4" />
                Lead Roleplay Agent
              </CardTitle>
              <CardDescription>
                Acts as the lead and evaluates messages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Model</Label>
                <Select 
                  value={leadRoleplayModel} 
                  onValueChange={(value) => {
                    onLeadRoleplayModelChange(value);
                    onInputChange();
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allAvailableModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex items-center gap-2">
                          {model.name}
                          {model.supportsThinking && <Brain className="h-3 w-3" />}
                          {isOllamaModel(model.id) && <Server className="h-3 w-3 text-green-600" />}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {isOllamaModel(leadRoleplayModel) ? (
                    <span className="flex items-center gap-1">
                      <Server className="h-3 w-3 text-green-600" />
                      Ollama (Local) - {leadRoleplayModelInfo?.cost}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Key className="h-3 w-3 text-blue-600" />
                      {leadRoleplayModelInfo?.name.includes('Gemini') ? 'Gemini' : 'OpenAI'} (Cloud) - {leadRoleplayModelInfo?.cost}
                    </span>
                  )}
                </p>
              </div>

              {/* Thinking Mode Toggle */}
              {leadRoleplayModelInfo?.supportsThinking && (
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Thinking Mode</Label>
                    <p className="text-xs text-muted-foreground">Enable advanced reasoning</p>
                  </div>
                  <Switch
                    checked={leadRoleplayThinking}
                    onCheckedChange={(checked) => {
                      onLeadRoleplayThinkingChange(checked);
                      onInputChange();
                    }}
                  />
                </div>
              )}

              <div>
                <Label className="text-sm font-medium">Custom Instructions (Optional)</Label>
                <Textarea
                  placeholder="Additional instructions for the lead roleplay..."
                  value={leadRoleplayInstructions}
                  onChange={(e) => {
                    onLeadRoleplayInstructionsChange(e.target.value);
                    onInputChange();
                  }}
                  rows={3}
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
                        onInputChange();
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
        {userOfferDetails && firstRow && (
          <Card className="p-4 bg-muted/50">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Preview with First Row Data
            </h4>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Lead Profile:</p>
                <code className="text-xs bg-background px-2 py-1 rounded block overflow-x-auto">
                  {JSON.stringify(firstRow, null, 2)}
                </code>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Your Offer (processed):</p>
                <span className="font-mono bg-background px-2 py-1 rounded text-sm block">
                  {userOfferDetails.replace(/\{([^}]+)\}/g, (match, columnName) => {
                    const value = firstRow[columnName.trim()];
                    return value || `[${columnName.trim()} not found]`;
                  })}
                </span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Provider Configuration:</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono">Creator:</span>
                    {isOllamaModel(messageCreatorModel) ? (
                      <Badge variant="outline" className="text-green-700">
                        <Server className="h-3 w-3 mr-1" />
                        Ollama Local
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-blue-700">
                        <Key className="h-3 w-3 mr-1" />
                        {messageCreatorModelInfo?.name.includes('Gemini') ? 'Gemini' : 'OpenAI'} Cloud
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono">Roleplay:</span>
                    {isOllamaModel(leadRoleplayModel) ? (
                      <Badge variant="outline" className="text-green-700">
                        <Server className="h-3 w-3 mr-1" />
                        Ollama Local
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-blue-700">
                        <Key className="h-3 w-3 mr-1" />
                        {leadRoleplayModelInfo?.name.includes('Gemini') ? 'Gemini' : 'OpenAI'} Cloud
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">API Key Status:</p>
                <div className="space-y-1">
                  <Badge variant={localStorage.getItem('openai_api_key') ? "default" : "destructive"}>
                    {localStorage.getItem('openai_api_key') ? "✅ OpenAI API Key Found" : "❌ No OpenAI API Key"}
                  </Badge>
                  <Badge variant={ollamaConnected ? "default" : "destructive"}>
                    {ollamaConnected ? "✅ Ollama Connected" : "❌ Ollama Disconnected"}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              The AI agents will use this data to create and evaluate personalized messages.
            </div>
          </Card>
        )}

      </CardContent>
    </Card>
  );
};
