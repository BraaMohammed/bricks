/**
 * Error Detector Utility
 *
 * Detects whether a cell's content indicates a failed/errored execution.
 * Uses substring matching — so a cell containing "some error occurred" WILL
 * be flagged even though the full content doesn't equal "error" exactly.
 */

/**
 * Default list of error keywords to check against.
 * These are case-insensitive substring matches.
 */
export const DEFAULT_ERROR_KEYWORDS: string[] = [
  'error',
  'failed',
  'failure',
  'exception',
  'undefined',
  'null',
  'n/a',
  'not found',
  'no result',
  'no data',
  'timeout',
  'timed out',
  'rate limit',
  '429',
  '500',
  '503',
  'could not',
  "couldn't",
  'unable to',
  'invalid',
  '[error]',
  '#error',
  '#n/a',
];

/**
 * Check whether a cell's content contains any of the given error keywords.
 *
 * @param cellContent - The raw string value stored in the cell.
 * @param keywords    - List of error keywords to search for (defaults to DEFAULT_ERROR_KEYWORDS).
 * @returns true if the cell content contains at least one keyword (case-insensitive substring match).
 *
 * @example
 * cellHasError('some error occurred during fetch', ['error']) // → true
 * cellHasError('john@example.com', DEFAULT_ERROR_KEYWORDS)   // → false
 * cellHasError('Rate limit exceeded (429)', ['429', 'rate limit']) // → true
 */
export function cellHasError(
  cellContent: string | null | undefined,
  keywords: string[] = DEFAULT_ERROR_KEYWORDS,
): boolean {
  if (!cellContent || cellContent.trim() === '') {
    // Treat empty / missing cells as needing re-execution
    return true;
  }

  const normalised = cellContent.toLowerCase();
  return keywords.some((keyword) => normalised.includes(keyword.toLowerCase()));
}
