/**
 * GeminiConfiguration Component
 * 
 * Displays Gemini API connection status and provides a test connection feature.
 * Shows getting started information for new Gemini users.
 */

import { useState } from 'react';
import { Sparks, CheckCircle, XmarkCircle, OpenNewWindow, Refresh } from 'iconoir-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

export interface GeminiConfigurationProps {
  hasApiKey: boolean;
  onTestConnection: () => Promise<{ success: boolean; message: string; model?: string }>;
}

export const GeminiConfiguration = ({
  hasApiKey,
  onTestConnection,
}: GeminiConfigurationProps) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; model?: string } | null>(null);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await onTestConnection();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparks className="h-4 w-4" />
          Google Gemini Configuration
        </CardTitle>
        <CardDescription>
          Test your connection and view Gemini API status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">API Key Status:</span>
            {hasApiKey ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Configured
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <XmarkCircle className="h-3 w-3" />
                Not Set
              </Badge>
            )}
          </div>
          
          <Button
            onClick={handleTestConnection}
            disabled={!hasApiKey || testing}
            size="sm"
            variant="outline"
          >
            {testing ? (
              <>
                <Refresh className="h-4 w-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              'Test Connection'
            )}
          </Button>
        </div>

        {/* Test Result */}
        {testResult && (
          <Alert variant={testResult.success ? 'default' : 'destructive'}>
            <AlertDescription className="flex items-center gap-2">
              {testResult.success ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <div>
                    <span className="font-medium">{testResult.message}</span>
                    {testResult.model && (
                      <span className="text-xs ml-2 opacity-80">
                        (tested with {testResult.model})
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <XmarkCircle className="h-4 w-4" />
                  <span>{testResult.message}</span>
                </>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Getting Started Guide */}
        {!hasApiKey && (
          <div className="space-y-3 pt-2 border-t">
            <h4 className="text-sm font-medium">Getting Started with Gemini</h4>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>
                Visit{' '}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  Google AI Studio
                  <OpenNewWindow className="h-3 w-3" />
                </a>
                {' '}to get your API key
              </li>
              <li>Create a new API key (free tier available)</li>
              <li>Copy the key and paste it in the "API Keys" section above</li>
              <li>Click "Test Connection" to verify</li>
            </ol>
          </div>
        )}

        {/* Model Recommendations */}
        {hasApiKey && (
          <div className="space-y-3 pt-2 border-t">
            <h4 className="text-sm font-medium">Recommended Models</h4>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5">Best Value</Badge>
                <div>
                  <div className="font-medium">Gemini 2.5 Flash Lite</div>
                  <div className="text-xs text-muted-foreground">
                    $0.10/M tokens - Perfect for high-volume tasks
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5">Latest</Badge>
                <div>
                  <div className="font-medium">Gemini 3 Pro</div>
                  <div className="text-xs text-muted-foreground">
                    Most capable - 50%+ better than 2.5 Pro
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5">Balanced</Badge>
                <div>
                  <div className="font-medium">Gemini 2.5 Flash</div>
                  <div className="text-xs text-muted-foreground">
                    $0.40/M tokens - Fast and efficient
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Free Tier Info */}
        <Alert>
          <Sparks className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Free Tier:</strong> Get 20-100 requests/day for testing. 
            Large context windows (1M-2M tokens) available on all models.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
