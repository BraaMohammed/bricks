import { Eye, Settings, Play } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface CellDetailsSheetProps {
  selectedCell: {
    row: number;
    column: string;
    content: string;
  } | null;
  formula: string | null;
  onClose: () => void;
  onEditFormula: (column: string) => void;
  onExecuteCell: (row: number, column: string) => void;
}

/**
 * CellDetailsSheet component for displaying detailed cell information
 * Shows cell content, statistics, formula info, and provides copy/execute actions
 */
export const CellDetailsSheet = ({
  selectedCell,
  formula,
  onClose,
  onEditFormula,
  onExecuteCell,
}: CellDetailsSheetProps) => {
  const handleCopyContent = () => {
    if (selectedCell) {
      navigator.clipboard.writeText(selectedCell.content || '');
      toast({
        title: "Copied",
        description: "Cell content copied to clipboard.",
      });
    }
  };

  const handleEditFormula = () => {
    if (selectedCell) {
      onClose();
      onEditFormula(selectedCell.column);
    }
  };

  const handleRunFormula = () => {
    if (selectedCell) {
      onExecuteCell(selectedCell.row, selectedCell.column);
    }
  };

  const getCellType = (content: string | undefined) => {
    if (!content) return 'Empty';
    if (!isNaN(Number(content))) return 'Number';
    if (content.includes('@')) return 'Email-like';
    if (content.startsWith('http')) return 'URL-like';
    return 'Text';
  };

  return (
    <Sheet open={!!selectedCell} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-scroll">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Cell Details
          </SheetTitle>
          <SheetDescription>
            {selectedCell && `Row ${selectedCell.row + 1}, Column "${selectedCell.column}"`}
          </SheetDescription>
        </SheetHeader>

        {selectedCell && (
          <div className="space-y-6 py-6">
            {/* Cell Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Row</label>
                <p className="text-lg font-mono">{selectedCell.row + 1}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Column</label>
                <p className="text-lg font-mono">{selectedCell.column}</p>
              </div>
            </div>

            {/* Content */}
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Content</label>
              <Card className="p-4">
                <div className="whitespace-pre-wrap break-words font-mono text-sm">
                  {selectedCell.content || <span className="text-muted-foreground italic">Empty</span>}
                </div>
              </Card>
            </div>

            {/* Content Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Length</label>
                <p className="text-lg">{selectedCell.content?.length || 0} characters</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Type</label>
                <p className="text-lg">{getCellType(selectedCell.content)}</p>
              </div>
            </div>

            {/* Formula Info */}
            {formula && (
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Column Formula</label>
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary" className="text-xs">
                      f(x) Formula Active
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleEditFormula}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Edit Formula
                    </Button>
                  </div>
                  <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded block overflow-x-auto">
                    {formula}
                  </code>
                </Card>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCopyContent}
                className="flex-1"
              >
                Copy Content
              </Button>
              {formula && (
                <Button
                  onClick={handleRunFormula}
                  className="flex-1"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Run Formula
                </Button>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
