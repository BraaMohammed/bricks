import { useState, useMemo } from 'react';
import { Settings, Play, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDataStore } from '@/stores/useDataStore';
import { toast } from '@/hooks/use-toast';

interface DataTableProps {
  onEditFormula: (column: string) => void;
}

export const DataTable = ({ onEditFormula }: DataTableProps) => {
  const { headers, rows, getFormula, updateCell, setLoading } = useDataStore();
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [executingColumn, setExecutingColumn] = useState<string | null>(null);

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
          // Create async function from formula string
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

  if (headers.length === 0) {
    return null;
  }

  return (
    <Card className="overflow-hidden">
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
                {headers.map((header) => (
                  <td key={header} className="table-cell">
                    <div className="truncate max-w-[200px]" title={row[header]}>
                      {row[header] || ''}
                    </div>
                  </td>
                ))}
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
    </Card>
  );
};