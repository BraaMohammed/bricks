import { useState } from 'react';
import { Globe, Plus, Trash, Link } from 'iconoir-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CustomProvider } from '@/lib/constants/aiModels';

export interface CustomProviderSectionProps {
  customProviders: CustomProvider[];
  addCustomProvider: (provider: CustomProvider) => void;
  removeCustomProvider: (id: string) => void;
}

export const CustomProviderSection = ({
  customProviders,
  addCustomProvider,
  removeCustomProvider,
}: CustomProviderSectionProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');

  const handleSave = () => {
    if (!name.trim() || !baseUrl.trim()) return;

    // Generate a simple ID from the name
    const id = `custom:${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

    // Ensure baseUrl doesn't have trailing slash
    const cleanUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    addCustomProvider({
      id,
      name: name.trim(),
      baseUrl: cleanUrl,
      apiKey: apiKey.trim(),
    });

    // Reset form
    setName('');
    setBaseUrl('');
    setApiKey('');
    setIsAdding(false);
  };

  const handleCancel = () => {
    setName('');
    setBaseUrl('');
    setApiKey('');
    setIsAdding(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Globe className="h-4 w-4" />
          Custom Providers
        </CardTitle>
        <CardDescription>
          Add any OpenAI-compatible API (e.g., OpenRouter, Together AI, Perplexity).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* List of existing custom providers */}
        {customProviders.length > 0 && (
          <div className="space-y-2 mb-4">
            {customProviders.map((provider) => (
              <div key={provider.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-md border border-border/50">
                <div className="flex flex-col">
                  <span className="font-medium text-sm flex items-center gap-2">
                    {provider.name}
                    {provider.apiKey && <div className="w-1.5 h-1.5 bg-green-500 rounded-full" title="API Key provided" />}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Link className="h-3 w-3" />
                    {provider.baseUrl}
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => removeCustomProvider(provider.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2"
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add new provider form */}
        {isAdding ? (
          <div className="space-y-4 p-4 border rounded-md bg-card">
            <div className="space-y-2">
              <Label htmlFor="provider-name">Provider Name <span className="text-destructive">*</span></Label>
              <Input
                id="provider-name"
                placeholder="e.g. OpenRouter"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider-url">Base URL <span className="text-destructive">*</span></Label>
              <Input
                id="provider-url"
                placeholder="e.g. https://openrouter.ai/api/v1"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">The URL endpoint without /chat/completions</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider-key">API Key (Optional for local)</Label>
              <Input
                id="provider-key"
                type="password"
                placeholder="Enter API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={handleCancel}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={!name.trim() || !baseUrl.trim()}>Save Provider</Button>
            </div>
          </div>
        ) : (
          <Button 
            variant="outline" 
            className="w-full border-dashed" 
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Custom Provider
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
