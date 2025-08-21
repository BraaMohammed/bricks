import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface DataRow {
  [key: string]: string;
}

export interface DataState {
  headers: string[];
  rows: DataRow[];
  formulas: Record<string, string>;
  isLoading: boolean;
  activeColumn: string | null;
}

export interface DataActions {
  setData: (headers: string[], rows: DataRow[]) => void;
  updateCell: (rowIndex: number, column: string, value: string) => void;
  setFormula: (column: string, formula: string) => void;
  getFormula: (column: string) => string;
  setLoading: (loading: boolean) => void;
  setActiveColumn: (column: string | null) => void;
  addRow: () => void;
  addColumn: (columnName: string) => void;
  removeColumn: (columnName: string) => void;
  clearData: () => void;
  executeFormulaOnCell: (rowIndex: number, column: string) => Promise<void>;
}

const initialState: DataState = {
  headers: [],
  rows: [],
  formulas: {},
  isLoading: false,
  activeColumn: null,
};

export const useDataStore = create<DataState & DataActions>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      setData: (headers: string[], rows: DataRow[]) => {
        set({ headers, rows });
      },
      
      updateCell: (rowIndex: number, column: string, value: string) => {
        const { rows } = get();
        const newRows = [...rows];
        if (newRows[rowIndex]) {
          newRows[rowIndex] = { ...newRows[rowIndex], [column]: value };
          set({ rows: newRows });
        }
      },
      
      setFormula: (column: string, formula: string) => {
        const { formulas } = get();
        set({ 
          formulas: { ...formulas, [column]: formula }
        });
      },
      
      getFormula: (column: string) => {
        const { formulas } = get();
        return formulas[column] || '';
      },
      
      setLoading: (isLoading: boolean) => {
        set({ isLoading });
      },
      
      setActiveColumn: (activeColumn: string | null) => {
        set({ activeColumn });
      },
      
      addRow: () => {
        const { headers, rows } = get();
        const newRow: DataRow = {};
        headers.forEach(header => {
          newRow[header] = '';
        });
        set({ rows: [...rows, newRow] });
      },
      
      addColumn: (columnName: string) => {
        const { headers, rows } = get();
        const newHeaders = [...headers, columnName];
        const newRows = rows.map(row => ({ ...row, [columnName]: '' }));
        set({ headers: newHeaders, rows: newRows });
      },
      
      removeColumn: (columnName: string) => {
        const { headers, rows, formulas } = get();
        const newHeaders = headers.filter(header => header !== columnName);
        const newRows = rows.map(row => {
          const { [columnName]: removed, ...rest } = row;
          return rest;
        });
        const { [columnName]: removedFormula, ...newFormulas } = formulas;
        set({ 
          headers: newHeaders, 
          rows: newRows, 
          formulas: newFormulas 
        });
      },
      
      executeFormulaOnCell: async (rowIndex: number, column: string) => {
        const { rows, formulas, updateCell } = get();
        const formula = formulas[column];
        
        if (!formula?.trim()) {
          throw new Error(`No formula defined for column "${column}"`);
        }

        const row = rows[rowIndex];
        
        try {
          // Create async function from formula string with proper column access
          const asyncFunction = new Function('row', `
            return (async () => {
              ${formula}
            })();
          `);
          
          const result = await asyncFunction(row);
          const stringResult = result !== null && result !== undefined ? String(result) : '';
          
          updateCell(rowIndex, column, stringResult);
        } catch (error) {
          updateCell(rowIndex, column, 'ERROR');
          throw error;
        }
      },
      
      clearData: () => {
        set(initialState);
      },
    }),
    {
      name: 'vibe-sheet-storage',
      partialize: (state) => ({
        headers: state.headers,
        rows: state.rows,
        formulas: state.formulas,
      }),
    }
  )
);