/**
 * Email Finder Formula Encoding / Decoding
 *
 * The email-finder mode stores its config as a special formula string, exactly
 * like agentFormula.ts does for the AI search agent.
 *
 * Format:
 *   @email-finder: <provider>::<model>::<maxSteps>::<temperature>
 *   <lead context template with {ColumnName} placeholders>
 *
 * Example:
 *   @email-finder: openai::gpt-4o-mini::15::0.3
 *   {First Name} {Last Name}, {Job Title} at {Company}. Website: {Website}. LinkedIn: {LinkedIn URL}
 */

export interface EmailFinderFormulaConfig {
  provider: string;
  model: string;
  maxSteps: number;
  temperature: number;
  /** Lead context template — may contain {ColumnName} placeholders */
  context: string;
}

const HEADER_PREFIX = '@email-finder: ';

/**
 * Serialise email-finder config into a storable formula string.
 */
export function encodeEmailFinderFormula(config: EmailFinderFormulaConfig): string {
  const header = `${HEADER_PREFIX}${config.provider}::${config.model}::${config.maxSteps}::${config.temperature}`;
  return `${header}\n${config.context}`;
}

/**
 * Parse a formula string encoded with encodeEmailFinderFormula.
 * Returns null if the string is not an email-finder formula.
 */
export function decodeEmailFinderFormula(formula: string): EmailFinderFormulaConfig | null {
  if (!formula || !formula.startsWith(HEADER_PREFIX)) return null;

  const newlineIdx = formula.indexOf('\n');
  const headerLine = newlineIdx === -1 ? formula : formula.slice(0, newlineIdx);
  const context = newlineIdx === -1 ? '' : formula.slice(newlineIdx + 1);

  const meta = headerLine.slice(HEADER_PREFIX.length).trim();
  const parts = meta.split('::');
  if (parts.length < 3) return null;

  const [provider, model, stepsStr, tempStr] = parts;
  const maxSteps = parseInt(stepsStr, 10);
  const temperature = tempStr ? parseFloat(tempStr) : 0.3;

  return {
    provider: provider || 'openai',
    model: model || '',
    maxSteps: isNaN(maxSteps) ? 15 : maxSteps,
    temperature: isNaN(temperature) ? 0.3 : temperature,
    context: context.trim(),
  };
}

/**
 * Detect whether a formula string is an email-finder formula.
 */
export function isEmailFinderFormula(formula: string): boolean {
  return formula.trimStart().startsWith(HEADER_PREFIX);
}
