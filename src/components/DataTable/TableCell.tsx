import { Play, Eye, Refresh } from 'iconoir-react';
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
    <td className="group/cell relative border-r border-border/60 px-4 py-3 last:border-r-0">
      <div className="flex items-center justify-between">
        {isExecuting ? (
          <span className="flex items-center gap-2 font-mono text-[11px] text-primary">
            <Refresh className="animate-spin text-[12px]" />
            running…
          </span>
        ) : (
          <div
            className="max-w-[180px] cursor-pointer truncate rounded px-1 py-0.5 text-sm hover:bg-muted/50"
            title={value}
            onClick={handleCellClick}
          >
            {value || <span className="font-mono text-[11px] text-muted-foreground/40">—</span>}
          </div>
        )}
        <div className="flex items-center gap-1">
          {hasFormula && !isExecuting && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onExecuteCell(rowIndex, columnName)}
              className="ml-1 h-5 w-5 p-0 text-muted-foreground opacity-0 transition-opacity hover:text-primary group-hover/cell:opacity-100"
            >
              <Play className="text-[11px]" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCellClick}
            className="ml-1 h-5 w-5 p-0 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/cell:opacity-100"
          >
            <Eye className="text-[11px]" />
          </Button>
        </div>
      </div>
    </td>
  );
};
