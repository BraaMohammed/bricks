import { Upload, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

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
    <div className="flex items-center justify-between p-4 border-b border-border">
      <div className="flex items-center gap-4">
        <h3 className="font-semibold">Data Table</h3>
        
        {/* Progress Indicator - shown when formulas are executing */}
        {executionProgress && (
          <div className="flex items-center gap-3">
            <Progress 
              value={(executionProgress.completed / executionProgress.total) * 100} 
              className="w-32 h-2"
            />
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              Processing {executionProgress.completed}/{executionProgress.total} rows
            </span>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onUploadCSV}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          Upload New CSV
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          className="flex items-center gap-2"
          onClick={onAddColumn}
        >
          <Plus className="h-4 w-4" />
          Add Column
        </Button>
      </div>
    </div>
  );
};
