import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

interface SavedFormula {
  name: string;
  code: string;
}

interface SavedFormulasProps {
  savedFormulas: SavedFormula[];
  currentFormula: string;
  formulaName: string;
  onFormulaNameChange: (name: string) => void;
  onSave: () => void;
  onLoad: (formula: SavedFormula) => void;
  onDelete: (name: string) => void;
  onClear: () => void;
}

export const SavedFormulas = ({
  savedFormulas,
  currentFormula,
  formulaName,
  onFormulaNameChange,
  onSave,
  onLoad,
  onDelete,
  onClear
}: SavedFormulasProps) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold">Saved Formulas</h4>
        <div className="flex gap-2">
          <Button
            variant="outline" 
            size="sm"
            onClick={onClear}
          >
            Clear
          </Button>
        </div>
      </div>
      
      {/* Save current formula */}
      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Enter formula name to save..."
          value={formulaName}
          onChange={(e) => onFormulaNameChange(e.target.value)}
          className="flex-1"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={onSave}
          disabled={!formulaName.trim() || !currentFormula.trim()}
        >
          Save Formula
        </Button>
      </div>

      {/* List of saved formulas */}
      {savedFormulas.length > 0 ? (
        <div className="grid gap-2">
          {savedFormulas.map((savedFormula, index) => (
            <Card key={index} className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-medium text-sm mb-1">{savedFormula.name}</p>
                  <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded block overflow-x-auto">
                    {savedFormula.code.length > 100 
                      ? savedFormula.code.substring(0, 100) + '...' 
                      : savedFormula.code}
                  </code>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onLoad(savedFormula)}
                  >
                    Use
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(savedFormula.name)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          No saved formulas yet. Create a formula and save it for reuse.
        </p>
      )}
    </div>
  );
};
