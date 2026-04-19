import { create } from 'zustand';

interface FirecrawlState {
  firecrawlUrl: string;
  setFirecrawlUrl: (url: string) => void;
}

export const useFirecrawlStore = create<FirecrawlState>((set) => ({
  firecrawlUrl: '',
  setFirecrawlUrl: (url) => set({ firecrawlUrl: url }),
}));
