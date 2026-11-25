/**
 * GET /api/deep-research/providers
 *
 * Status + reasoning levels for every agentic Search Provider, consumed once
 * by the frontend to render the search-provider selector and its hover
 * sub-lists. Agentic endpoints only — never plain search.
 */

import { NextResponse } from 'next/server';
import { listSearchProviderStatuses } from '../../../../lib/deep-research/search-providers/registry';

export const runtime = 'nodejs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function GET(): Promise<Response> {
  return NextResponse.json(listSearchProviderStatuses(), { status: 200, headers: corsHeaders });
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 200, headers: corsHeaders });
}
