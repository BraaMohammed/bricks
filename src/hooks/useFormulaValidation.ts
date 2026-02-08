/**
 * useFormulaValidation Hook
 * 
 * Validates formulas based on mode and checks required fields.
 * Provides mode-specific validation logic and error messages.
 */

import { useCallback } from 'react';
import { validateFormula } from '@/components/FormulaValidator';
import type { FormulaMode } from './useFormulaMode';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface FormulaValidationParams {
  mode: FormulaMode;
  formula?: string;
  headers?: string[];
  aiPrompt?: string;
  aiProvider?: 'openai' | 'ollama' | 'gemini' | 'groq';
  ollamaConnected?: boolean;
  ollamaModels?: string[];
  firecrawlUrl?: string;
  userOfferDetails?: string;
  hasOpenAIKey?: boolean;
  hasGeminiKey?: boolean;
  hasGroqKey?: boolean;
  hasFirecrawlKey?: boolean;
}

export interface FormulaValidationHook {
  validateForSave: (params: FormulaValidationParams) => ValidationResult;
}

/**
 * Hook for validating formulas based on mode
 * 
 * @returns Object with validation functions
 */
export const useFormulaValidation = (): FormulaValidationHook => {
  /**
   * Validate formula before save based on mode
   */
  const validateForSave = useCallback((params: FormulaValidationParams): ValidationResult => {
    const {
      mode,
      formula = '',
      headers = [],
      aiPrompt,
      aiProvider,
      ollamaConnected,
      ollamaModels = [],
      firecrawlUrl,
      userOfferDetails,
      hasOpenAIKey,
      hasGeminiKey,
      hasGroqKey,
      hasFirecrawlKey,
    } = params;

    const errors: string[] = [];

    switch (mode) {
      case 'code': {
        // Validate formula syntax
        const validation = validateFormula(formula, headers);
        if (!validation.isValid) {
          errors.push('Please fix the formula errors before saving.');
        }
        break;
      }

      case 'ai':
        // Check for prompt
        if (!aiPrompt || !aiPrompt.trim()) {
          errors.push('Please enter a prompt for the AI.');
        }

        // Check provider-specific requirements
        if (aiProvider === 'openai') {
          if (!hasOpenAIKey) {
            errors.push('Please set your OpenAI API key in AI Settings.');
          }
        } else if (aiProvider === 'gemini') {
          if (!hasGeminiKey) {
            errors.push('Please set your Gemini API key in AI Settings.');
          }
        } else if (aiProvider === 'groq') {
          if (!hasGroqKey) {
            errors.push('Please set your Groq API key in AI Settings.');
          }
        } else if (aiProvider === 'ollama') {
          if (!ollamaConnected) {
            errors.push('Ollama is not running. Please start Ollama and refresh connection.');
          }
          if (ollamaModels.length === 0) {
            errors.push('No Ollama models installed. Run "ollama pull llama2" to install a model.');
          }
        }
        break;

      case 'firecrawl':
        // Check for URL template
        if (!firecrawlUrl || !firecrawlUrl.trim()) {
          errors.push('Please enter a URL template for Firecrawl.');
        }

        // Check for API key
        if (!hasFirecrawlKey) {
          errors.push('Please set your Firecrawl API key in AI Settings.');
        }
        break;

      case 'ai-agents':
        // Check for offer details
        if (!userOfferDetails || !userOfferDetails.trim()) {
          errors.push('Please enter your offer details for the AI agents.');
        }

        // Note: Model validation is handled separately in the actual save handler
        // as it needs to check if models are Ollama and if they're available
        break;

      case 'puppeteer':
        // Puppeteer mode validation is disabled in the original code
        // No validation needed
        break;

      default:
        errors.push('Unknown formula mode.');
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, []);

  return {
    validateForSave,
  };
};
