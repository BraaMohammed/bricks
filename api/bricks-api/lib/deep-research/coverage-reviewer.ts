/**
 * coverage-reviewer.ts
 *
 * The Coverage Reviewer judges whether the collected Records satisfy the goal
 * and asks for another search round when they do not.
 *
 * It is LLM-first (docs/adr/0005-llm-first-coverage-review.md): a record count
 * can be satisfied while the records themselves are wrong, and only judgement
 * catches that. The run's re-spin cap bounds cost.
 */

import { getDeepResearchModelCandidates } from './env';
import { waterfallJson } from './llm';
import { outputSchemaForPrompt } from './output-schema';
import type { OutputSchema, ResearchRecord } from './types';

export interface SourceDigest {
  sourceName: string;
  recordsFound: number;
  summary: string;
  error?: string;
}

export interface CoverageReviewInput {
  goal: string;
  outputSchema: OutputSchema;
  targetCount: number;
  records: ResearchRecord[];
  sourceDigests: SourceDigest[];
  reSpinNumber: number;
  maxRespins: number;
  model?: string;
}

export interface CoverageReviewResult {
  decision: 'sufficient' | 'research_more';
  reason: string;
  reSpinNumber: number;
}

const REVIEW_SYSTEM = `You are the Coverage Reviewer for Bricks' AI Deep Researcher.
Judge whether the collected Records actually satisfy the research goal and the
approved Output Schema. Be strict about relevance, completeness and honesty: a
large batch of wrong or thin Records is not sufficient.

Consider:
- Do the Records match the goal's entity type, geography, constraints and size?
- Does each Record have useful values for the Output Schema fields (not just a
  name if the goal needs more)?
- Are the Records real, distinct and plausible, or are they duplicates/filler?
- Is the target record count approximately met?

Return ONLY valid JSON:
{"decision":"sufficient"|"research_more","reason":"one or two concrete sentences"}

Use "research_more" only when another search round could realistically improve
the result. If the run is close but capped, still give your honest judgement.`;

function recordsDigest(records: ResearchRecord[]): string {
  const sample = records.slice(0, 40);
  return sample
    .map((record, index) => `${index + 1}. ${JSON.stringify(record)}`)
    .join('\n');
}

function parseDecision(
  value: unknown,
  input: CoverageReviewInput,
): CoverageReviewResult | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const rawDecision = String(
    record.decision ?? record.verdict ?? '',
  ).toLowerCase();

  const decision =
    rawDecision === 'sufficient'
      ? 'sufficient'
      : rawDecision === 'research_more' || rawDecision === 'research-more'
        ? 'research_more'
        : null;

  if (!decision) return null;

  const reason =
    typeof record.reason === 'string' && record.reason.trim()
      ? record.reason.trim()
      : decision === 'sufficient'
        ? 'The collected Records satisfy the goal.'
        : 'Another search round could improve coverage.';

  return { decision, reason, reSpinNumber: input.reSpinNumber };
}

/**
 * Runs the Coverage Reviewer. Provider outage falls back to `sufficient` with
 * an explicit reason so the run still completes with its partial table rather
 * than failing.
 */
export async function reviewCoverage(
  input: CoverageReviewInput,
): Promise<CoverageReviewResult> {
  const sourceDigest = input.sourceDigests
    .map(
      (digest) =>
        `- ${digest.sourceName}: ${digest.recordsFound} record(s). ${digest.summary}${digest.error ? ` Error: ${digest.error}` : ''}`,
    )
    .join('\n');

  const prompt = `Research goal:
${input.goal}

Output Schema:
${outputSchemaForPrompt(input.outputSchema)}

Target record count: ${input.targetCount}
Total Records collected: ${input.records.length}
Re-spin number: ${input.reSpinNumber} of ${input.maxRespins}

Search Sub-Agent results:
${sourceDigest || '(none)'}

Collected Records (up to 40 shown):
${recordsDigest(input.records) || '(none)'}

Review coverage and return JSON.`;

  try {
    const parsed = await waterfallJson({
      system: REVIEW_SYSTEM,
      prompt,
      temperature: 0.1,
      maxTokens: 700,
      models: getDeepResearchModelCandidates(input.model),
    });

    const result = parseDecision(parsed, input);
    if (result) return result;
  } catch (err) {
    console.warn(`  ⚠️ [deep-research] coverage review failed: ${String(err)}`);
  }

  return {
    decision: 'sufficient',
    reason:
      'The Coverage Reviewer was unavailable, so the run returns the Records collected so far.',
    reSpinNumber: input.reSpinNumber,
  };
}
