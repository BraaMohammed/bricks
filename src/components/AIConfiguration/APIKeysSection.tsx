/**
 * APIKeysSection Component
 * 
 * Displays and manages API key inputs for OpenAI and Firecrawl.
 * Provides input fields with clear buttons and help links.
 */

import { Key, Sparkles, Zap, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export interface APIKeysSectionProps {
  openaiKey: string;
  setOpenaiKey: (key: string) => void;
  clearOpenaiKey: () => void;
  hasOpenaiKey: boolean;

  geminiKey: string;
  setGeminiKey: (key: string) => void;
  clearGeminiKey: () => void;
  hasGeminiKey: boolean;

  groqKey: string;
  setGroqKey: (key: string) => void;
  clearGroqKey: () => void;
  hasGroqKey: boolean;

  firecrawlKey: string;
  setFirecrawlKey: (key: string) => void;
  clearFirecrawlKey: () => void;
  hasFirecrawlKey: boolean;
}

export const APIKeysSection = ({
  openaiKey,
  setOpenaiKey,
  clearOpenaiKey,
  hasOpenaiKey,
  geminiKey,
  setGeminiKey,
  clearGeminiKey,
  hasGeminiKey,
  groqKey,
  setGroqKey,
  clearGroqKey,
  hasGroqKey,
  firecrawlKey,
  setFirecrawlKey,
  clearFirecrawlKey,
  hasFirecrawlKey,
}: APIKeysSectionProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Key className="h-4 w-4" />
          API Keys
        </CardTitle>
        <CardDescription>
          Your API keys are stored locally and never sent to our servers.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* OpenAI API Key */}
        <div className="space-y-2">
          <Label htmlFor="api-key">OpenAI API Key</Label>
          <div className="flex gap-2">
            <Input
              id="api-key"
              type="password"
              placeholder={hasOpenaiKey ? "API key is saved" : "Enter your OpenAI API key"}
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
            />
            {hasOpenaiKey && (
              <Button variant="outline" onClick={clearOpenaiKey}>
                Clear
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Get your API key from{' '}
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              OpenAI Platform
            </a>
          </p>
        </div>

        {/* Google Gemini API Key */}
        <div className="space-y-2">
          <Label htmlFor="gemini-key" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Google Gemini API Key
          </Label>
          <div className="flex gap-2">
            <Input
              id="gemini-key"
              type="password"
              placeholder={hasGeminiKey ? "API key is saved" : "Enter your Gemini API key"}
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
            />
            {hasGeminiKey && (
              <Button variant="outline" onClick={clearGeminiKey}>
                Clear
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Get your API key from{' '}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Google AI Studio
            </a>
            {' '}(Free tier available)
          </p>
        </div>

        {/* Groq API Key */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="groq-key" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Groq API Key
              {hasGroqKey && <div className="w-2 h-2 bg-green-500 rounded-full" />}
            </Label>
            <a
              href="https://console.groq.com/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:underline flex items-center gap-1"
            >
              Get API Key <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="flex gap-2">
            <Input
              id="groq-key"
              type="password"
              placeholder={hasGroqKey ? "API key is saved" : "Enter your Groq API key"}
              value={groqKey}
              onChange={(e) => setGroqKey(e.target.value)}
            />
            {hasGroqKey && (
              <Button variant="outline" onClick={clearGroqKey}>
                Clear
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Ultra-fast inference with LPU technology. Free tier: 30-60 req/min
          </p>
        </div>

        {/* Firecrawl API Key */}
        <div className="space-y-2">
          <Label htmlFor="firecrawl-key">Firecrawl API Key</Label>
          <div className="flex gap-2">
            <Input
              id="firecrawl-key"
              type="password"
              placeholder={hasFirecrawlKey ? "API key is saved" : "Enter your Firecrawl API key"}
              value={firecrawlKey}
              onChange={(e) => setFirecrawlKey(e.target.value)}
            />
            {hasFirecrawlKey && (
              <Button variant="outline" onClick={clearFirecrawlKey}>
                Clear
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Get your API key from{' '}
            <a
              href="https://app.firecrawl.dev/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Firecrawl
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
