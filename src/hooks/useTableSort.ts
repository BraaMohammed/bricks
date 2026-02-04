import { useState, useMemo } from 'react';

export interface UseTableSortReturn {
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  sortedRows: Record<string, string>[];
  handleSort: (column: string) => void;
}

/**
 * Custom hook for managing table sorting state and logic
 * @param rows - Array of row data objects
 * @returns Sorting state and sorted rows
 */
export const useTableSort = (rows: Record<string, string>[]): UseTableSortReturn => {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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

  return {
    sortColumn,
    sortDirection,
    sortedRows,
    handleSort,
  };
};
