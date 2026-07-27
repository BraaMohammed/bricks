import { Settings, NavArrowDown, Flash, Table, Sparks } from 'iconoir-react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import type { AIProvider } from '@/lib/constants/aiModels';

interface AdvancedSettingsProps {
  provider: AIProvider;
  temperature: number;
  maxTokens: number;
  topK: number;
  onTemperatureChange: (value: number) => void;
  onMaxTokensChange: (value: number) => void;
  onTopKChange: (value: number) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const AdvancedSettings = ({
  provider,
  temperature,
  maxTokens,
  topK,
  onTemperatureChange,
  onMaxTokensChange,
  onTopKChange,
  open = false,
  onOpenChange
}: AdvancedSettingsProps) => {
  return (
    <div className="space-y-4">
      {/* Temperature Control - Always visible */}
      <div>
        <Label className="text-base font-semibold flex items-center gap-2 mb-3">
          <Flash className="h-4 w-4" />
          Temperature ({temperature})
        </Label>
        <div className="space-y-2">
          <Slider
            value={[temperature]}
            onValueChange={(value) => onTemperatureChange(value[0])}
            max={2}
            min={0}
            step={0.1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0 (Deterministic)</span>
            <span>1 (Balanced)</span>
            <span>2 (Creative)</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Higher values make output more random and creative, lower values make it more focused and deterministic.
          </p>
        </div>
      </div>

      {/* Advanced Settings for Ollama */}
      {provider === 'ollama' && (
        <Collapsible open={open} onOpenChange={onOpenChange}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto">
              <Label className="text-base font-semibold flex items-center gap-2 cursor-pointer">
                <Settings className="h-4 w-4" />
                Advanced Settings
              </Label>
              <NavArrowDown className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-3">
            {/* Max Tokens Control */}
            <div>
              <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                <Table className="h-3 w-3" />
                Max Tokens ({maxTokens})
              </Label>
              <div className="space-y-2">
                <Slider
                  value={[maxTokens]}
                  onValueChange={(value) => onMaxTokensChange(value[0])}
                  max={8192}
                  min={128}
                  step={128}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>128 (Short)</span>
                  <span>2048 (Balanced)</span>
                  <span>8192 (Long)</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Maximum number of tokens to generate. Higher values allow longer responses but may be slower.
                </p>
              </div>
            </div>

            {/* Top-K Control */}
            <div>
              <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                <Sparks className="h-3 w-3" />
                Top-K Sampling ({topK})
              </Label>
              <div className="space-y-2">
                <Slider
                  value={[topK]}
                  onValueChange={(value) => onTopKChange(value[0])}
                  max={100}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1 (Very Focused)</span>
                  <span>40 (Balanced)</span>
                  <span>100 (Diverse)</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Controls vocabulary diversity. Lower values focus on likely words, higher values allow more variety.
                </p>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};
