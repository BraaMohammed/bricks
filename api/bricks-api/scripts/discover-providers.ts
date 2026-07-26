/**
 * scripts/discover-providers.ts
 *
 * Queries the /v1/models endpoint of every configured AI provider and prints
 * the available model IDs. Run this once to inform providers.config.ts.
 *
 * Usage:
 *   npx tsx scripts/discover-providers.ts
 *
 * Requires .env.local to be present in the project root (api/bricks-api/).
 */

import * as fs from 'fs';
import * as path from 'path';

// ── Load .env.local manually (tsx doesn't auto-load it) ───────────────────────
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌  .env.local not found. Run from api/bricks-api/ directory.');
    process.exit(1);
  }
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && value && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnv();

// ── Provider definitions ───────────────────────────────────────────────────────

interface ProviderDef {
  id: string;
  displayName: string;
  modelsUrl: string;
  getHeaders: () => Record<string, string> | null; // null = skip (no key)
}

const CLOUDFLARE_ACCOUNT_ID = (process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CLOUDFLARE_ACOUNT_ID)?.trim();
const CLOUDFLARE_TOKEN = process.env.CLOUDFLARE_TOKEN?.trim();

const providers: ProviderDef[] = [
  {
    id: 'ollama',
    displayName: 'Ollama (local/cloud)',
    modelsUrl: `${(process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/$/, '')}/v1/models`,
    getHeaders: () => {
      const base = process.env.OLLAMA_BASE_URL?.trim();
      if (!base) return null; // skip if not configured
      return { 'Content-Type': 'application/json' };
    },
  },
  {
    id: 'nvidia-nim',
    displayName: 'Nvidia NIM',
    modelsUrl: 'https://integrate.api.nvidia.com/v1/models',
    getHeaders: () => {
      const key = process.env.NVIDIA_NIM_API_KEY?.trim();
      if (!key) return null;
      return { Authorization: `Bearer ${key}` };
    },
  },
  {
    id: 'cloudflare',
    displayName: 'Cloudflare AI Workers',
    // Cloudflare uses a different REST path — not /v1/models but their own API
    modelsUrl: CLOUDFLARE_ACCOUNT_ID
      ? `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/models/search?per_page=100`
      : '',
    getHeaders: () => {
      if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_TOKEN) return null;
      return {
        Authorization: `Bearer ${CLOUDFLARE_TOKEN}`,
        'Content-Type': 'application/json',
      };
    },
  },
  {
    id: 'openrouter',
    displayName: 'OpenRouter',
    modelsUrl: 'https://openrouter.ai/api/v1/models',
    getHeaders: () => {
      const key = process.env.OPENROUTER_API_KEY?.trim();
      if (!key) return null;
      return { Authorization: `Bearer ${key}` };
    },
  },
  {
    id: 'google-ai-studio',
    displayName: 'Google AI Studio',
    // Google AI Studio uses a different URL format
    modelsUrl: `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GOOGLE_AI_STUDIO_API_KEY?.trim() || ''}`,
    getHeaders: () => {
      const key = process.env.GOOGLE_AI_STUDIO_API_KEY?.trim();
      if (!key) return null;
      return { 'Content-Type': 'application/json' };
    },
  },
  {
    id: 'groq',
    displayName: 'Groq',
    modelsUrl: 'https://api.groq.com/openai/v1/models',
    getHeaders: () => {
      const key = process.env.GROQ_API_KEY?.trim();
      if (!key) return null;
      return { Authorization: `Bearer ${key}` };
    },
  },
];

// ── Model extraction helpers ───────────────────────────────────────────────────

function extractModels(providerId: string, data: any): string[] {
  try {
    if (providerId === 'cloudflare') {
      // Cloudflare: { result: [ { name: "@cf/meta/llama-3.3-70b-instruct", ... } ] }
      if (Array.isArray(data?.result)) {
        return data.result
          .map((m: any) => m.name as string)
          .filter(Boolean)
          .sort();
      }
      return [];
    }

    if (providerId === 'google-ai-studio') {
      // Google: { models: [ { name: "models/gemini-2.5-pro", displayName: "..." } ] }
      if (Array.isArray(data?.models)) {
        return data.models
          .map((m: any) => (m.name as string)?.replace('models/', ''))
          .filter(Boolean)
          .sort();
      }
      return [];
    }

    if (providerId === 'openrouter') {
      // OpenRouter: { data: [ { id: "openai/gpt-4o", ... } ] }
      if (Array.isArray(data?.data)) {
        return data.data
          .map((m: any) => m.id as string)
          .filter(Boolean)
          .sort();
      }
      return [];
    }

    // Default OpenAI-compatible: { data: [ { id: "llama-3.3-70b-versatile" } ] }
    // or { object: "list", data: [...] }
    if (Array.isArray(data?.data)) {
      return data.data
        .map((m: any) => m.id as string)
        .filter(Boolean)
        .sort();
    }

    // Fallback: just show the raw response
    return [];
  } catch {
    return [];
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function discoverProvider(p: ProviderDef): Promise<void> {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`🔍  ${p.displayName} (${p.id})`);
  console.log(`    URL: ${p.modelsUrl || '(not configured)'}`);

  const headers = p.getHeaders();
  if (headers === null) {
    console.log(`    ⏭️  SKIPPED — API key / config not set in .env.local`);
    return;
  }

  if (!p.modelsUrl) {
    console.log(`    ⏭️  SKIPPED — Base URL not configured`);
    return;
  }

  try {
    const res = await fetch(p.modelsUrl, {
      headers,
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.log(`    ❌  HTTP ${res.status} ${res.statusText}`);
      if (body) console.log(`    Body: ${body.slice(0, 300)}`);
      return;
    }

    const data = await res.json();
    const models = extractModels(p.id, data);

    if (models.length === 0) {
      console.log(`    ⚠️  No models found. Raw response:`);
      console.log(`    ${JSON.stringify(data).slice(0, 500)}`);
      return;
    }

    console.log(`    ✅  ${models.length} models found:`);
    for (const m of models) {
      console.log(`       • ${m}`);
    }
  } catch (err: any) {
    if (err?.name === 'TimeoutError') {
      console.log(`    ❌  TIMEOUT (15s) — provider unreachable`);
    } else {
      console.log(`    ❌  ERROR: ${err?.message ?? err}`);
    }
  }
}

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║         AI Waterfall Provider Discovery Script               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('Querying /v1/models (or equivalent) for each provider...');

  for (const provider of providers) {
    await discoverProvider(provider);
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log('✅  Discovery complete. Use the model lists above to populate');
  console.log('    providers.config.ts MODEL_MAP.');
  console.log('');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
