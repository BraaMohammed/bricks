import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { useDataStore } from '@/stores/useDataStore';
import { toast } from '@/hooks/use-toast';
import localforage from 'localforage';

export interface UseCSVUploadReturn {
  handleCSVUpload: () => void;
  isUploading: boolean;
}

/**
 * Custom hook for CSV file upload with auto-save functionality
 * This is specifically for DataTable's inline upload feature (different from CSVUploader component)
 * Includes auto-saving current table to localStorage before loading new data
 */
export const useCSVUpload = (): UseCSVUploadReturn => {
  const { headers, rows, setData, clearData } = useDataStore();
  const [isUploading, setIsUploading] = useState(false);

  /**
   * Auto-save current table to localStorage before loading new CSV
   * Keeps last 5 auto-saves for data recovery
   */
  const autoSaveCurrentTable = useCallback(async () => {
    try {
      const currentData = {
        headers,
        rows,
        timestamp: new Date().toISOString(),
        name: `Auto-saved ${new Date().toLocaleString()}`
      };
      
      // Get existing auto-saves
      const existingAutoSaves = await localforage.getItem<string>('auto_saved_tables');
      let autoSaves = existingAutoSaves ? JSON.parse(existingAutoSaves) : [];
      
      // Keep only last 5 auto-saves
      autoSaves.unshift(currentData);
      if (autoSaves.length > 5) {
        autoSaves = autoSaves.slice(0, 5);
      }
      
      await localforage.setItem('auto_saved_tables', JSON.stringify(autoSaves));
      
      toast({
        title: "Table Auto-saved",
        description: "Current table has been automatically saved before loading new CSV.",
      });
    } catch (error) {
      console.error('Error auto-saving table:', error);
    }
  }, [headers, rows]);

  /**
   * Process CSV file and load data into store
   * Auto-saves current data if table has content
   */
  const processCSVFile = useCallback((file: File) => {
    setIsUploading(true);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          toast({
            title: "CSV Parse Error",
            description: "There were errors parsing your CSV file.",
            variant: "destructive",
          });
          setIsUploading(false);
          return;
        }

        const newHeaders = results.meta.fields || [];
        const newRows = results.data as Record<string, string>[];

        if (newHeaders.length === 0) {
          toast({
            title: "No Headers Found",
            description: "Your CSV file doesn't appear to have headers.",
            variant: "destructive",
          });
          setIsUploading(false);
          return;
        }

        // Auto-save current table before loading new one
        if (headers.length > 0 && rows.length > 0) {
          autoSaveCurrentTable();
        }

        // Clear existing data and load new data
        clearData();
        setData(newHeaders, newRows);
        
        toast({
          title: "CSV Loaded Successfully",
          description: `Loaded ${newRows.length} rows with ${newHeaders.length} columns.`,
        });
        
        setIsUploading(false);
      },
      error: (error) => {
        toast({
          title: "File Error",
          description: `Error reading file: ${error.message}`,
          variant: "destructive",
        });
        setIsUploading(false);
      },
    });
  }, [headers, rows, clearData, setData, autoSaveCurrentTable]);

  /**
   * Create file input and trigger file selection dialog
   * Uses programmatic file input for inline button upload
   */
  const handleCSVUpload = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,text/csv,application/vnd.ms-excel';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        processCSVFile(file);
      }
    };
    input.click();
  }, [processCSVFile]);

  return {
    handleCSVUpload,
    isUploading,
  };
};
