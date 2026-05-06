import { useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FormulaValidator } from '@/components/FormulaValidator';
import { SavedFormulas } from '@/components/FormulaEditor/SavedFormulas';
import { ColumnBadges } from '@/components/FormulaEditor/ColumnBadges';
import { CodeDocsDialog } from './CodeDocsDialog';
import { useState } from 'react';

interface SavedFormula {
  name: string;
  code: string;
}

interface CodeModeEditorProps {
  formula: string;
  headers: string[];
  savedFormulas: SavedFormula[];
  formulaName: string;
  onFormulaChange: (value: string) => void;
  onFormulaNameChange: (name: string) => void;
  onSaveFormula: () => void;
  onLoadFormula: (formula: SavedFormula) => void;
  onDeleteFormula: (name: string) => void;
  onClearFormula: () => void;
  onSlashMenuTrigger?: (position: { top: number, left: number }) => void;
}

export const CodeModeEditor = ({
  formula,
  headers,
  savedFormulas,
  formulaName,
  onFormulaChange,
  onFormulaNameChange,
  onSaveFormula,
  onLoadFormula,
  onDeleteFormula,
  onClearFormula,
  onSlashMenuTrigger
}: CodeModeEditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [docsDialogOpen, setDocsDialogOpen] = useState(false);

  const handleColumnClick = (columnName: string) => {
    const insertion = `row['${columnName}']`;
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = formula.substring(0, start) + insertion + formula.substring(end);
      onFormulaChange(newValue);

      // Restore cursor position
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + insertion.length, start + insertion.length);
      }, 0);
    }
  };

  return (
    <div className="space-y-6">
      {/* Available columns */}
      <ColumnBadges
        headers={headers}
        onColumnClick={handleColumnClick}
        helpText="Click on a column to insert it into your formula:"
      />

      {/* Formula editor */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold">JavaScript Formula</h4>
          <div className="flex items-center gap-2">
            <CodeDocsDialog open={docsDialogOpen} onOpenChange={setDocsDialogOpen} />
          </div>
        </div>
        <Textarea
          ref={textareaRef}
          value={formula}
          onChange={(e) => onFormulaChange(e.target.value)}
          placeholder="// Enter your JavaScript code here
// Type '/' to access AI templates
// Example:
return row['email']?.includes('@gmail.com') ? 'Gmail User' : 'Other';"
          className="formula-editor"
          rows={12}
        />
      </div>

      {/* Formula validation */}
      <FormulaValidator formula={formula} availableColumns={headers} />

      {/* Saved Formulas */}
      <SavedFormulas
        savedFormulas={savedFormulas}
        currentFormula={formula}
        formulaName={formulaName}
        onFormulaNameChange={onFormulaNameChange}
        onSave={onSaveFormula}
        onLoad={onLoadFormula}
        onDelete={onDeleteFormula}
        onClear={onClearFormula}
      />
    </div>
  );
};
