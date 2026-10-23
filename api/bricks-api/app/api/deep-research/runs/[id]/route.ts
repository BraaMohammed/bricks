/**
 * GET /api/deep-research/runs/[id]
 *
 * Returns the persisted Deep Research Run, its messages and its Records.
 */

import { NextResponse } from 'next/server';
import {
  getRunMessages,
  getRun,
  getRunRecords,
} from '../../../../../lib/deep-research/repository';

export const runtime = 'nodejs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;

  if (!UUID_RE.test(id)) {
    return NextResponse.json(
      { error: 'Invalid Deep Research Run ID' },
      { status: 400, headers: corsHeaders },
    );
  }

  try {
    const run = await getRun(id);
    if (!run) {
      return NextResponse.json(
        { error: `Deep Research Run not found: ${id}` },
        { status: 404, headers: corsHeaders },
      );
    }

    const [messages, records] = await Promise.all([
      getRunMessages(id),
      getRunRecords(id),
    ]);

    return NextResponse.json(
      {
        run: {
          id: run.id,
          goal: run.goal,
          status: run.status,
          outputSchema: run.outputSchema,
          messages,
          records,
          createdAt: run.createdAt,
          updatedAt: run.updatedAt,
        },
      },
      { headers: corsHeaders },
    );
  } catch (err) {
    console.error('💥 [deep-research] get run failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500, headers: corsHeaders },
    );
  }
}

export async function OPTIONS(): Promise<Response> {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}
