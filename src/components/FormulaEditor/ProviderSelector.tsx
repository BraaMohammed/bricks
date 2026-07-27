import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PROVIDERS, type AIProvider, CustomProvider } from '@/lib/constants/aiModels';
import { SelectSeparator } from '@/components/ui/select';
import { Globe } from 'iconoir-react';

interface ProviderSelectorProps {
  provider: AIProvider;
  customProviders?: CustomProvider[];
  ollamaConnected?: boolean;
  ollamaModels?: string[];
  ollamaBaseUrl?: string;
  onProviderChange: (provider: AIProvider) => void;
  onRefreshConnection?: () => void;
  onBaseUrlChange?: (url: string) => void;
  compact?: boolean;
}

export const ProviderSelector = ({
  provider,
  customProviders = [],
  ollamaConnected = false,
  ollamaModels = [],
  ollamaBaseUrl = 'http://localhost:11434',
  onProviderChange,
  onRefreshConnection,
  onBaseUrlChange,
  compact = false
}: ProviderSelectorProps) => {
  const ollamaProvider = PROVIDERS.find(p => p.id === 'ollama');
  const ServerIcon = ollamaProvider?.icon;

  return (
    <div className="space-y-4">
      {/* Provider Selection */}
      <div>
        {!compact && (
          <Label className="text-base font-semibold flex items-center gap-2 mb-3">
            {ServerIcon && <ServerIcon className="h-4 w-4" />}
            AI Provider
          </Label>
        )}
        {compact && (
          <Label className="text-sm font-medium mb-2 block">AI Provider</Label>
        )}
        <Select value={provider} onValueChange={onProviderChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select AI provider" />
          </SelectTrigger>
          <SelectContent>
            {PROVIDERS.map((prov) => {
              const Icon = prov.icon;
              return (
                <SelectItem key={prov.id} value={prov.id}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {prov.name}
                  </div>
                </SelectItem>
              );
            })}
            
            {customProviders.length > 0 && (
              <>
                <SelectSeparator />
                {customProviders.map(cp => (
                  <SelectItem key={cp.id} value={cp.id}>
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      {cp.name}
                    </div>
                  </SelectItem>
                ))}
              </>
            )}
          </SelectContent>
        </Select>
        {!compact && provider === 'ollama' && onRefreshConnection && (
          <div className="mt-2 flex items-center gap-2 text-sm">
            {ollamaConnected ? (
              <div className="flex items-center gap-2 text-green-700">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                Connected ({ollamaModels.length} models)
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-700">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                Ollama not running
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onRefreshConnection}
              className="ml-auto h-6 px-2 text-xs"
            >
              Refresh
            </Button>
          </div>
        )}
      </div>

      {/* Ollama Base URL Configuration */}
      {!compact && provider === 'ollama' && onBaseUrlChange && (
        <div>
          <Label className="text-base font-semibold flex items-center gap-2 mb-3">
            {ServerIcon && <ServerIcon className="h-4 w-4" />}
            Ollama Base URL
          </Label>
          <Input
            type="url"
            placeholder="http://localhost:11434"
            value={ollamaBaseUrl}
            onChange={(e) => onBaseUrlChange(e.target.value)}
            className="mb-2"
          />
          <p className="text-sm text-muted-foreground">
            The base URL where your Ollama server is running. Change this if Ollama is running on a different port or remote server.
          </p>
        </div>
      )}
    </div>
  );
};
