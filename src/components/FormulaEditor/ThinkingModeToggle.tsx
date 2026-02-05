import { Brain } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

interface ThinkingModeToggleProps {
  enabled: boolean;
  modelName: string;
  onToggle: (enabled: boolean) => void;
}

export const ThinkingModeToggle = ({ enabled, modelName, onToggle }: ThinkingModeToggleProps) => {
  return (
    <Card className="p-4 border-orange-200 bg-orange-50/50">
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="h-4 w-4 text-orange-600" />
          <h4 className="font-semibold text-orange-800">Reasoning Model Controls</h4>
          <Badge variant="outline" className="text-orange-700 border-orange-300">
            {modelName}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium text-orange-800">Enable Thinking Mode</Label>
            <p className="text-xs text-orange-600">
              Allow model to show reasoning process (may include &lt;thinking&gt; tags)
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={onToggle}
          />
        </div>

        {!enabled && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-xs text-blue-700">
              💡 <strong>Recommendation:</strong> Keep thinking mode disabled for faster responses. 
              The output will be automatically filtered to remove &lt;thinking&gt; content.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};
