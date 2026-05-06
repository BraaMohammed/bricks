import { create } from 'zustand';

import type { AIProvider } from '@/lib/constants/aiModels';

interface AIAgentsState {
  creatorProvider: AIProvider;
  roleplayProvider: AIProvider;
  messageCreatorModel: string;
  leadRoleplayModel: string;
  messageCreatorThinking: boolean;
  leadRoleplayThinking: boolean;
  messageCreatorInstructions: string;
  leadRoleplayInstructions: string;
  maxIterations: number;

  setCreatorProvider: (provider: AIProvider) => void;
  setRoleplayProvider: (provider: AIProvider) => void;
  setMessageCreatorModel: (model: string) => void;
  setLeadRoleplayModel: (model: string) => void;
  setMessageCreatorThinking: (thinking: boolean) => void;
  setLeadRoleplayThinking: (thinking: boolean) => void;
  setMessageCreatorInstructions: (instructions: string) => void;
  setLeadRoleplayInstructions: (instructions: string) => void;
  setMaxIterations: (iterations: number) => void;
}

export const useAIAgentsStore = create<AIAgentsState>((set) => ({
  creatorProvider: 'openai',
  roleplayProvider: 'openai',
  messageCreatorModel: 'gpt-4o-mini',
  leadRoleplayModel: 'gpt-4o-mini',
  messageCreatorThinking: false,
  leadRoleplayThinking: false,
  messageCreatorInstructions: '',
  leadRoleplayInstructions: '',
  maxIterations: 5,

  setCreatorProvider: (provider) => set({ creatorProvider: provider }),
  setRoleplayProvider: (provider) => set({ roleplayProvider: provider }),
  setMessageCreatorModel: (model) => set({ messageCreatorModel: model }),
  setLeadRoleplayModel: (model) => set({ leadRoleplayModel: model }),
  setMessageCreatorThinking: (thinking) => set({ messageCreatorThinking: thinking }),
  setLeadRoleplayThinking: (thinking) => set({ leadRoleplayThinking: thinking }),
  setMessageCreatorInstructions: (instructions) => set({ messageCreatorInstructions: instructions }),
  setLeadRoleplayInstructions: (instructions) => set({ leadRoleplayInstructions: instructions }),
  setMaxIterations: (iterations) => set({ maxIterations: iterations }),
}));
