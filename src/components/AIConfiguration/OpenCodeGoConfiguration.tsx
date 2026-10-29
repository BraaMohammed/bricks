import { useState } from 'react';
import {
  Code,
  Refresh,
  Flash,
  OpenNewWindow,
  WarningTriangle,
  CheckCircle,
} from 'iconoir-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useOpenCodeGoModels } from '@/hooks/useOpenCodeGoModels';
import { getOpenCodeGoBaseUrl, testOpenCodeGoConnection } from '@/lib/providers/opencodeGo';
import { toast } from '@/hooks/use-toast';

export const OpenCodeGoConfiguration = () => {
  const { models, configured, loading, error, refresh } = useOpenCodeGoModels();
  const [testing, setTesting] = useState(false);
  const baseUrl = getOpenCodeGoBaseUrl();
  const checking = loading && configured === null;

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const result = await testOpenCodeGoConnection();
      toast({
        title: result.success ? 'OpenCode Go connected' : 'OpenCode Go connection failed',
        description: `${result.message} (${result.latency}ms)`,
        variant: result.success ? 'default' : 'destructive',
      });
    } catch (error) {
      toast({
        title: 'OpenCode Go connection failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base font-display uppercase tracking-tight">
            <Code className="h-4 w-4 text-primary" />
            OpenCode Go
          </CardTitle>
          <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider">
            <span
              className={`h-2 w-2 rounded-full ${
                checking
                  ? 'bg-muted-foreground'
                  : configured
                  ? 'bg-emerald-500 brick-pulse-dot'
                  : 'bg-amber-500'
              }`}
            />
            <span
              className={
                checking
                  ? 'text-muted-foreground'
                  : configured
                  ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                  : 'font-semibold text-amber-600 dark:text-amber-400'
              }
            >
              {checking ? 'Checking...' : configured ? 'Configured' : 'Not configured'}
            </span>
          </div>
        </div>
        <CardDescription className="text-xs">
          Paid cloud models served through the Bricks backend proxy. Models are fetched live; the API key stays on the backend.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        <div className="space-y-1.5 rounded-md border border-border bg-muted/30 p-3 font-mono text-[11px]">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Backend proxy</span>
            <span className="truncate text-foreground" title={baseUrl}>
              {baseUrl}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Models</span>
            <span className="text-foreground">{models.length}</span>
          </div>
        </div>

        {!checking && configured === false && (
          <div className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-3.5 text-xs">
            <div className="flex items-start gap-2 text-amber-600 dark:text-amber-400">
              <WarningTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold font-display uppercase tracking-tight">
                  Backend key not configured
                </p>
                <p className="mt-0.5 text-muted-foreground text-[11px] leading-relaxed font-sans">
                  Set <code className="font-mono text-foreground">OPENCODE_GO_API_KEY</code> in{' '}
                  <code className="font-mono text-foreground">api/bricks-api/.env.local</code> and restart the backend.
                </p>
              </div>
            </div>
            <div className="truncate rounded bg-background border border-border px-2.5 py-1.5 font-mono text-[11px] text-primary">
              OPENCODE_GO_API_KEY=your_key_here
            </div>
          </div>
        )}

        {!checking && configured === true && (
          <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="h-3.5 w-3.5" />
            Backend key detected. OpenCode Go is ready.
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 text-xs text-destructive">
            <WarningTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestConnection}
            disabled={!configured || testing || checking}
            className="h-9 gap-1.5 font-mono text-xs"
          >
            {testing ? (
              <Refresh className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Flash className="h-3.5 w-3.5" />
            )}
            {testing ? 'Testing...' : 'Test connection'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refresh()}
            disabled={loading}
            className="h-9 gap-1.5 font-mono text-xs"
          >
            <Refresh className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <a
            href="https://opencode.ai/docs/go/"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 text-xs text-blue-500 hover:underline"
          >
            Docs <OpenNewWindow className="h-3 w-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
};
