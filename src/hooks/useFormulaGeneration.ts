/**
 * useFormulaGeneration Hook
 * 
 * Provides functions to generate formula code for different modes.
 * Acts as a bridge between UI components and formula generator utilities.
 */

import { useCallback } from 'react';
import {
  generateAIFormulaCode,
  generateFirecrawlFormulaCode,
  generateAIAgentsFormulaCode,
  generatePuppeteerFormulaCode,
  AIFormulaParams,
  AIAgentsConfig,
  PuppeteerConfig,
} from '@/lib/generators/formulaGenerators';

export interface FormulaGenerators {
  generateAIFormula: (params: AIFormulaParams) => string;
  generateFirecrawlFormula: (urlTemplate: string) => string;
  generateAIAgentsFormula: (config: AIAgentsConfig) => string;
  generatePuppeteerFormula: (config: PuppeteerConfig) => string;
}

/**
 * Hook for generating formula code for different modes
 * 
 * @returns Object with generator functions for each formula type
 */
export const useFormulaGeneration = (): FormulaGenerators => {
  /**
   * Generate AI formula code
   */
  const generateAIFormula = useCallback((params: AIFormulaParams): string => {
    console.log('🔧 Generating AI formula with parameters:', {
      prompt: params.prompt.substring(0, 50) + '...',
      model: params.model,
      provider: params.provider,
      thinkingMode: params.thinkingMode
    });

    try {
      const formula = generateAIFormulaCode(params);
      console.log('✅ Successfully generated AI formula');
      
      // Validate the generated JavaScript syntax
      try {
        new Function('row', formula);
        console.log('✅ Generated formula has valid JavaScript syntax');
      } catch (syntaxError) {
        console.error('❌ Generated formula has invalid JavaScript syntax:', syntaxError);
        throw new Error(`Generated formula has invalid syntax: ${syntaxError.message}`);
      }
      
      return formula;
    } catch (error) {
      console.error('❌ Error generating AI formula:', error);
      throw error;
    }
  }, []);

  /**
   * Generate Firecrawl formula code
   */
  const generateFirecrawlFormula = useCallback((urlTemplate: string): string => {
    console.log('🔧 Generating Firecrawl formula for URL:', urlTemplate);
    
    try {
      const formula = generateFirecrawlFormulaCode(urlTemplate);
      console.log('✅ Successfully generated Firecrawl formula');
      return formula;
    } catch (error) {
      console.error('❌ Error generating Firecrawl formula:', error);
      throw error;
    }
  }, []);

  /**
   * Generate AI Agents formula code
   */
  const generateAIAgentsFormula = useCallback((config: AIAgentsConfig): string => {
    console.log('🔧 Generating AI Agents formula with config:', {
      messageCreatorModel: config.messageCreatorModel,
      leadRoleplayModel: config.leadRoleplayModel,
      maxIterations: config.maxIterations
    });
    
    try {
      const formula = generateAIAgentsFormulaCode(config);
      console.log('✅ Successfully generated AI Agents formula');
      return formula;
    } catch (error) {
      console.error('❌ Error generating AI Agents formula:', error);
      throw error;
    }
  }, []);

  /**
   * Generate Puppeteer formula code
   */
  const generatePuppeteerFormula = useCallback((config: PuppeteerConfig): string => {
    console.log('🔧 Generating Puppeteer formula with config:', {
      codeLength: config.code.length,
      timeout: config.timeout,
      headless: config.headless
    });
    
    try {
      const formula = generatePuppeteerFormulaCode(config.code, config.timeout, config.headless);
      console.log('✅ Successfully generated Puppeteer formula');
      return formula;
    } catch (error) {
      console.error('❌ Error generating Puppeteer formula:', error);
      throw error;
    }
  }, []);

  return {
    generateAIFormula,
    generateFirecrawlFormula,
    generateAIAgentsFormula,
    generatePuppeteerFormula,
  };
};
