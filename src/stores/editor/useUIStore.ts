import { create } from 'zustand';

interface UIState {
  showSlashMenu: boolean;
  slashMenuPosition: { top: number; left: number };
  showRemoveDialog: boolean;
  formulaName: string;
  showAdvancedSettings: boolean;
  hasChanges: boolean;

  setShowSlashMenu: (show: boolean) => void;
  setSlashMenuPosition: (position: { top: number; left: number }) => void;
  setShowRemoveDialog: (show: boolean) => void;
  setFormulaName: (name: string) => void;
  setShowAdvancedSettings: (show: boolean) => void;
  setHasChanges: (has: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  showSlashMenu: false,
  slashMenuPosition: { top: 0, left: 0 },
  showRemoveDialog: false,
  formulaName: '',
  showAdvancedSettings: false,
  hasChanges: false,

  setShowSlashMenu: (show) => set({ showSlashMenu: show }),
  setSlashMenuPosition: (position) => set({ slashMenuPosition: position }),
  setShowRemoveDialog: (show) => set({ showRemoveDialog: show }),
  setFormulaName: (name) => set({ formulaName: name }),
  setShowAdvancedSettings: (show) => set({ showAdvancedSettings: show }),
  setHasChanges: (has) => set({ hasChanges: has }),
}));
