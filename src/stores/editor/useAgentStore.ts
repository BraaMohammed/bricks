import { create } from 'zustand';
import { AIProvider } from '@/lib/constants/aiModels';

interface AgentState {
  agentProvider: AIProvider;
  agentModel: string;
  agentMaxSteps: number;
  agentTemperature: number;
  agentThinkingMode: boolean;
  agentInstruction: string;

  setAgentProvider: (provider: AIProvider) => void;
  setAgentModel: (model: string) => void;
  setAgentMaxSteps: (steps: number) => void;
  setAgentTemperature: (temp: number) => void;
  setAgentThinkingMode: (thinking: boolean) => void;
  setAgentInstruction: (instruction: string) => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  agentProvider: 'openai',
  agentModel: 'gpt-4o-mini',
  agentMaxSteps: 10,
  agentTemperature: 0.7,
  agentThinkingMode: false,
  agentInstruction: '',

  setAgentProvider: (provider) => set({ agentProvider: provider }),
  setAgentModel: (model) => set({ agentModel: model }),
  setAgentMaxSteps: (steps) => set({ agentMaxSteps: steps }),
  setAgentTemperature: (temp) => set({ agentTemperature: temp }),
  setAgentThinkingMode: (thinking) => set({ agentThinkingMode: thinking }),
  setAgentInstruction: (instruction) => set({ agentInstruction: instruction }),
}));
