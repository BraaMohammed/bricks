import { useState, useMemo } from 'react';
import { Settings, Play, ChevronUp, ChevronDown, Plus, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useDataStore } from '@/stores/useDataStore';
import { toast } from '@/hooks/use-toast';

interface DataTableProps {
  onEditFormula: (column: string) => void;
}

export const DataTable = ({ onEditFormula }: DataTableProps) => {
  const { headers, rows, getFormula, updateCell, setLoading, addRow, addColumn, removeColumn, setActiveColumn, executeFormulaOnCell } = useDataStore();
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [executingColumn, setExecutingColumn] = useState<string | null>(null);
  const [executingCell, setExecutingCell] = useState<string | null>(null);
  const [showAddColumnDialog, setShowAddColumnDialog] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [columnToRemove, setColumnToRemove] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<{row: number, column: string, content: string} | null>(null);

  const sortedRows = useMemo(() => {
    if (!sortColumn) return rows;
    
    return [...rows].sort((a, b) => {
      const aVal = a[sortColumn] || '';
      const bVal = b[sortColumn] || '';
      
      const comparison = aVal.localeCompare(bVal);
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [rows, sortColumn, sortDirection]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const executeFormula = async (column: string) => {
    const formula = getFormula(column);
    
    if (!formula.trim()) {
      toast({
        title: "No Formula",
        description: `Column "${column}" doesn't have a formula defined.`,
        variant: "destructive",
      });
      return;
    }

    setExecutingColumn(column);
    setLoading(true);

    try {
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        try {
          // Create async function from formula string with proper column access syntax
          const asyncFunction = new Function('row', `
            return (async () => {
              ${formula}
            })();
          `);
          
          const result = await asyncFunction(row);
          const stringResult = result !== null && result !== undefined ? String(result) : '';
          
          updateCell(i, column, stringResult);
          successCount++;
        } catch (error) {
          updateCell(i, column, 'ERROR');
          errorCount++;
          console.error(`Error in row ${i}:`, error);
        }
      }

      toast({
        title: "Formula Executed",
        description: `${successCount} rows processed successfully${errorCount > 0 ? `, ${errorCount} errors` : ''}.`,
        variant: errorCount === 0 ? "default" : "destructive",
      });
    } catch (error) {
      toast({
        title: "Execution Error",
        description: "Failed to execute formula. Check your syntax.",
        variant: "destructive",
      });
    } finally {
      setExecutingColumn(null);
      setLoading(false);
    }
  };

  const executeCellFormula = async (rowIndex: number, column: string) => {
    const cellKey = `${rowIndex}-${column}`;
    setExecutingCell(cellKey);

    try {
      await executeFormulaOnCell(rowIndex, column);
      toast({
        title: "Cell Updated",
        description: `Cell ${column} in row ${rowIndex + 1} has been updated.`,
      });
    } catch (error) {
      toast({
        title: "Execution Error",
        description: error instanceof Error ? error.message : "Failed to execute formula on this cell.",
        variant: "destructive",
      });
    } finally {
      setExecutingCell(null);
    }
  };

  const handleAddColumn = () => {
    if (!newColumnName.trim()) {
      toast({
        title: "Invalid Column Name",
        description: "Please enter a valid column name.",
        variant: "destructive",
      });
      return;
    }

    if (headers.includes(newColumnName)) {
      toast({
        title: "Column Exists",
        description: "A column with this name already exists.",
        variant: "destructive",
      });
      return;
    }

    addColumn(newColumnName);
    setShowAddColumnDialog(false);
    setNewColumnName('');
    
    // Automatically open formula editor for the new column
    setActiveColumn(newColumnName);
    onEditFormula(newColumnName);

    toast({
      title: "Column Added",
      description: `Column "${newColumnName}" has been added successfully.`,
    });
  };

  const handleRemoveColumn = (columnName: string) => {
    removeColumn(columnName);
    setColumnToRemove(null);
    
    toast({
      title: "Column Removed",
      description: `Column "${columnName}" has been removed successfully.`,
    });
  };

  const handleCellClick = (rowIndex: number, columnName: string, content: string) => {
    setSelectedCell({ row: rowIndex, column: columnName, content: content || '' });
  };

  if (headers.length === 0) {
    return null;
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-semibold">Data Table</h3>
        <div className="flex items-center gap-2">
          <Dialog open={showAddColumnDialog} onOpenChange={setShowAddColumnDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Column
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Column</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Enter column name..."
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddColumn();
                    }
                  }}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddColumnDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddColumn}>
                    Add Column
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button onClick={addRow} size="sm" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Row
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              {headers.map((header) => {
                const hasFormula = !!getFormula(header);
                const isExecuting = executingColumn === header;
                
                return (
                  <th key={header} className="table-header relative group">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleSort(header)}
                        className="flex items-center gap-1 text-left hover:text-foreground transition-colors"
                      >
                        <span className="truncate max-w-[120px]">{header}</span>
                        {sortColumn === header && (
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
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => executeFormula(header)}
                          disabled={!hasFormula || isExecuting}
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                        >
                          <Play className={`h-3 w-3 ${isExecuting ? 'animate-spin' : ''}`} />
                        </Button>
                        
                        <AlertDialog open={columnToRemove === header} onOpenChange={(open) => !open && setColumnToRemove(null)}>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setColumnToRemove(header)}
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
                                onClick={() => handleRemoveColumn(header)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Remove Column
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, index) => (
              <tr key={index} className="border-b border-border hover:bg-muted/30 transition-colors">
                {headers.map((header) => {
                  const hasFormula = !!getFormula(header);
                  const cellKey = `${index}-${header}`;
                  const isCellExecuting = executingCell === cellKey;
                  
                  return (
                    <td key={header} className="table-cell relative group">
                      <div className="flex items-center justify-between">
                        <div 
                          className="truncate max-w-[150px] cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5" 
                          title={row[header]}
                          onClick={() => handleCellClick(index, header, row[header])}
                        >
                          {row[header] || ''}
                        </div>
                        <div className="flex items-center gap-1">
                          {hasFormula && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => executeCellFormula(index, header)}
                              disabled={isCellExecuting}
                              className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                            >
                              <Play className={`h-3 w-3 ${isCellExecuting ? 'animate-spin' : ''}`} />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCellClick(index, header, row[header])}
                            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {rows.length === 0 && (
        <div className="p-8 text-center text-muted-foreground">
          <p>No data to display</p>
        </div>
      )}

      {/* Cell Content Viewer */}
      <Sheet open={!!selectedCell} onOpenChange={(open) => !open && setSelectedCell(null)}>
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
                  <p className="text-lg">
                    {!selectedCell.content ? 'Empty' : 
                     !isNaN(Number(selectedCell.content)) ? 'Number' : 
                     selectedCell.content.includes('@') ? 'Email-like' :
                     selectedCell.content.startsWith('http') ? 'URL-like' : 'Text'}
                  </p>
                </div>
              </div>

              {/* Formula Info */}
              {getFormula(selectedCell.column) && (
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
                        onClick={() => {
                          setSelectedCell(null);
                          onEditFormula(selectedCell.column);
                        }}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Edit Formula
                      </Button>
                    </div>
                    <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded block overflow-x-auto">
                      {getFormula(selectedCell.column)}
                    </code>
                  </Card>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedCell.content || '');
                    toast({
                      title: "Copied",
                      description: "Cell content copied to clipboard.",
                    });
                  }}
                  className="flex-1"
                >
                  Copy Content
                </Button>
                {getFormula(selectedCell.column) && (
                  <Button
                    onClick={() => executeCellFormula(selectedCell.row, selectedCell.column)}
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
    </Card>
  );
};