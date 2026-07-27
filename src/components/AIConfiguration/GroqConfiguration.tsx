/**
 * GroqConfiguration Component
 * 
 * Groq-specific configuration and testing UI.
 * Displays connection status and allows testing the Groq API.
 */

import { useState } from 'react';
import { Flash, CheckCircle, XmarkCircle, OpenNewWindow, Refresh, Flash as FlashIcon } from 'iconoir-react';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { testGroqConnection } from '@/lib/groq';

interface GroqConfigurationProps {
  hasApiKey: boolean;
  onTestConnection: () => Promise<{ success: boolean; message: string; model?: string; speed?: number }>;
}

export const GroqConfiguration = ({ hasApiKey, onTestConnection }: GroqConfigurationProps) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    model?: string;
    speed?: number;
  } | null>(null);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    
    try {
      const result = await onTestConnection();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <CardContent className="space-y-4">
      <div className="flex items-start gap-3">
        <Flash className="h-5 w-5 text-purple-500 mt-0.5" />
        <div className="flex-1 space-y-2">
          <h3 className="font-medium">Groq Ultra-Fast Inference</h3>
          <p className="text-sm text-muted-foreground">
            Groq's Language Processing Unit (LPU) technology delivers incredibly fast inference speeds,
            often 10x faster than traditional GPU-based solutions. Free tier includes 30-60 requests/minute.
          </p>
          
          {hasApiKey && (
            <Button
              onClick={handleTestConnection}
              disabled={testing}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              {testing ? (
                <>
                  <Refresh className="h-4 w-4 mr-2 animate-spin" />
                  Testing Connection...
                </>
              ) : (
                <>
                  <FlashIcon className="h-4 w-4 mr-2" />
                  Test Connection
                </>
              )}
            </Button>
          )}

          {!hasApiKey && (
            <Alert>
              <AlertDescription className="text-sm">
                Please add your Groq API key above to test the connection.
              </AlertDescription>
            </Alert>
          )}

          {testResult && (
            <Alert variant={testResult.success ? 'default' : 'destructive'}>
              <div className="flex items-start gap-2">
                {testResult.success ? (
                  <CheckCircle className="h-4 w-4 mt-0.5" />
                ) : (
                  <XmarkCircle className="h-4 w-4 mt-0.5" />
                )}
                <div className="flex-1">
                  <AlertDescription className="text-sm">
                    {testResult.message}
                    {testResult.model && (
                      <div className="mt-1 text-xs opacity-80">
                        Model: {testResult.model}
                      </div>
                    )}
                    {testResult.speed && (
                      <div className="mt-1 text-xs opacity-80">
                        Response time: {testResult.speed}ms ⚡
                      </div>
                    )}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          )}

          <div className="flex gap-2 mt-3">
            <a
              href="https://console.groq.com/docs/quickstart"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:underline flex items-center gap-1"
            >
              Quickstart Guide <OpenNewWindow className="h-3 w-3" />
            </a>
            <span className="text-xs text-muted-foreground">•</span>
            <a
              href="https://console.groq.com/docs/models"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:underline flex items-center gap-1"
            >
              Available Models <OpenNewWindow className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </CardContent>
  );
};
