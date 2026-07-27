/**
 * ProviderSelector Component
 * 
 * Allows selection between OpenAI (cloud) and Ollama (local) AI providers.
 * Displays appropriate icons and descriptions for each provider.
 */

import { Key, Server, Sparks, Flash, Globe } from 'iconoir-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SelectSeparator } from '@/components/ui/select';
import { AIProvider, CustomProvider } from '@/lib/constants/aiModels';

export interface ProviderSelectorProps {
  provider: AIProvider;
  customProviders?: CustomProvider[];
  onProviderChange: (provider: AIProvider) => void;
}

export const ProviderSelector = ({
  provider,
  customProviders = [],
  onProviderChange,
}: ProviderSelectorProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Server className="h-4 w-4" />
          AI Provider
        </CardTitle>
        <CardDescription>
          Choose between built-in cloud models, local Ollama, or your custom providers.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label htmlFor="provider-select">Provider</Label>
          <Select 
            value={provider} 
            onValueChange={(value: AIProvider) => onProviderChange(value)}
          >
            <SelectTrigger id="provider-select">
              <SelectValue placeholder="Select AI provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openai">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  OpenAI (Cloud)
                </div>
              </SelectItem>
              <SelectItem value="gemini">
                <div className="flex items-center gap-2">
                  <Sparks className="h-4 w-4" />
                  Google Gemini (Cloud)
                </div>
              </SelectItem>
              <SelectItem value="groq">
                <div className="flex items-center gap-2">
                  <Flash className="h-4 w-4" />
                  Groq (Cloud - Ultra Fast)
                </div>
              </SelectItem>
              <SelectItem value="ollama">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  Ollama (Local)
                </div>
              </SelectItem>
              
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
        </div>
      </CardContent>
    </Card>
  );
};
