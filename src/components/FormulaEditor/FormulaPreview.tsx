import { Label } from '@/components/ui/label';
import type { FormulaMode } from '@/lib/constants/formulaModes';

interface FormulaPreviewProps {
  mode: FormulaMode;
  content: string;
  firstRow: Record<string, string> | null;
  additionalInfo?: string;
}

export const FormulaPreview = ({ 
  mode, 
  content, 
  firstRow, 
  additionalInfo 
}: FormulaPreviewProps) => {
  if (!content || !firstRow) {
    return null;
  }

  // Process column references in content
  const processedContent = content.replace(/\{([^}]+)\}/g, (match, columnName) => {
    const value = firstRow[columnName.trim()];
    return value || `[${columnName.trim()} not found]`;
  });

  return (
    <div>
      <Label className="text-sm font-medium">Preview with actual data:</Label>
      <div className="mt-1 p-2 bg-muted rounded border text-sm font-mono break-all">
        {processedContent}
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        {additionalInfo || 'This shows how the content will look for the first row in your data'}
      </p>
    </div>
  );
};
