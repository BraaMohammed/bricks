/**
 * useSavedFormulas Hook
 * 
 * Manages saved formulas in localStorage.
 * Provides functions to save, load, and delete formulas for reuse.
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import localforage from 'localforage';

const STORAGE_KEY = 'saved_formulas';

export interface SavedFormula {
  name: string;
  code: string;
}

export interface SavedFormulasHook {
  savedFormulas: SavedFormula[];
  saveFormula: (name: string, code: string) => void;
  deleteFormula: (name: string) => void;
  loadFormula: (name: string) => string | null;
  clearAllFormulas: () => void;
}

/**
 * Hook for managing saved formulas
 * 
 * @returns Object with saved formulas state and management functions
 */
export const useSavedFormulas = (): SavedFormulasHook => {
  const [savedFormulas, setSavedFormulas] = useState<SavedFormula[]>([]);

  /**
   * Load saved formulas from localforage on mount
   */
  useEffect(() => {
    const loadFormulas = async () => {
      try {
        const savedFormulasFromStorage = await localforage.getItem<string>(STORAGE_KEY);
        if (savedFormulasFromStorage) {
          const parsed = JSON.parse(savedFormulasFromStorage);
          setSavedFormulas(parsed);
          console.log(`📚 Loaded ${parsed.length} saved formulas from IndexedDB`);
        }
      } catch (error) {
        console.error('Error loading saved formulas:', error);
        setSavedFormulas([]);
      }
    };
    loadFormulas();
  }, []);

  /**
   * Save formula to localStorage
   */
  const saveFormula = useCallback((name: string, code: string) => {
    if (!name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a name for the formula.",
        variant: "destructive",
      });
      return;
    }

    if (!code.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a formula to save.",
        variant: "destructive",
      });
      return;
    }

    const newFormula: SavedFormula = {
      name: name.trim(),
      code: code
    };

    setSavedFormulas(prev => {
      // Remove any existing formula with the same name, then add new one
      const updatedFormulas = [...prev.filter(f => f.name !== newFormula.name), newFormula];
      
      // Persist to indexedDB
      localforage.setItem(STORAGE_KEY, JSON.stringify(updatedFormulas)).catch(err => console.error('Failed to save formula to indexedDB', err));
      
      console.log(`💾 Saved formula: ${newFormula.name}`);
      
      toast({
        title: "Formula Saved",
        description: `Formula "${newFormula.name}" has been saved for reuse.`,
      });
      
      return updatedFormulas;
    });
  }, []);

  /**
   * Delete a saved formula
   */
  const deleteFormula = useCallback((name: string) => {
    setSavedFormulas(prev => {
      const updatedFormulas = prev.filter(f => f.name !== name);
      
      // Persist to indexedDB
      localforage.setItem(STORAGE_KEY, JSON.stringify(updatedFormulas)).catch(err => console.error('Failed to delete formula from indexedDB', err));
      
      console.log(`🗑️ Deleted formula: ${name}`);
      
      toast({
        title: "Formula Deleted",
        description: `Formula "${name}" has been deleted.`,
      });
      
      return updatedFormulas;
    });
  }, []);

  /**
   * Load a formula by name
   */
  const loadFormula = useCallback((name: string): string | null => {
    const formula = savedFormulas.find(f => f.name === name);
    
    if (formula) {
      console.log(`📖 Loaded formula: ${name}`);
      return formula.code;
    }
    
    console.warn(`⚠️ Formula not found: ${name}`);
    return null;
  }, [savedFormulas]);

  /**
   * Clear all saved formulas
   */
  const clearAllFormulas = useCallback(() => {
    setSavedFormulas([]);
    localforage.removeItem(STORAGE_KEY).catch(err => console.error('Failed to clear formulas from indexedDB', err));
    
    console.log('🗑️ Cleared all saved formulas');
    
    toast({
      title: "All Formulas Cleared",
      description: "All saved formulas have been deleted.",
    });
  }, []);

  return {
    savedFormulas,
    saveFormula,
    deleteFormula,
    loadFormula,
    clearAllFormulas,
  };
};
