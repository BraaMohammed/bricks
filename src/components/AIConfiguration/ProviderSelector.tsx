/**
 * ProviderSelector Component
 * 
 * Allows selection between OpenAI (cloud) and Ollama (local) AI providers.
 * Displays appropriate icons and descriptions for each provider.
 */

import { Key, Server } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AIProvider } from '@/lib/constants/aiModels';

export interface ProviderSelectorProps {
  provider: AIProvider;
  onProviderChange: (provider: AIProvider) => void;
}

export const ProviderSelector = ({
  provider,
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
          Choose between OpenAI's cloud models or local Ollama models.
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
              <SelectItem value="ollama">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  Ollama (Local)
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};
