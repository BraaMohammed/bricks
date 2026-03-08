/**
 * Agent Formula Encoding / Decoding
 *
 * Agent mode stores its config as a special formula string so it integrates
 * seamlessly with the existing per-column formula storage.
 *
 * Format:
 *   @agent: <provider>::<model>::<maxSteps>
 *   <instruction template>
 *
 * Example:
 *   @agent: openai::gpt-4o-mini::10
 *   Find the CEO of {Company Name} at {Website}
 */

export interface AgentFormulaConfig {
  provider: string;
  model: string;
  maxSteps: number;
  instruction: string;
  temperature?: number;
  thinkingMode?: boolean;
}

const HEADER_PREFIX = '@agent: ';

/**
 * Serialise agent config into a storable formula string.
 */
export function encodeAgentFormula(config: AgentFormulaConfig): string {
  // Use a default temperature of 0.7 and false for thinkingMode if not provided, allowing strict backward compatibility if decoding
  const header = `${HEADER_PREFIX}${config.provider}::${config.model}::${config.maxSteps}::${config.temperature ?? 0.7}::${config.thinkingMode ? 'true' : 'false'}`;
  return `${header}\n${config.instruction}`;
}

/**
 * Parse a formula string that was previously encoded with encodeAgentFormula.
 * Returns null if the string is not an agent formula.
 */
export function decodeAgentFormula(formula: string): AgentFormulaConfig | null {
  if (!formula || !formula.startsWith(HEADER_PREFIX)) return null;

  const newlineIdx = formula.indexOf('\n');
  const headerLine = newlineIdx === -1 ? formula : formula.slice(0, newlineIdx);
  const instruction = newlineIdx === -1 ? '' : formula.slice(newlineIdx + 1);

  const meta = headerLine.slice(HEADER_PREFIX.length).trim();
  const parts = meta.split('::');
  if (parts.length < 3) return null;

  const [provider, model, stepsStr, tempStr, thinkingStr] = parts;
  const maxSteps = parseInt(stepsStr, 10);

  // Backwards compatibility for formulas saved before temperature/thinking were added
  const temperature = tempStr ? parseFloat(tempStr) : 0.7;
  const thinkingMode = thinkingStr === 'true';

  return {
    provider: provider || 'openai',
    model: model || '',
    maxSteps: isNaN(maxSteps) ? 10 : maxSteps,
    instruction: instruction.trim(),
    temperature: isNaN(temperature) ? 0.7 : temperature,
    thinkingMode,
  };
}

/**
 * Detect whether a formula string is an agent formula.
 */
export function isAgentFormula(formula: string): boolean {
  return formula.trimStart().startsWith(HEADER_PREFIX);
}
