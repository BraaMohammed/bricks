import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MODES, type FormulaMode } from '@/lib/constants/formulaModes';

interface ModeSelectorProps {
  mode: FormulaMode;
  onModeChange: (mode: FormulaMode) => void;
}

export const ModeSelector = ({ mode, onModeChange }: ModeSelectorProps) => {
  return (
    <Tabs value={mode} onValueChange={onModeChange} className="w-full">
      <TabsList className="grid w-full grid-cols-7">
        {MODES.map((modeConfig) => {
          const Icon = modeConfig.icon;
          return (
            <TabsTrigger key={modeConfig.id} value={modeConfig.id} className="flex items-center gap-2">
              <Icon className="h-4 w-4" />
              {modeConfig.name}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
};
