import { Trash, Xmark, FloppyDisk, Upload } from 'iconoir-react';
import { Button } from '@/components/ui/button';
import { SheetFooter } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import type { FormulaMode } from '@/lib/constants/formulaModes';

interface EditorFooterProps {
  activeColumn: string;
  hasChanges: boolean;
  isValid: boolean;
  mode: FormulaMode;
  showRemoveDialog: boolean;
  onRemoveDialogChange: (open: boolean) => void;
  onRemove: () => void;
  onCancel: () => void;
  onSave: () => void;
  onCSVUpload?: () => void;
  showCSVUpload?: boolean;
}

export const EditorFooter = ({
  activeColumn,
  hasChanges,
  isValid,
  mode,
  showRemoveDialog,
  onRemoveDialogChange,
  onRemove,
  onCancel,
  onSave,
  onCSVUpload,
  showCSVUpload = false
}: EditorFooterProps) => {
  const getSaveButtonText = () => {
    switch (mode) {
      case 'ai':
        return 'Save AI Prompt';
      case 'firecrawl':
        return 'Save Firecrawl Template';
      case 'ai-agents':
        return 'Save AI Copy Agents';
      case 'puppeteer':
        return 'Save Puppeteer Code';
      default:
        return 'Save Formula';
    }
  };

  return (
    <SheetFooter>
      <div className="flex items-center justify-between w-full">
        <AlertDialog open={showRemoveDialog} onOpenChange={onRemoveDialogChange}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash className="h-4 w-4 mr-2" />
              Remove Column
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Column</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove the column "{activeColumn}"? This action cannot be undone and will delete all data in this column including any formulas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={onRemove}
                className="bg-red-600 hover:bg-red-700"
              >
                Remove Column
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        <div className="flex gap-2">
          {showCSVUpload && onCSVUpload && (
            <Button
              variant="outline"
              onClick={onCSVUpload}
            >
              <Upload className="h-4 w-4 mr-2" />
              Load CSV
            </Button>
          )}
          <Button
            variant="outline"
            onClick={onCancel}
          >
            <Xmark className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={!hasChanges || !isValid}
          >
            <FloppyDisk className="h-4 w-4 mr-2" />
            {getSaveButtonText()}
          </Button>
        </div>
      </div>
    </SheetFooter>
  );
};
