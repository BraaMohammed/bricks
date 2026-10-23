/**
 * workflow.ts
 *
 * The Mastra workflow for one Deep Research Run:
 *
 *   Orchestrator plans Research Sources
 *     → Search Sub-Agents in parallel, round by round
 *     → Coverage Reviewer (LLM-first, hard re-spin cap)
 *     → Table Builder (assemble, dedupe, persist)
 *
 * Caps yield partial results plus a completed run, never a failed one.
 * See docs/adr/0001-agent-orchestration-server-side-mastra.md and
 * docs/adr/0005-llm-first-coverage-review.md.
 */

import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { getDeepResearchCaps } from './env';
import { emitRunEvent } from './event-bus';
import { streamOpeningBrief, planResearchSources } from './orchestrator';
import {
  reviewCoverage,
  type CoverageReviewResult,
  type SourceDigest,
} from './coverage-reviewer';
import { runSearchSubAgent } from './search-sub-agent';
import { buildTable } from './table-builder';
import type { OutputSchema, ResearchRecord } from './types';

// ── Schemas ───────────────────────────────────────────────────────────────────

const outputSchemaZ = z.object({
  fields: z.array(
    z.object({ name: z.string(), description: z.string() }),
  ),
  identityColumns: z.array(z.string()),
  sampleRows: z.array(z.record(z.string(), z.string())),
});

const runInputSchema = z.object({
  runId: z.string(),
  goal: z.string(),
  outputSchema: outputSchemaZ,
  targetCount: z.number().int().positive(),
});

const sourceAssignmentZ = z.object({
  agentId: z.string(),
  sourceName: z.string(),
  name: z.string(),
  label: z.string(),
  description: z.string(),
  instructions: z.string(),
  queryHint: z.string(),
});

const planOutputSchema = z.object({
  runId: z.string(),
  goal: z.string(),
  outputSchema: outputSchemaZ,
  targetCount: z.number().int().positive(),
  sources: z.array(sourceAssignmentZ),
  startedAt: z.number(),
  deadline: z.number(),
});

const sourceDigestZ = z.object({
  sourceName: z.string(),
  recordsFound: z.number().int().nonnegative(),
  summary: z.string(),
  error: z.string().optional(),
});

const coverageSchema = z.object({
  decision: z.enum(['sufficient', 'research_more']),
  reason: z.string(),
  reSpinNumber: z.number().int().nonnegative(),
});

const researchOutputSchema = z.object({
  runId: z.string(),
  goal: z.string(),
  outputSchema: outputSchemaZ,
  targetCount: z.number().int().positive(),
  sources: z.array(sourceAssignmentZ),
  startedAt: z.number(),
  deadline: z.number(),
  records: z.array(z.record(z.string(), z.string())),
  sourceDigests: z.array(sourceDigestZ),
  coverage: coverageSchema,
});

const tableOutputSchema = z.object({
  records: z.array(z.record(z.string(), z.string())),
  totalRecords: z.number().int().nonnegative(),
});

// ── Step: Orchestrator plans Research Sources ────────────────────────────────

const planSourcesStep = createStep({
  id: 'orchestrator-plan-research-sources',
  inputSchema: runInputSchema,
  outputSchema: planOutputSchema,
  execute: async ({ inputData }) => {
    const caps = getDeepResearchCaps();
    const startedAt = Date.now();
    const deadline = startedAt + caps.maxWallClockMs;

    const outputSchema = inputData.outputSchema as OutputSchema;

    const sources = await planResearchSources({
      goal: inputData.goal,
      outputSchema,
    });

    emitRunEvent(inputData.runId, {
      event: 'deep_research_started',
      runId: inputData.runId,
      sources: sources.map((source) => ({
        agentId: source.agentId,
        sourceName: source.sourceName,
      })),
    });

    await streamOpeningBrief({
      goal: inputData.goal,
      outputSchema,
      sources,
      onTextDelta: (text) =>
        emitRunEvent(inputData.runId, {
          event: 'orchestrator_token_delta',
          text,
        }),
    });

    return {
      runId: inputData.runId,
      goal: inputData.goal,
      outputSchema,
      targetCount: inputData.targetCount,
      sources,
      startedAt,
      deadline,
    };
  },
});

// ── Step: Search Sub-Agents in parallel + Coverage Reviewer ─────────────────

