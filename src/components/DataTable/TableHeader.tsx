import { useState } from 'react';
import { Settings, Play, NavArrowUp, NavArrowDown, Trash, Refresh } from 'iconoir-react';
import { Button } from '@/components/ui/button';
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
    <th className="group relative border-r border-border/60 px-4 py-3 text-left last:border-r-0">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => onSort(header)}
          className="flex items-center gap-1.5 text-left transition-colors hover:text-foreground"
        >
          <span className="max-w-[160px] truncate font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground transition-colors group-hover:text-foreground/80">
            {header}
          </span>
          {isSorted && (
            sortDirection === 'asc' ?
              <NavArrowUp className="text-[12px] text-primary" /> :
              <NavArrowDown className="text-[12px] text-primary" />
          )}
        </button>

        <div className="flex items-center gap-1">
          {hasFormula && (
            <span className="rounded border border-primary/40 bg-primary/10 px-1 py-px font-mono text-[9px] text-primary">
              f(x)
            </span>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEditFormula(header)}
            className="h-6 w-6 p-0 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
          >
            <Settings className="text-[12px]" />
          </Button>

          {/* ▶ Execute button — opens options dialog */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowExecutionDialog(true)}
            disabled={!hasFormula || isExecuting}
            className="h-6 w-6 p-0 text-muted-foreground opacity-0 transition-opacity hover:text-primary group-hover:opacity-100 disabled:opacity-50"
          >
            {isExecuting ? (
              <Refresh className="animate-spin text-[12px] text-primary" />
            ) : (
              <Play className="text-[12px]" />
            )}
          </Button>

          <AlertDialog open={columnToRemove === header} onOpenChange={(open) => !open && onSetColumnToRemove(null)}>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSetColumnToRemove(header)}
                className="h-6 w-6 p-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
              >
                <Trash className="text-[12px]" />
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
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Remove Column
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Executing underline */}
      {isExecuting && (
        <span className="absolute inset-x-0 bottom-0 h-0.5 brick-progress-fill" />
      )}

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
