import { useState } from 'react';
import { useDataStore } from '@/stores/useDataStore';
import { toast } from '@/hooks/use-toast';

export interface UseColumnManagementReturn {
  showAddColumnDialog: boolean;
  setShowAddColumnDialog: (show: boolean) => void;
  newColumnName: string;
  setNewColumnName: (name: string) => void;
  columnToRemove: string | null;
  setColumnToRemove: (column: string | null) => void;
  handleAddColumn: () => void;
  handleRemoveColumn: (columnName: string) => void;
}

/**
 * Custom hook for managing column operations (add/remove)
 * Includes validation, dialog state management, and formula editor integration
 */
export const useColumnManagement = (
  headers: string[],
  onEditFormula: (column: string) => void
): UseColumnManagementReturn => {
  const { addColumn, removeColumn, setActiveColumn } = useDataStore();
  const [showAddColumnDialog, setShowAddColumnDialog] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [columnToRemove, setColumnToRemove] = useState<string | null>(null);

  /**
   * Add new column with validation
   * Automatically opens formula editor for the new column
   */
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

  /**
   * Remove column and reset removal state
   */
  const handleRemoveColumn = (columnName: string) => {
    removeColumn(columnName);
    setColumnToRemove(null);
    
    toast({
      title: "Column Removed",
      description: `Column "${columnName}" has been removed successfully.`,
    });
  };

  return {
    showAddColumnDialog,
    setShowAddColumnDialog,
    newColumnName,
    setNewColumnName,
    columnToRemove,
    setColumnToRemove,
    handleAddColumn,
    handleRemoveColumn,
  };
};
