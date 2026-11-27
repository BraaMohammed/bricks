/**
 * /api/ai/opencode-go/[...path]
 *
 * Backend proxy for OpenCode Go — a paid, OpenAI-compatible provider at
 * https://opencode.ai/inference/go.
 *
 * Browser calls to opencode.ai fail CORS and require an x-opencode-session
 * header, so the browser talks to this route instead. This is a direct paid
 * provider — it is NOT part of the free waterfall.
 *
 * GET  models            → proxy OpenCode Go /v1/models
 * GET  status            → { configured, provider, defaultModel }
 * POST chat/completions  → proxy chat completions (JSON or streaming)
 *
 * Auth: OPENCODE_GO_API_KEY from .env.local. This local proxy has no auth.
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

export const runtime = 'nodejs';
export const maxDuration = 300;

const DEFAULT_MODEL = 'deepseek-v4.1-flash';
const DEFAULT_BASE_URL = 'https://opencode.ai/inference/go';
const USER_AGENT = 'bricks/0.1.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-bricks-session',
};

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

function jsonError(status: number, message: string, type: string): NextResponse {
  return NextResponse.json({ error: { message, type } }, { status, headers: corsHeaders });
}

function notFound(): NextResponse {
  return jsonError(404, 'Not found', 'not_found_error');
}

function resolveBaseUrl(): string {
  const raw = process.env.OPENCODE_GO_BASE_URL?.trim();
  return (raw || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

function modelsUrl(): string {
  const base = resolveBaseUrl();
  return base.endsWith('/v1') ? `${base}/models` : `${base}/v1/models`;
}

function chatCompletionsUrl(): string {
  const base = resolveBaseUrl();
  if (base.endsWith('/chat/completions')) return base;
  if (base.endsWith('/openai/v1')) return `${base}/chat/completions`;
  if (base.endsWith('/openai')) return `${base}/v1/chat/completions`;
  return `${base}/openai/v1/chat/completions`;
}

function sessionHeaders(request: NextRequest): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.OPENCODE_GO_API_KEY?.trim() ?? ''}`,
    'x-opencode-session': request.headers.get('x-bricks-session')?.trim() || randomUUID(),
    'User-Agent': USER_AGENT,
  };
}

/**
 * Adds a clear hint to 401/403 upstream bodies so the cause is obvious in the
 * browser. Preserves whatever the upstream sent.
 */
function withAuthHint(payload: unknown, status: number): unknown {
  const hint = `OpenCode Go API key is invalid or missing (upstream ${status}). Set OPENCODE_GO_API_KEY in api/bricks-api/.env.local.`;

  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const obj = payload as Record<string, unknown>;
    const existing = obj.error;

    if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
      const err = existing as Record<string, unknown>;
      const upstreamMessage = typeof err.message === 'string' ? err.message : '';
      return {
        ...obj,
        error: {
          ...err,
          message: upstreamMessage ? `${hint} Upstream: ${upstreamMessage}` : hint,
        },
      };
    }

    if (typeof existing === 'string') {
      return {
        ...obj,
        error: { message: `${hint} Upstream: ${existing}`, type: 'authentication_error' },
      };
    }

    return { ...obj, error: { message: hint, type: 'authentication_error' } };
  }

  if (typeof payload === 'string' && payload.trim()) {
    return {
      error: { message: `${hint} Upstream: ${payload.trim()}`, type: 'authentication_error' },
    };
  }

  return { error: { message: hint, type: 'authentication_error' } };
}

// ── GET /api/ai/opencode-go/models | status ──────────────────────────────────

export async function GET(_request: NextRequest, context: RouteContext): Promise<Response> {
  const { path } = await context.params;
  const route = (path ?? []).join('/').replace(/^v1\//, '');

  if (route === 'status') {
    return NextResponse.json(
      {
        configured: Boolean(process.env.OPENCODE_GO_API_KEY?.trim()),
        provider: 'opencode-go',
        defaultModel: DEFAULT_MODEL,
      },
      { status: 200, headers: corsHeaders },
    );
  }

  if (route === 'models') {
    const key = process.env.OPENCODE_GO_API_KEY?.trim();
    const headers: Record<string, string> = {
      'x-opencode-session': randomUUID(),
      'User-Agent': USER_AGENT,
    };
    if (key) headers.Authorization = `Bearer ${key}`;

    try {
      const upstream = await fetch(modelsUrl(), {
        method: 'GET',
        headers,
        cache: 'no-store',
      });

      const text = await upstream.text();
      let payload: unknown;
      try {
        payload = JSON.parse(text);
      } catch {
        payload = {
          error: {
            message: text || `OpenCode Go returned ${upstream.status}`,
            type: 'upstream_error',
          },
        };
      }

      return NextResponse.json(payload, { status: upstream.status, headers: corsHeaders });
    } catch (error) {
      return jsonError(
        502,
        `Failed to reach OpenCode Go: ${error instanceof Error ? error.message : String(error)}`,
        'upstream_error',
      );
    }
  }

  return notFound();
}

// ── POST /api/ai/opencode-go/chat/completions ────────────────────────────────

export async function POST(request: NextRequest, context: RouteContext): Promise<Response> {
  const { path } = await context.params;
  const route = (path ?? []).join('/').replace(/^v1\//, '');

  if (route !== 'chat/completions') {
    return notFound();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'Invalid JSON body', 'invalid_request_error');
  }

  const apiKey = process.env.OPENCODE_GO_API_KEY?.trim();
  if (!apiKey) {
    return jsonError(
      503,
      'OpenCode Go is not configured. Set OPENCODE_GO_API_KEY in api/bricks-api/.env.local.',
      'configuration_error',
    );
  }

  const payload =
    body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : ({} as Record<string, unknown>);

  if (typeof payload.model === 'string') {
    payload.model = payload.model.replace(/^opencode-go\//, '');
  }

  const isStream = payload.stream === true;

  let upstream: Response;
  try {
    upstream = await fetch(chatCompletionsUrl(), {
      method: 'POST',
      headers: sessionHeaders(request),
      body: JSON.stringify(body),
      cache: 'no-store',
    });
  } catch (error) {
    return jsonError(
      502,
      `Failed to reach OpenCode Go: ${error instanceof Error ? error.message : String(error)}`,
      'upstream_error',
    );
  }

  // Stream only successful responses — errors are buffered so they can be
  // preserved and annotated (401/403 hint).
  if (isStream && upstream.ok) {
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        ...corsHeaders,
        'Content-Type': upstream.headers.get('content-type') ?? 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  }

  const text = await upstream.text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }

  if (upstream.status === 401 || upstream.status === 403) {
    parsed = withAuthHint(parsed, upstream.status);
  }

  let responseBody: string;
  let contentType: string;

  if (typeof parsed === 'string') {
    responseBody = parsed;
    contentType = upstream.headers.get('content-type') ?? 'text/plain; charset=utf-8';
  } else {
    responseBody = JSON.stringify(parsed) ?? '';
    contentType = 'application/json';
  }

  return new Response(responseBody, {
    status: upstream.status,
    headers: {
      ...corsHeaders,
      'Content-Type': contentType,
    },
  });
}

// ── OPTIONS (CORS preflight) ──────────────────────────────────────────────────

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}
