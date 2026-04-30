import { useState } from 'react';
import { Settings, Play, ChevronUp, ChevronDown, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ExecutionOptionsDialog } from './ExecutionOptionsDialog';
import type { ExecutionOptions } from '@/hooks/useFormulaExecution';

interface TableHeaderProps {
  header: string;
  hasFormula: boolean;
  isExecuting: boolean;
  isSorted: boolean;
  sortDirection: 'asc' | 'desc';
  columnToRemove: string | null;
  totalRows: number;
  /** All column headers — passed to the execution dialog for column-filter mode */
  headers: string[];
  onSort: (column: string) => void;
  onEditFormula: (column: string) => void;
  onExecuteFormula: (column: string, options?: ExecutionOptions) => void;
  onRemoveColumn: (column: string) => void;
  onSetColumnToRemove: (column: string | null) => void;
}

/**
 * TableHeader component for individual column headers
 * Includes sorting, formula badge, and action buttons (Settings, Execute, Remove)
 * Clicking ▶ opens the ExecutionOptionsDialog before running.
 */
export const TableHeader = ({
  header,
  hasFormula,
  isExecuting,
  isSorted,
  sortDirection,
  columnToRemove,
  totalRows,
  headers,
  onSort,
  onEditFormula,
  onExecuteFormula,
  onRemoveColumn,
  onSetColumnToRemove,
}: TableHeaderProps) => {
  const [showExecutionDialog, setShowExecutionDialog] = useState(false);

  const handleConfirm = (options: ExecutionOptions) => {
    onExecuteFormula(header, options);
  };

  return (
    <th className="table-header relative group">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => onSort(header)}
          className="flex items-center gap-1 text-left hover:text-foreground transition-colors"
        >
          <span className="truncate max-w-[120px]">{header}</span>
          {isSorted && (
            sortDirection === 'asc' ?
              <ChevronUp className="h-3 w-3" /> :
              <ChevronDown className="h-3 w-3" />
          )}
        </button>

        <div className="flex items-center gap-1">
          {hasFormula && (
            <Badge variant="secondary" className="text-xs py-0 px-1">
              f(x)
            </Badge>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEditFormula(header)}
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Settings className="h-3 w-3" />
          </Button>

          {/* ▶ Execute button — opens options dialog */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowExecutionDialog(true)}
            disabled={!hasFormula || isExecuting}
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
          >
            {isExecuting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Play className="h-3 w-3" />
            )}
          </Button>

          <AlertDialog open={columnToRemove === header} onOpenChange={(open) => !open && onSetColumnToRemove(null)}>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSetColumnToRemove(header)}
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove Column</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to remove the column "{header}"? This action cannot be undone and will delete all data in this column including any formulas.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onRemoveColumn(header)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Remove Column
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Execution Options Dialog */}
      <ExecutionOptionsDialog
        open={showExecutionDialog}
        column={header}
        totalRows={totalRows}
        headers={headers}
        onClose={() => setShowExecutionDialog(false)}
        onConfirm={handleConfirm}
      />
    </th>
  );
};
