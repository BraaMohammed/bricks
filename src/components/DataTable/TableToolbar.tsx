import { Upload, Plus } from 'iconoir-react';

interface TableToolbarProps {
  onUploadCSV: () => void;
  onAddColumn: () => void;
  executionProgress?: { completed: number; total: number } | null;
}

/**
 * Toolbar component for DataTable with action buttons
 * Displays Upload CSV and Add Column buttons, and execution progress
 */
export const TableToolbar = ({ onUploadCSV, onAddColumn, executionProgress }: TableToolbarProps) => {
  return (
    <div className="flex h-14 items-center justify-between border-b border-border px-4">
      <div className="flex items-center gap-3">
        <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-foreground">
          Data table
        </h3>

        {/* Progress Indicator - shown when formulas are executing */}
        {executionProgress && (
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Enriching
            </span>
            <div className="h-1.5 w-32 rounded-full bg-muted">
              <div
                className="brick-progress-fill h-full rounded-full"
                style={{ width: `${(executionProgress.completed / executionProgress.total) * 100}%` }}
              />
            </div>
            <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground whitespace-nowrap">
              {executionProgress.completed}/{executionProgress.total}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onUploadCSV}
          className="flex h-8 items-center gap-2 rounded-md border border-border px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
        >
          <Upload className="text-[13px]" />
          <span className="hidden sm:inline">Upload</span>
        </button>
        <button
          onClick={onAddColumn}
          className="flex h-8 items-center gap-2 rounded-md border border-primary bg-primary px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-primary-foreground transition-colors hover:bg-primary-glow hover:border-primary-glow"
        >
          <Plus className="text-[13px]" />
          <span className="hidden sm:inline">Add column</span>
        </button>
      </div>
    </div>
  );
};
