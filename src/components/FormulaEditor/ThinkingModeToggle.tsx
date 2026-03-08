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
    <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-card">
      <div className="space-y-0.5">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Brain className="h-4 w-4 text-muted-foreground" />
          Thinking Mode
          <Badge variant="secondary" className="font-normal text-[10px] px-1.5 py-0 h-4">
            {modelName}
          </Badge>
        </Label>
        <p className="text-xs text-muted-foreground">
          Allow the model to use reasoning loops before answering (can take longer).
        </p>
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={onToggle}
      />
    </div>
  );
};
