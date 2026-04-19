import { create } from 'zustand';

interface AIModeState {
  aiPrompt: string;
  aiMessage: string;
  setAiPrompt: (prompt: string) => void;
  setAiMessage: (message: string) => void;
}

export const useAIModeStore = create<AIModeState>((set) => ({
  aiPrompt: '',
  aiMessage: '',
  setAiPrompt: (prompt) => set({ aiPrompt: prompt }),
  setAiMessage: (message) => set({ aiMessage: message }),
}));