const researchRoundsStep = createStep({
  id: 'search-sub-agents-and-coverage-review',
  inputSchema: planOutputSchema,
  outputSchema: researchOutputSchema,
  execute: async ({ inputData }) => {
    const caps = getDeepResearchCaps();
    const outputSchema = inputData.outputSchema as OutputSchema;
    const maxRounds = caps.maxRespins + 1;

    const collected: unknown[] = [];
    const digestsBySource = new Map<string, SourceDigest>();

    let coverage: CoverageReviewResult = {
      decision: 'sufficient',
      reason: 'The wall-clock cap was reached before a coverage review.',
      reSpinNumber: 0,
    };
    let reviewCompleted = false;

    for (let round = 0; round < maxRounds; round++) {
      const remaining = inputData.deadline - Date.now();
      if (remaining < 2_000) break;

      const agentCount = Math.max(1, inputData.sources.length);
      const perAgentTarget = Math.max(
        1,
        Math.ceil(inputData.targetCount / agentCount),
      );

      const results = await Promise.all(
        inputData.sources.map((assignment) =>
          runSearchSubAgent({
            runId: inputData.runId,
            goal: inputData.goal,
            outputSchema,
            assignment,
            recordTarget: perAgentTarget,
            maxToolCalls: caps.maxToolCallsPerSubAgent,
            round,
            reSpinNumber: round,
            coverateFeedback:
              round === 0 ? undefined : coverage.reason,
            deadline: inputData.deadline,
          }),
        ),
      );

      for (const result of results) {
        collected.push(...result.records);

        const digest = digestsBySource.get(result.sourceName);
        if (digest) {
          digest.recordsFound += result.records.length;
          if (result.summary) digest.summary = result.summary;
          if (result.error) digest.error = result.error;
        } else {
          digestsBySource.set(result.sourceName, {
            sourceName: result.sourceName,
            recordsFound: result.records.length,
            summary: result.summary,
            ...(result.error ? { error: result.error } : {}),
          });
        }
      }

      coverage = await reviewCoverage({
        goal: inputData.goal,
        outputSchema,
        targetCount: inputData.targetCount,
        records: collected as ResearchRecord[],
        sourceDigests: [...digestsBySource.values()],
        reSpinNumber: round,
        maxRespins: caps.maxRespins,
      });
      reviewCompleted = true;

      emitRunEvent(inputData.runId, {
        event: 'coverage_review_completed',
        decision: coverage.decision,
        reason: coverage.reason,
        reSpinNumber: coverage.reSpinNumber,
      });

      if (coverage.decision === 'sufficient') break;
      if (round >= maxRounds - 1) break;
      if (inputData.deadline - Date.now() < 5_000) break;
    }

    if (!reviewCompleted) {
      emitRunEvent(inputData.runId, {
        event: 'coverage_review_completed',
        decision: coverage.decision,
        reason: coverage.reason,
        reSpinNumber: coverage.reSpinNumber,
      });
    }

    return {
      runId: inputData.runId,
      goal: inputData.goal,
      outputSchema,
      targetCount: inputData.targetCount,
      sources: inputData.sources,
      startedAt: inputData.startedAt,
      deadline: inputData.deadline,
      records: collected as ResearchRecord[],
      sourceDigests: [...digestsBySource.values()],
      coverage,
    };
  },
});

// ── Step: Table Builder ──────────────────────────────────────────────────────

const tableBuilderStep = createStep({
  id: 'table-builder',
  inputSchema: researchOutputSchema,
  outputSchema: tableOutputSchema,
  execute: async ({ inputData }) => {
    const result = await buildTable({
      runId: inputData.runId,
      outputSchema: inputData.outputSchema as OutputSchema,
      targetCount: inputData.targetCount,
      records: inputData.records,
    });

    return {
      records: result.records,
      totalRecords: result.totalRecords,
    };
  },
});

// ── Workflow ─────────────────────────────────────────────────────────────────

export const deepResearchWorkflow = createWorkflow({
  id: 'deep-research-run',
  inputSchema: runInputSchema,
  outputSchema: tableOutputSchema,
})
  .then(planSourcesStep)
  .then(researchRoundsStep)
  .then(tableBuilderStep)
  .commit();

export type DeepResearchWorkflowInput = z.infer<typeof runInputSchema>;
export type DeepResearchWorkflowOutput = z.infer<typeof tableOutputSchema>;
