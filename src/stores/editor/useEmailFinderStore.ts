import { create } from 'zustand';
import { AIProvider } from '@/lib/constants/aiModels';

interface EmailFinderState {
  emailProvider: AIProvider;
  emailModel: string;
  emailMaxSteps: number;
  emailTemperature: number;
  emailThinkingMode: boolean;
  emailContext: string;

  setEmailProvider: (provider: AIProvider) => void;
  setEmailModel: (model: string) => void;
  setEmailMaxSteps: (steps: number) => void;
  setEmailTemperature: (temp: number) => void;
  setEmailThinkingMode: (thinking: boolean) => void;
  setEmailContext: (context: string) => void;
}

export const useEmailFinderStore = create<EmailFinderState>((set) => ({
  emailProvider: 'openai',
  emailModel: 'gpt-4o-mini',
  emailMaxSteps: 15,
  emailTemperature: 0.3,
  emailThinkingMode: false,
  emailContext: '',

  setEmailProvider: (provider) => set({ emailProvider: provider }),
  setEmailModel: (model) => set({ emailModel: model }),
  setEmailMaxSteps: (steps) => set({ emailMaxSteps: steps }),
  setEmailTemperature: (temp) => set({ emailTemperature: temp }),
  setEmailThinkingMode: (thinking) => set({ emailThinkingMode: thinking }),
  setEmailContext: (context) => set({ emailContext: context }),
}));
