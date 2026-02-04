import { Play, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TableCellProps {
  value: string;
  rowIndex: number;
  columnName: string;
  hasFormula: boolean;
  isExecuting: boolean;
  onExecuteCell: (rowIndex: number, column: string) => void;
  onViewCell: (rowIndex: number, column: string, content: string) => void;
}

/**
 * TableCell component for individual data cells
 * Includes cell content display, execute button (for formulas), and view button
 */
export const TableCell = ({
  value,
  rowIndex,
  columnName,
  hasFormula,
  isExecuting,
  onExecuteCell,
  onViewCell,
}: TableCellProps) => {
  const handleCellClick = () => {
    onViewCell(rowIndex, columnName, value);
  };

  return (
    <td className="table-cell relative group">
      <div className="flex items-center justify-between">
        <div 
          className="truncate max-w-[150px] cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5" 
          title={value}
          onClick={handleCellClick}
        >
          {value || ''}
        </div>
        <div className="flex items-center gap-1">
          {hasFormula && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onExecuteCell(rowIndex, columnName)}
              disabled={isExecuting}
              className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
            >
              {isExecuting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Play className="h-3 w-3" />
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCellClick}
            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
          >
            <Eye className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </td>
  );
};
