import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Refresh, Check, WarningTriangle, Server, ArrowRight, Copy } from 'iconoir-react';
import { toast } from '@/hooks/use-toast';

interface WaterfallConfigurationProps {
  connected: boolean;
  checking: boolean;
  backendUrl: string;
  setBackendUrl: (url: string) => void;
  latency: number | null;
  configuredProviders: string[];
  modelsCount: number;
  onRefresh: () => void;
}

export const WaterfallConfiguration: React.FC<WaterfallConfigurationProps> = ({
  connected,
  checking,
  backendUrl,
  setBackendUrl,
  latency,
  configuredProviders,
  modelsCount,
  onRefresh,
}) => {
  const [inputUrl, setInputUrl] = useState(backendUrl);
  const [copied, setCopied] = useState(false);

  const handleSaveUrl = () => {
    setBackendUrl(inputUrl);
    toast({
      title: 'Backend URL Updated',
      description: `Target set to ${inputUrl}. Re-probing connection...`,
    });
    setTimeout(() => {
      onRefresh();
    }, 100);
  };

  const copyCommand = () => {
    navigator.clipboard.writeText('cd api/bricks-api && npm run dev');
    setCopied(true);
    toast({
      title: 'Command Copied',
      description: 'Run "cd api/bricks-api && npm run dev" in your terminal to start the backend.',
    });
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-display uppercase tracking-tight">
            <Server className="h-4 w-4 text-primary" />
            Bricks AI Waterfall Gateway
          </CardTitle>
          <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider">
            <span
              className={`h-2 w-2 rounded-full ${
                connected ? 'bg-primary brick-pulse-dot' : 'bg-destructive'
              }`}
            />
            <span className={connected ? 'text-primary font-semibold' : 'text-destructive font-semibold'}>
              {checking ? 'Probing...' : connected ? `Online (${latency}ms)` : 'Offline'}
            </span>
          </div>
        </div>
        <CardDescription className="text-xs">
          Cascades automatically across free tiers (Ollama → Nvidia NIM → Cloudflare → OpenRouter → Google AI Studio → Groq) with zero client API keys.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        {/* Connection Status Box */}
        {connected ? (
          <div className="rounded-md border border-primary/30 bg-primary/[0.04] p-3 text-xs space-y-2">
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="text-foreground font-semibold flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-primary" />
                Backend Gateway Active
              </span>
              <span className="text-muted-foreground">{modelsCount} Models Loaded</span>
            </div>
            {configuredProviders.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 pt-1 font-mono text-[10px]">
                <span className="text-muted-foreground">Configured Fallbacks:</span>
                {configuredProviders.map((p) => (
                  <span
                    key={p}
                    className="rounded bg-muted/60 px-1.5 py-0.5 text-foreground border border-border"
                  >
                    {p}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3.5 text-xs space-y-3">
            <div className="flex items-start gap-2 text-destructive">
              <WarningTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold font-display uppercase tracking-tight">
                  Backend Dev Server Not Detected
                </p>
                <p className="mt-0.5 text-muted-foreground text-[11px] leading-relaxed font-sans">
                  The backend Next.js service is needed to execute the free multi-provider waterfall cascade. Start it in a terminal to enable zero-key AI enrichment.
                </p>
              </div>
            </div>

            {/* Quick terminal launch snippet */}
            <div className="flex items-center justify-between rounded bg-background border border-border px-2.5 py-1.5 font-mono text-[11px]">
              <span className="text-primary truncate">cd api/bricks-api && npm run dev</span>
              <button
                type="button"
                onClick={copyCommand}
                className="ml-2 flex items-center gap-1 text-[10px] uppercase text-muted-foreground hover:text-foreground transition-colors"
              >
                {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Backend URL input & refresh */}
        <div className="space-y-1.5">
          <Label htmlFor="backend-url" className="font-mono text-xs text-muted-foreground">
            Backend API Base URL
          </Label>
          <div className="flex gap-2">
            <Input
              id="backend-url"
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="http://localhost:3000"
              className="h-9 font-mono text-xs"
            />
            {inputUrl !== backendUrl && (
              <Button size="sm" onClick={handleSaveUrl} className="h-9 font-mono text-xs">
                Save
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={checking}
              className="h-9 font-mono text-xs gap-1.5"
            >
              <Refresh className={`h-3.5 w-3.5 ${checking ? 'animate-spin' : ''}`} />
              <span>Poll Status</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
