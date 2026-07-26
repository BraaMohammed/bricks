/**
 * /api/ai/v1/models
 *
 * OpenAI-compatible models listing endpoint.
 *
 * Returns all models available through the waterfall gateway in the standard
 * OpenAI /v1/models format, so any OpenAI-compatible tool can discover what
 * models are available.
 *
 * Response shape matches https://platform.openai.com/docs/api-reference/models/list
 *
 * Extra fields per model:
 *   x_providers  — list of configured provider IDs that support this model
 *   x_available  — true if at least one provider for this model is healthy
 *                  (stateful mode only; always true in serverless mode)
 */

import { NextResponse } from 'next/server';
import { MODEL_MAP, SORTED_PROVIDERS, isProviderConfigured, type ProviderID } from '../../providers.config';
import { health } from '../../provider-health';

export const runtime = 'nodejs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// A fixed epoch used as the "created" timestamp for static models
const EPOCH = Math.floor(new Date('2025-01-01').getTime() / 1000);

// ── GET /api/ai/v1/models ─────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  // Build the set of configured provider IDs for fast lookup
  const configuredProviderIds = new Set(
    SORTED_PROVIDERS.filter(isProviderConfigured).map((p) => p.id),
  );

  const models = Object.entries(MODEL_MAP)
    .map(([canonicalId, providerAliases]) => {
      // Providers that (a) are configured AND (b) map this model
      const supportedProviders = (Object.keys(providerAliases) as ProviderID[]).filter(
        (pid) => configuredProviderIds.has(pid),
      );

      if (supportedProviders.length === 0) {
        // No configured providers for this model — omit it
        return null;
      }

      // A model is "available" if at least one of its providers is healthy
      const isAvailable = supportedProviders.some((pid) => health.isAvailable(pid));

      return {
        // Standard OpenAI fields
        id: canonicalId,
        object: 'model' as const,
        created: EPOCH,
        owned_by: 'waterfall',

        // Gateway extensions (prefixed so they don't clash with future OpenAI fields)
        x_providers: supportedProviders,
        x_available: isAvailable,
      };
    })
    .filter(Boolean);

  return NextResponse.json(
    {
      object: 'list',
      data: models,
    },
    {
      status: 200,
      headers: corsHeaders,
    },
  );
}

// ── OPTIONS (CORS preflight) ──────────────────────────────────────────────────

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}
