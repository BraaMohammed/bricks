import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { useDataStore } from '@/stores/useDataStore';

// Custom Hooks
import { useTableSort } from '@/hooks/useTableSort';
import { useFormulaExecution } from '@/hooks/useFormulaExecution';
import { useCSVUpload } from '@/hooks/useCSVUpload';
import { useColumnManagement } from '@/hooks/useColumnManagement';

// UI Components
import { TableToolbar } from './DataTable/TableToolbar';
import { TableHeader } from './DataTable/TableHeader';
import { TableCell } from './DataTable/TableCell';
import { CellDetailsSheet } from './DataTable/CellDetailsSheet';
import { AddColumnDialog } from './DataTable/AddColumnDialog';

interface DataTableProps {
  onEditFormula: (column: string) => void;
}

/**
 * DataTable Component - Main orchestrator for table display and interaction
 * 
 * Responsibilities:
 * - Coordinate custom hooks for sorting, formula execution, CSV upload, and column management
 * - Render table structure with headers and cells
 * - Manage cell details viewing
 * 
 * Note: This component has been refactored from 628 lines to 158 lines by extracting
 * logic into custom hooks and UI into sub-components
 */
export const DataTable = ({ onEditFormula }: DataTableProps) => {
  // Store data access
  const { headers, rows, getFormula } = useDataStore();
  
  // Custom Hooks - Business Logic
  const { sortColumn, sortDirection, sortedRows, handleSort } = useTableSort(rows);
  const { executingColumn, executingCells, executeFormula, executeCellFormula } = useFormulaExecution();
  const { handleCSVUpload } = useCSVUpload();
  const { 
    showAddColumnDialog, 
    setShowAddColumnDialog,
    newColumnName,
    setNewColumnName,
    columnToRemove,
    setColumnToRemove,
    handleAddColumn,
    handleRemoveColumn 
  } = useColumnManagement(headers, onEditFormula);
  
  // Local UI state for cell details viewer
  const [selectedCell, setSelectedCell] = useState<{row: number, column: string, content: string} | null>(null);

  // Handler for cell click to show details
  const handleCellClick = (rowIndex: number, columnName: string, content: string) => {
    setSelectedCell({ row: rowIndex, column: columnName, content: content || '' });
  };

  // Early return if no data
  if (headers.length === 0) {
    return null;
  }

  return (
    <Card className="overflow-hidden">
      {/* Toolbar with CSV upload and Add Column actions */}
      <TableToolbar 
        onUploadCSV={handleCSVUpload}
        onAddColumn={() => setShowAddColumnDialog(true)}
      />
      
      {/* Horizontal scroll container with mirrored scroll bars */}
      <div className="relative">
        {/* Top scroll bar - mirrored to main table */}
        <div 
          className="overflow-x-auto pb-2 border-b border-border/30"
          onScroll={(e) => {
            const tableContainer = e.currentTarget.parentElement?.querySelector('.table-scroll-container') as HTMLElement;
            if (tableContainer) {
              tableContainer.scrollLeft = e.currentTarget.scrollLeft;
            }
          }}
        >
          <div style={{ width: `${headers.length * 200}px`, height: '1px' }} />
        </div>
        
        {/* Main table container */}
        <div 
          className="overflow-x-auto table-scroll-container"
          onScroll={(e) => {
            const topScroll = e.currentTarget.parentElement?.querySelector('div') as HTMLElement;
            if (topScroll) {
              topScroll.scrollLeft = e.currentTarget.scrollLeft;
            }
          }}
        >
          <table className="w-full border-collapse">
          {/* Table Headers with sorting and actions */}
          <thead>
            <tr className="border-b border-border">
              {headers.map((header) => (
                <TableHeader
                  key={header}
                  header={header}
                  hasFormula={!!getFormula(header)}
                  isExecuting={executingColumn === header}
                  isSorted={sortColumn === header}
                  sortDirection={sortDirection}
                  columnToRemove={columnToRemove}
                  onSort={handleSort}
                  onEditFormula={onEditFormula}
                  onExecuteFormula={executeFormula}
                  onRemoveColumn={handleRemoveColumn}
                  onSetColumnToRemove={setColumnToRemove}
                />
              ))}
            </tr>
          </thead>
          {/* Table Body with data cells */}
          <tbody>
            {sortedRows.map((row, index) => (
              <tr key={index} className="border-b border-border hover:bg-muted/30 transition-colors">
                {headers.map((header) => {
                  const cellKey = `${index}-${header}`;
                  const isCellExecuting = executingCells.has(cellKey);
                  const isColumnExecuting = executingColumn === header;
                  const isAnyExecuting = isCellExecuting || isColumnExecuting;
                  
                  return (
                    <TableCell
                      key={header}
                      value={row[header]}
                      rowIndex={index}
                      columnName={header}
                      hasFormula={!!getFormula(header)}
                      isExecuting={isAnyExecuting}
                      onExecuteCell={executeCellFormula}
                      onViewCell={handleCellClick}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
      
      {/* Empty state message */}
      {rows.length === 0 && (
        <div className="p-8 text-center text-muted-foreground">
          <p>No data to display</p>
        </div>
      )}

      {/* Dialogs and Sheets */}
      <CellDetailsSheet
        selectedCell={selectedCell}
        formula={selectedCell ? getFormula(selectedCell.column) : null}
        onClose={() => setSelectedCell(null)}
        onEditFormula={onEditFormula}
        onExecuteCell={executeCellFormula}
      />

      <AddColumnDialog
        open={showAddColumnDialog}
        columnName={newColumnName}
        onClose={() => setShowAddColumnDialog(false)}
        onColumnNameChange={setNewColumnName}
        onAddColumn={handleAddColumn}
      />
    </Card>
  );
};