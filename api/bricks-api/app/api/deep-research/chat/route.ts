/**
 * POST /api/deep-research/chat
 *
 * The Clarify step of a Deep Research Run. The Orchestrator either asks one
 * clarifying question or proposes the Output Schema (with 3 fake sample rows
 * and Identity Columns) for the user to approve.
 *
 * Body: { runId?: string|null, messages: {role:'user'|'assistant',content:string}[] }
 * Res:  { runId, reply: {kind:'clarification',text} |
 *                        {kind:'output_schema_proposal',text,outputSchema} }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { proposeOrClarify, type ChatTurn } from '../../../../lib/deep-research/orchestrator';
import {
  appendRunMessage,
  createRun,
  getRun,
  replaceRunMessages,
  updateRun,
} from '../../../../lib/deep-research/repository';

export const runtime = 'nodejs';
export const maxDuration = 120;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const chatBodySchema = z.object({
  runId: z.string().uuid().nullish(),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1),
      }),
    )
    .min(1),
  model: z.string().min(1).max(200).optional(),
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

  const parsed = chatBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid body: expected { runId?, messages: [{role,content}] }',
        issues: parsed.error.issues,
      },
      { status: 400, headers: corsHeaders },
    );
  }

  const { runId: requestedRunId, messages, model } = parsed.data;
  const turns: ChatTurn[] = messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));

  try {
    const existing = requestedRunId ? await getRun(requestedRunId) : null;

    const firstUserMessage =
      messages.find((message) => message.role === 'user')?.content ??
      messages[0].content;
    const goal = firstUserMessage.trim().slice(0, 2_000);

    const run = existing ?? (await createRun(goal));
    if (existing && !existing.goal.trim() && goal) {
      await updateRun(run.id, { goal });
    }

    await replaceRunMessages(run.id, turns);

    const result = await proposeOrClarify(turns, model);

    await updateRun(run.id, {
      status: result.proposed ? 'schema_proposed' : 'clarifying',
      ...(result.reply.kind === 'output_schema_proposal'
        ? { outputSchema: result.reply.outputSchema }
        : {}),
    });

    await appendRunMessage(run.id, {
      role: 'assistant',
      content: result.reply.text,
    });

    return NextResponse.json(
      { runId: run.id, reply: result.reply },
      { headers: corsHeaders },
    );
  } catch (err) {
    console.error('💥 [deep-research] chat failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500, headers: corsHeaders },
    );
  }
}

export async function OPTIONS(): Promise<Response> {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}
