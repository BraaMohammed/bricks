import { useState, useEffect } from 'react';
import { Code, Save, X, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { useDataStore } from '@/stores/useDataStore';
import { toast } from '@/hooks/use-toast';

interface FormulaEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FORMULA_EXAMPLES = [
  {
    name: 'Return static text',
    code: 'return "Hello World";'
  },
  {
    name: 'Access row data',
    code: 'return row.email;'
  },
  {
    name: 'Transform data',
    code: 'return row.name?.toUpperCase() || "";'
  },
  {
    name: 'Make API call',
    code: `const response = await fetch('https://api.example.com/users');
const data = await response.json();
return data.result;`
  },
  {
    name: 'Conditional logic',
    code: `if (row.age && parseInt(row.age) > 18) {
  return "Adult";
} else {
  return "Minor";
}`
  },
];

export const FormulaEditor = ({ open, onOpenChange }: FormulaEditorProps) => {
  const { activeColumn, getFormula, setFormula, headers } = useDataStore();
  const [formula, setFormulaText] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (activeColumn) {
      const existingFormula = getFormula(activeColumn);
      setFormulaText(existingFormula);
      setHasChanges(false);
    }
  }, [activeColumn, getFormula]);

  const handleSave = () => {
    if (activeColumn) {
      setFormula(activeColumn, formula);
      setHasChanges(false);
      toast({
        title: "Formula Saved",
        description: `Formula for "${activeColumn}" has been saved.`,
      });
      onOpenChange(false);
    }
  };

  const handleFormulaChange = (value: string) => {
    setFormulaText(value);
    setHasChanges(value !== getFormula(activeColumn || ''));
  };

  const insertExample = (exampleCode: string) => {
    setFormulaText(exampleCode);
    setHasChanges(true);
  };

  if (!activeColumn) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Edit Formula: {activeColumn}
          </SheetTitle>
          <SheetDescription>
            Write JavaScript code to process each row. The current row data is available as the `row` object.
            Use `return` to specify the value for this column.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Available columns */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Available Columns
            </h4>
            <div className="flex flex-wrap gap-1">
              {headers.map((header) => (
                <Badge 
                  key={header} 
                  variant="outline" 
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => {
                    const insertion = `row.${header}`;
                    const textarea = document.querySelector('.formula-editor') as HTMLTextAreaElement;
                    if (textarea) {
                      const start = textarea.selectionStart;
                      const end = textarea.selectionEnd;
                      const newValue = formula.substring(0, start) + insertion + formula.substring(end);
                      setFormulaText(newValue);
                      setHasChanges(true);
                      
                      // Restore cursor position
                      setTimeout(() => {
                        textarea.focus();
                        textarea.setSelectionRange(start + insertion.length, start + insertion.length);
                      }, 0);
                    }
                  }}
                >
                  {header}
                </Badge>
              ))}
            </div>
          </div>

          {/* Formula editor */}
          <div>
            <h4 className="font-semibold mb-3">JavaScript Formula</h4>
            <Textarea
              value={formula}
              onChange={(e) => handleFormulaChange(e.target.value)}
              placeholder="// Enter your JavaScript code here
// Example:
return row.email?.includes('@gmail.com') ? 'Gmail User' : 'Other';"
              className="formula-editor"
              rows={12}
            />
          </div>

          {/* Examples */}
          <div>
            <h4 className="font-semibold mb-3">Examples</h4>
            <div className="grid gap-2">
              {FORMULA_EXAMPLES.map((example, index) => (
                <Card key={index} className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-sm mb-1">{example.name}</p>
                      <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded block overflow-x-auto">
                        {example.code}
                      </code>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => insertExample(example.code)}
                    >
                      Use
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <SheetFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Formula
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};