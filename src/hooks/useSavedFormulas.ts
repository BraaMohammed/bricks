/**
 * useSavedFormulas Hook
 * 
 * Manages saved formulas in localStorage.
 * Provides functions to save, load, and delete formulas for reuse.
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

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
   * Load saved formulas from localStorage on mount
   */
  useEffect(() => {
    const savedFormulasFromStorage = localStorage.getItem(STORAGE_KEY);
    if (savedFormulasFromStorage) {
      try {
        const parsed = JSON.parse(savedFormulasFromStorage);
        setSavedFormulas(parsed);
        console.log(`📚 Loaded ${parsed.length} saved formulas from localStorage`);
      } catch (error) {
        console.error('Error loading saved formulas:', error);
        setSavedFormulas([]);
      }
    }
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
      
      // Persist to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedFormulas));
      
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
      
      // Persist to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedFormulas));
      
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
    localStorage.removeItem(STORAGE_KEY);
    
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
