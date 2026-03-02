/**
 * useFormulaMode Hook
 * 
 * Manages formula editor mode state and mode detection.
 * Handles switching between different formula types and initializing mode-specific defaults.
 */

import { useState, useEffect, useCallback } from 'react';
import { isAgentFormula } from '@/lib/agents/agentFormula';

export type FormulaMode = 'code' | 'ai' | 'firecrawl' | 'ai-agents' | 'puppeteer' | 'agent';

export interface FormulaModeHook {
  mode: FormulaMode;
  setMode: (mode: FormulaMode) => void;
  detectModeFromFormula: (formula: string) => FormulaMode;
  initializeModeDefaults: (mode: FormulaMode, currentValues: any) => any;
}

/**
 * Hook for managing formula editor mode
 * 
 * @param initialMode - Optional initial mode (defaults to 'code')
 * @returns Object with mode state and management functions
 */
export const useFormulaMode = (initialMode: FormulaMode = 'code'): FormulaModeHook => {
  const [mode, setModeState] = useState<FormulaMode>(initialMode);

  /**
   * Detect mode from existing formula code
   */
  const detectModeFromFormula = useCallback((formula: string): FormulaMode => {
    if (!formula || !formula.trim()) {
      return 'code';
    }

    // Check for AI Agent (must be checked before other AI patterns)
    if (isAgentFormula(formula)) {
      console.log('🔍 Detected AI Agent mode from formula');
      return 'agent';
    }

    // Check for AI Copy Agents
    if (formula.includes('AI Copy Agents') || formula.includes('runAIAgents')) {
      console.log('🤖 Detected AI Agents mode from formula');
      return 'ai-agents';
    }

    // Check for Puppeteer
    if (formula.includes('Puppeteer Generated Formula') || formula.includes('puppeteerCode')) {
      console.log('🎭 Detected Puppeteer mode from formula');
      return 'puppeteer';
    }

    // Check for Firecrawl
    if (formula.includes('Firecrawl') || formula.includes('firecrawl_api_key')) {
      console.log('🔥 Detected Firecrawl mode from formula');
      return 'firecrawl';
    }

    // Check for AI formula (OpenAI, Ollama, or Gemini)
    if (
      formula.includes('openai_api_key') ||
      formula.includes('gemini_api_key') ||
      formula.includes('localhost:11434') ||
      formula.includes('generativelanguage.googleapis.com')
    ) {
      console.log('🤖 Detected AI mode from formula');
      return 'ai';
    }

    // Default to code mode
    console.log('💻 Using Code mode (default)');
    return 'code';
  }, []);

  /**
   * Initialize mode-specific defaults
   */
  const initializeModeDefaults = useCallback((
    targetMode: FormulaMode,
    currentValues: any
  ): any => {
    const defaults: any = {};

    switch (targetMode) {
      case 'ai':
        if (!currentValues.aiPrompt) {
          defaults.aiPrompt = 'Analyze this data and provide insights';
        }
        break;

      case 'firecrawl':
        if (!currentValues.firecrawlUrl) {
          defaults.firecrawlUrl = '';
        }
        break;

      case 'ai-agents':
        if (!currentValues.userOfferDetails) {
          defaults.userOfferDetails = '';
        }
        if (!currentValues.messageCreatorInstructions) {
          defaults.messageCreatorInstructions = '';
        }
        if (!currentValues.leadRoleplayInstructions) {
          defaults.leadRoleplayInstructions = '';
        }
        break;

      case 'puppeteer':
        if (!currentValues.puppeteerCode) {
          defaults.puppeteerCode = 
            '// Enter your Puppeteer automation code here\n' +
            '// Example: Get page title\n' +
            'await page.goto("{URL}");\n' +
            'return await page.title();';
        }
        break;

      case 'agent':
        if (!currentValues.agentInstruction) {
          defaults.agentInstruction = '';
        }
        break;

      case 'code':
      default:
        // No defaults needed for code mode
        break;
    }

    return defaults;
  }, []);

  /**
   * Set mode with logging
   */
  const setMode = useCallback((newMode: FormulaMode) => {
    console.log(`🔄 Switching formula mode: ${mode} → ${newMode}`);
    setModeState(newMode);
  }, [mode]);

  return {
    mode,
    setMode,
    detectModeFromFormula,
    initializeModeDefaults,
  };
};
