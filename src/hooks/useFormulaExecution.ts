import { useState } from 'react';
import { useDataStore } from '@/stores/useDataStore';
import { toast } from '@/hooks/use-toast';
import { runAIAgents } from '@/lib/aiAgents';

export interface UseFormulaExecutionReturn {
  executingColumn: string | null;
  executingCells: Set<string>;
  executeFormula: (column: string) => Promise<void>;
  executeCellFormula: (rowIndex: number, column: string) => Promise<void>;
}

/**
 * Custom hook for managing formula execution on columns and individual cells
 * Handles parallel execution, error handling, and loading states
 */
export const useFormulaExecution = (): UseFormulaExecutionReturn => {
  const { headers, rows, getFormula, updateCell, setLoading, executeFormulaOnCell } = useDataStore();
  const [executingColumn, setExecutingColumn] = useState<string | null>(null);
  const [executingCells, setExecutingCells] = useState<Set<string>>(new Set());

  /**
   * Execute formula on all rows in a column
   * Runs all rows in parallel with individual error handling per row
   */
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
      // Execute all rows in parallel with individual timeouts for each API call
      const rowPromises = rows.map(async (row, i) => {
        try {
          console.log(`🚀 Starting row ${i + 1}/${rows.length} with individual timeout per API call`);
          
          // Create async function from formula string with proper column access syntax
          const asyncFunction = new Function('row', 'runAIAgents', `
            return (async () => {
              ${formula}
            })();
          `);
          
          const result = await asyncFunction(row, runAIAgents);
          const stringResult = result !== null && result !== undefined ? String(result) : '';
          
          updateCell(i, column, stringResult);
          console.log(`✅ Row ${i + 1} completed successfully`);
          return { success: true, rowIndex: i };
        } catch (error) {
          updateCell(i, column, 'ERROR');
          console.error(`❌ Row ${i + 1} failed:`, error);
          return { success: false, rowIndex: i, error };
        }
      });

      // Wait for all rows to complete (each with its own independent timeout)
      const results = await Promise.all(rowPromises);
      
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;

      toast({
        title: "Formula Executed",
        description: `${successCount} rows processed successfully${errorCount > 0 ? `, ${errorCount} errors` : ''}.`,
        variant: errorCount === 0 ? "default" : "destructive",
      });
    } catch (error) {
      console.error('Error executing formula:', error);
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

  /**
   * Execute formula on a single cell
   * Uses the store's executeFormulaOnCell method
   */
  const executeCellFormula = async (rowIndex: number, column: string) => {
    const cellKey = `${rowIndex}-${column}`;
    setExecutingCells(prev => new Set(prev).add(cellKey));

    try {
      await executeFormulaOnCell(rowIndex, column, { runAIAgents });
      toast({
        title: "Cell Updated",
        description: `Cell ${column} in row ${rowIndex + 1} has been updated.`,
      });
    } catch (error) {
      console.error('Error executing cell formula:', error);
      toast({
        title: "Execution Error",
        description: error instanceof Error ? error.message : "Failed to execute formula on this cell.",
        variant: "destructive",
      });
    } finally {
      setExecutingCells(prev => {
        const newSet = new Set(prev);
        newSet.delete(cellKey);
        return newSet;
      });
    }
  };

  return {
    executingColumn,
    executingCells,
    executeFormula,
    executeCellFormula,
  };
};
