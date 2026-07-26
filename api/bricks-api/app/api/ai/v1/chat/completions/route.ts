/**
 * /api/ai/v1/chat/completions
 *
 * OpenAI-compatible chat completions endpoint backed by the AI waterfall.
 *
 * Drop-in replacement for https://api.openai.com/v1/chat/completions
 * — just point your OpenAI SDK baseURL to http://localhost:3001/api/ai/v1
 *
 * Request:  POST — standard OpenAI ChatCompletion request body
 * Response: standard OpenAI ChatCompletion response JSON
 *
 * Extra response headers:
 *   x-provider-used  — which provider actually served the request
 *   x-attempts       — how many providers were tried
 */

import { NextRequest, NextResponse } from 'next/server';
import { runWaterfall, isWaterfallError, type ChatCompletionRequest } from '../../../waterfall';

export const runtime = 'nodejs';
export const maxDuration = 120; // allow enough time for waterfall retries

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ── POST /api/ai/v1/chat/completions ─────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
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

  console.log(`🌊 [waterfall] chat/completions — model: ${body.model}`);

  const result = await runWaterfall(body);

  if (isWaterfallError(result)) {
    const httpStatus =
      result.error.type === 'no_providers_configured' ||
      result.error.type === 'model_not_found'
        ? 400
        : 503;

    return NextResponse.json(
      { error: result.error },
      {
        status: httpStatus,
        headers: {
          ...corsHeaders,
          'x-provider-used': 'none',
          'x-attempts': String(result.error.providers_tried.length),
        },
      },
    );
  }

  return NextResponse.json(result.response, {
    status: 200,
    headers: {
      ...corsHeaders,
      'x-provider-used': result.providerUsed,
      'x-attempts': String(result.attemptCount),
    },
  });
}

// ── OPTIONS (CORS preflight) ──────────────────────────────────────────────────

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}
