/**
 * Formula Editor Modes Configuration
 * 
 * Central location for all formula editor mode definitions.
 * 
 * ==========================================
 * TO ADD A NEW MODE:
 * ==========================================
 * 1. Add entry to MODES array below
 * 2. Create mode editor component in src/components/FormulaEditor/modes/
 * 3. Add mode case to formula generation logic in src/lib/generators/formulaGenerators.ts
 * 4. Add TabsContent in FormulaEditor.tsx
 */

import { Code, Brain, Wand2, Users, Bot, Search, Mail } from 'lucide-react';

/**
 * Formula editor modes configuration
 */
export const MODES = [
  {
    id: 'code',
    name: 'Code Mode',
    icon: Code,
    description: 'Write custom JavaScript formulas with full access to row data',
    requiresApiKey: false,
  },
  {
    id: 'ai',
    name: 'AI Mode',
    icon: Brain,
    description: 'Generate content using AI models with prompts and context',
    requiresApiKey: true,
  },
  {
    id: 'firecrawl',
    name: 'Firecrawl Mode',
    icon: Wand2,
    description: 'Scrape websites and convert to LLM-ready markdown',
    requiresApiKey: true,
  },
  {
    id: 'ai-agents',
    name: 'AI Copy Agents',
    icon: Users,
    description: 'Dual-agent system for creating and validating personalized messages',
    requiresApiKey: true,
  },
  {
    id: 'puppeteer',
    name: 'Puppeteer Mode',
    icon: Bot,
    description: 'Browser automation for complex web scraping and interactions',
    requiresApiKey: false,
  },
  {
    id: 'agent',
    name: 'AI Agent',
    icon: Search,
    description: 'Autonomous web research agent — search the web and extract structured data row by row',
    requiresApiKey: true,
  },
  {
    id: 'email-finder',
    name: 'Email Finder',
    icon: Mail,
    description: 'AI agent that autonomously finds and validates email addresses for cold outreach',
    requiresApiKey: true,
  },
] as const;

/**
 * Formula mode type - automatically derived from MODES array
 */
export type FormulaMode = typeof MODES[number]['id'];

/**
 * Helper function to get mode metadata by id
 */
export function getModeById(modeId: FormulaMode) {
  return MODES.find(mode => mode.id === modeId);
}

/**
 * Helper function to check if a mode requires API key
 */
export function modeRequiresApiKey(modeId: FormulaMode): boolean {
  const mode = getModeById(modeId);
  return mode?.requiresApiKey ?? false;
}

/**
 * Get all mode IDs as array
 */
export function getAllModeIds(): FormulaMode[] {
  return MODES.map(mode => mode.id) as FormulaMode[];
}
