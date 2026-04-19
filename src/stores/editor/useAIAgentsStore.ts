import { create } from 'zustand';

interface AIAgentsState {
  userOfferDetails: string;
  messageCreatorModel: string;
  leadRoleplayModel: string;
  messageCreatorThinking: boolean;
  leadRoleplayThinking: boolean;
  messageCreatorInstructions: string;
  leadRoleplayInstructions: string;
  maxIterations: number;

  setUserOfferDetails: (details: string) => void;
  setMessageCreatorModel: (model: string) => void;
  setLeadRoleplayModel: (model: string) => void;
  setMessageCreatorThinking: (thinking: boolean) => void;
  setLeadRoleplayThinking: (thinking: boolean) => void;
  setMessageCreatorInstructions: (instructions: string) => void;
  setLeadRoleplayInstructions: (instructions: string) => void;
  setMaxIterations: (iterations: number) => void;
}

export const useAIAgentsStore = create<AIAgentsState>((set) => ({
  userOfferDetails: '',
  messageCreatorModel: 'gpt-4o-mini',
  leadRoleplayModel: 'gpt-4o-mini',
  messageCreatorThinking: false,
  leadRoleplayThinking: false,
  messageCreatorInstructions: '',
  leadRoleplayInstructions: '',
  maxIterations: 5,

  setUserOfferDetails: (details) => set({ userOfferDetails: details }),
  setMessageCreatorModel: (model) => set({ messageCreatorModel: model }),
  setLeadRoleplayModel: (model) => set({ leadRoleplayModel: model }),
  setMessageCreatorThinking: (thinking) => set({ messageCreatorThinking: thinking }),
  setLeadRoleplayThinking: (thinking) => set({ leadRoleplayThinking: thinking }),
  setMessageCreatorInstructions: (instructions) => set({ messageCreatorInstructions: instructions }),
  setLeadRoleplayInstructions: (instructions) => set({ leadRoleplayInstructions: instructions }),
  setMaxIterations: (iterations) => set({ maxIterations: iterations }),
}));
