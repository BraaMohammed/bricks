/**
 * /api/ai/v1/chat/completions/stream
 *
 * Streaming OpenAI-compatible chat completions endpoint backed by the AI
 * waterfall. Emits OpenAI-format SSE (`data: {...}\n\n`, terminated by
 * `data: [DONE]`), including tool-call deltas.
 *
 * Request:  POST — standard OpenAI ChatCompletion request body
 * Response: text/event-stream
 *
 * Extra response headers:
 *   x-provider-used  — which provider is serving the stream
 *   x-attempts       — how many providers were tried before one streamed
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  runWaterfallStream,
  isStreamWaterfallError,
} from '../../../../waterfall-stream';
import type { ChatCompletionRequest } from '../../../../waterfall';

export const runtime = 'nodejs';
export const maxDuration = 300;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ── POST /api/ai/v1/chat/completions/stream ──────────────────────────────────

export async function POST(request: NextRequest): Promise<Response> {
  let body: ChatCompletionRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: {
          message: 'Invalid JSON body',
          type: 'invalid_request_error',
          param: null,
          code: 'invalid_json',
        },
      },
      { status: 400, headers: corsHeaders },
    );
  }

  if (!body?.model) {
    return NextResponse.json(
      {
        error: {
          message: "Missing required field: 'model'",
          type: 'invalid_request_error',
          param: 'model',
          code: 'missing_required_param',
        },
      },
      { status: 400, headers: corsHeaders },
    );
  }

  if (!Array.isArray(body?.messages) || body.messages.length === 0) {
    return NextResponse.json(
      {
        error: {
          message: "Missing required field: 'messages'",
          type: 'invalid_request_error',
          param: 'messages',
          code: 'missing_required_param',
        },
      },
      { status: 400, headers: corsHeaders },
    );
  }

  console.log(`🌊 [waterfall-stream] chat/completions/stream — model: ${body.model}`);

  const outcome = await runWaterfallStream(body);

  if (isStreamWaterfallError(outcome)) {
    const httpStatus =
      outcome.error.type === 'no_providers_configured' ||
      outcome.error.type === 'model_not_found'
        ? 400
        : 503;

    return NextResponse.json(
      { error: outcome.error },
      {
        status: httpStatus,
        headers: {
          ...corsHeaders,
          'x-provider-used': 'none',
          'x-attempts': String(outcome.error.providers_tried.length),
        },
      },
    );
  }

  return new Response(outcome.stream, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'x-provider-used': outcome.providerUsed,
      'x-attempts': String(outcome.attemptCount),
    },
  });
}

// ── OPTIONS (CORS preflight) ──────────────────────────────────────────────────

export async function OPTIONS(): Promise<Response> {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}
