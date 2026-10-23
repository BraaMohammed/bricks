/**
 * echo-workflow.ts
 *
 * A minimal one-step Mastra workflow used to prove the orchestration engine
 * boots and persists a Deep Research Run locally. It echoes its input.
 *
 * Placeholder for the real Orchestrator workflow
 * (docs/adr/0001-agent-orchestration-server-side-mastra.md).
 */

import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

const echoStep = createStep({
  id: 'echo-step',
  inputSchema: z.object({ message: z.string() }),
  outputSchema: z.object({ echo: z.string() }),
  execute: async ({ inputData }) => ({ echo: inputData.message }),
});

export const echoWorkflow = createWorkflow({
  id: 'deep-research-echo',
  inputSchema: z.object({ message: z.string() }),
  outputSchema: z.object({ echo: z.string() }),
})
  .then(echoStep)
  .commit();
