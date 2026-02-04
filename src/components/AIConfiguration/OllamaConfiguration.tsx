/**
 * OllamaConfiguration Component
 * 
 * Complete Ollama configuration section including:
 * - Base URL input
 * - Connection status indicator
 * - Refresh button
 * - Setup instructions (when disconnected)
 * - Model suggestions (when connected but no models)
 */

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OllamaStatusIndicator } from './OllamaStatusIndicator';
import { ModelSuggestionCard, SuggestedModel } from './ModelSuggestionCard';
import { SUGGESTED_MODELS } from '@/lib/ollama';

export interface OllamaConfigurationProps {
  baseUrl: string;
  setBaseUrl: (url: string) => void;
  connected: boolean;
  checking: boolean;
  models: string[];
  onRefresh: () => void;
}

export const OllamaConfiguration = ({
  baseUrl,
  setBaseUrl,
  connected,
  checking,
  models,
  onRefresh,
}: OllamaConfigurationProps) => {
  // Get first 3 suggested models
  const suggestedModels: SuggestedModel[] = SUGGESTED_MODELS.slice(0, 3);

  return (
    <div className="space-y-4">
      {/* Base URL Input */}
      <div className="space-y-2">
        <Label htmlFor="ollama-url">Ollama Base URL</Label>
        <Input
          id="ollama-url"
          type="url"
          placeholder="http://localhost:11434"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
        />
        <p className="text-sm text-muted-foreground">
          The base URL where your Ollama server is running. Default is http://localhost:11434
        </p>
      </div>

      {/* Status and Refresh */}
      <div className="flex items-center justify-between">
        <Label>Ollama Status</Label>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={checking}
        >
          {checking ? 'Checking...' : 'Refresh'}
        </Button>
      </div>

      {/* Status Indicator */}
      <OllamaStatusIndicator
        connected={connected}
        checking={checking}
        modelCount={models.length}
      />

      {/* Setup Instructions - shown when not connected */}
      {!connected && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Make sure Ollama is running on{' '}
            <code className="bg-muted px-1 rounded">localhost:11434</code>.
            {' '}Download from{' '}
            <a 
              href="https://ollama.ai" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              ollama.ai
            </a>
          </p>
          <div className="p-2 bg-orange-50 border border-orange-200 rounded text-sm">
            💡 <strong>Quick Start:</strong>
            <ol className="list-decimal list-inside mt-1 space-y-1 text-xs">
              <li>Download and install Ollama</li>
              <li>Open terminal and run: <code className="bg-orange-100 px-1 rounded">ollama serve</code></li>
              <li>Install a model: <code className="bg-orange-100 px-1 rounded">ollama pull llama2</code></li>
              <li>Refresh this page to see available models</li>
            </ol>
          </div>
        </div>
      )}

      {/* Model Suggestions - shown when connected but no models */}
      {connected && models.length === 0 && (
        <ModelSuggestionCard models={suggestedModels} />
      )}
    </div>
  );
};
