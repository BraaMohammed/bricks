import { Upload, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TableToolbarProps {
  onUploadCSV: () => void;
  onAddColumn: () => void;
}

/**
 * Toolbar component for DataTable with action buttons
 * Displays Upload CSV and Add Column buttons
 */
export const TableToolbar = ({ onUploadCSV, onAddColumn }: TableToolbarProps) => {
  return (
    <div className="flex items-center justify-between p-4 border-b border-border">
      <h3 className="font-semibold">Data Table</h3>
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
