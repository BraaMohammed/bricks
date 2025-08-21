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
  clearData: () => void;
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