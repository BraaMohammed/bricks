import { create } from 'zustand';

interface PuppeteerState {
  puppeteerCode: string;
  puppeteerTimeout: number;
  puppeteerHeadless: boolean;
  puppeteerExecutionLog: string[];
  puppeteerLastResult: { type: 'success' | 'error'; message: string } | null;

  setPuppeteerCode: (code: string) => void;
  setPuppeteerTimeout: (timeout: number) => void;
  setPuppeteerHeadless: (headless: boolean) => void;
  setPuppeteerExecutionLog: (log: string[] | ((prev: string[]) => string[])) => void;
  setPuppeteerLastResult: (result: { type: 'success' | 'error'; message: string } | null) => void;
}

export const usePuppeteerStore = create<PuppeteerState>((set) => ({
  puppeteerCode: '',
  puppeteerTimeout: 30000,
  puppeteerHeadless: true,
  puppeteerExecutionLog: [],
  puppeteerLastResult: null,

  setPuppeteerCode: (code) => set({ puppeteerCode: code }),
  setPuppeteerTimeout: (timeout) => set({ puppeteerTimeout: timeout }),
  setPuppeteerHeadless: (headless) => set({ puppeteerHeadless: headless }),
  setPuppeteerExecutionLog: (log) => set((state) => ({ 
    puppeteerExecutionLog: typeof log === 'function' ? log(state.puppeteerExecutionLog) : log 
  })),
  setPuppeteerLastResult: (result) => set({ puppeteerLastResult: result }),
}));
