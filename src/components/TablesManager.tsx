import { useState, useEffect } from 'react';
import { Database, Save, FolderOpen, Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDataStore } from '@/stores/useDataStore';
import { toast } from '@/hooks/use-toast';

interface SavedTable {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  headers: string[];
  rows: any[];
  formulas: Record<string, string>;
  rowCount: number;
  columnCount: number;
}

export const TablesManager = () => {
  const [open, setOpen] = useState(false);
  const [savedTables, setSavedTables] = useState<SavedTable[]>([]);
  const [tableName, setTableName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  
  const { headers, rows, formulas, setData, setFormula } = useDataStore();

  useEffect(() => {
    loadSavedTables();
  }, []);

  const loadSavedTables = () => {
    try {
      const saved = localStorage.getItem('vibe-sheet-saved-tables');
      if (saved) {
        const tables = JSON.parse(saved);
        setSavedTables(tables);
      }
    } catch (error) {
      console.error('Error loading saved tables:', error);
    }
  };

  const saveCurrentTable = () => {
    if (!tableName.trim()) {
      toast({
        title: "Invalid Name",
        description: "Please enter a table name.",
        variant: "destructive",
      });
      return;
    }

    if (headers.length === 0) {
      toast({
        title: "No Data",
        description: "There's no data to save.",
        variant: "destructive",
      });
      return;
    }

    const tableId = Date.now().toString();
    const newTable: SavedTable = {
      id: tableId,
      name: tableName.trim(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      headers: [...headers],
      rows: [...rows],
      formulas: { ...formulas },
      rowCount: rows.length,
      columnCount: headers.length,
    };

    const currentTables = [...savedTables];
    currentTables.unshift(newTable);

    // Keep only the last 50 tables
    if (currentTables.length > 50) {
      currentTables.splice(50);
    }

    setSavedTables(currentTables);
    localStorage.setItem('vibe-sheet-saved-tables', JSON.stringify(currentTables));

    setTableName('');
    setShowSaveDialog(false);

    toast({
      title: "Table Saved",
      description: `Table "${newTable.name}" has been saved successfully.`,
    });
  };

  const loadTable = (table: SavedTable) => {
    setData(table.headers, table.rows);
    
    // Load formulas
    Object.entries(table.formulas).forEach(([column, formula]) => {
      setFormula(column, formula);
    });

    setOpen(false);

    toast({
      title: "Table Loaded",
      description: `Table "${table.name}" has been loaded successfully.`,
    });
  };

  const deleteTable = (tableId: string) => {
    if (window.confirm('Are you sure you want to delete this table? This action cannot be undone.')) {
      const updatedTables = savedTables.filter(table => table.id !== tableId);
      setSavedTables(updatedTables);
      localStorage.setItem('vibe-sheet-saved-tables', JSON.stringify(updatedTables));

      toast({
        title: "Table Deleted",
        description: "The table has been deleted successfully.",
      });
    }
  };

  const exportTable = (table: SavedTable) => {
    const csvContent = [
      table.headers.join(','),
      ...table.rows.map(row => 
        table.headers.map(header => {
          const value = row[header] || '';
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${table.name}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Complete",
      description: `Table "${table.name}" has been exported.`,
    });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString() + ' ' + new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Tables
            {savedTables.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {savedTables.length}
              </Badge>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Saved Tables
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            {savedTables.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No saved tables</p>
                <p className="text-sm">Save your current table to see it here</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {savedTables.map((table) => (
                  <Card key={table.id} className="hover:bg-muted/50 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{table.name}</CardTitle>
                          <CardDescription>
                            Created: {formatDate(table.createdAt)}
                            {table.updatedAt !== table.createdAt && (
                              <> • Updated: {formatDate(table.updatedAt)}</>
                            )}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs">
                            {table.columnCount} cols
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {table.rowCount} rows
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-1">
                          {table.headers.slice(0, 5).map((header) => (
                            <Badge key={header} variant="secondary" className="text-xs">
                              {header}
                            </Badge>
                          ))}
                          {table.headers.length > 5 && (
                            <Badge variant="secondary" className="text-xs">
                              +{table.headers.length - 5} more
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => exportTable(table)}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => loadTable(table)}
                          >
                            <FolderOpen className="h-3 w-3 mr-1" />
                            Load
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteTable(table.id)}
                            className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Current Table Button */}
      {headers.length > 0 && (
        <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save Table
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Current Table</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="table-name">Table Name</Label>
                <Input
                  id="table-name"
                  placeholder="Enter table name..."
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      saveCurrentTable();
                    }
                  }}
                />
              </div>
              <div className="text-sm text-muted-foreground">
                This will save your current data, columns, and formulas.
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={saveCurrentTable}>
                  Save Table
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
