/**
 * POST /api/deep-research/run
 *
 * Starts a Deep Research Run with the user-approved Output Schema and streams
 * its events as SSE. Each event is one `data: {JSON}\n\n` line shaped
 * `{event:'<name>', ...payload}`.
 *
 * Body: { runId, outputSchema, targetCount? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getDeepResearchCaps,
  getDefaultTargetCount,
} from '../../../../lib/deep-research/env';
import {
  registerRunListener,
  unregisterRunListener,
} from '../../../../lib/deep-research/event-bus';
import { parseOutputSchema } from '../../../../lib/deep-research/output-schema';
import { executeDeepResearchRun } from '../../../../lib/deep-research/pipeline';
import { getRun, updateRun } from '../../../../lib/deep-research/repository';

export const runtime = 'nodejs';
export const maxDuration = 900;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const runBodySchema = z.object({
  runId: z.string().uuid(),
  outputSchema: z.unknown(),
  targetCount: z.number().int().positive().optional(),
});

export async function POST(request: NextRequest): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400, headers: corsHeaders },
    );
  }

  const parsed = runBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid body: expected { runId, outputSchema, targetCount? }',
        issues: parsed.error.issues,
      },
      { status: 400, headers: corsHeaders },
    );
  }

  const { runId } = parsed.data;
  const outputSchema = parseOutputSchema(parsed.data.outputSchema);
  if (!outputSchema) {
    return NextResponse.json(
      { error: 'outputSchema must contain at least one valid field' },
      { status: 400, headers: corsHeaders },
    );
  }

  const run = await getRun(runId);
  if (!run) {
    return NextResponse.json(
      { error: `Deep Research Run not found: ${runId}` },
      { status: 404, headers: corsHeaders },
    );
  }

  const caps = getDeepResearchCaps();
  const targetCount = Math.min(
    caps.maxRecords,
    parsed.data.targetCount ?? getDefaultTargetCount(caps.maxRecords),
  );

  await updateRun(runId, {
    outputSchema,
    status: 'researching',
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
        );
      };

      registerRunListener(runId, send);

      void executeDeepResearchRun({
        runId,
        goal: run.goal,
        outputSchema,
        targetCount,
      }).finally(() => {
        unregisterRunListener(runId);
        try {
          controller.close();
        } catch {
          // Already closed/cancelled by the client.
        }
      });
    },

    cancel() {
      unregisterRunListener(runId);
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

export async function OPTIONS(): Promise<Response> {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}
