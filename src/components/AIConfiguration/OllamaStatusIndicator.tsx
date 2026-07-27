/**
 * OllamaStatusIndicator Component
 * 
 * Displays the current Ollama connection status with appropriate icons.
 * Shows loading, connected, or disconnected states with model count.
 */

import { Wifi, WifiOff } from 'iconoir-react';

export interface OllamaStatusIndicatorProps {
  connected: boolean;
  checking: boolean;
  modelCount: number;
}

export const OllamaStatusIndicator = ({
  connected,
  checking,
  modelCount,
}: OllamaStatusIndicatorProps) => {
  return (
    <div className="flex items-center gap-2 p-3 bg-muted rounded">
      {checking ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Checking connection...</span>
        </div>
      ) : connected ? (
        <div className="flex items-center gap-2">
          <Wifi className="h-4 w-4 text-green-500" />
          <span className="text-sm text-green-700">Connected to Ollama</span>
          <span className="text-xs text-muted-foreground">({modelCount} models)</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <WifiOff className="h-4 w-4 text-red-500" />
          <span className="text-sm text-red-700">Ollama not running</span>
        </div>
      )}
    </div>
  );
};
