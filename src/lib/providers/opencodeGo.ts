import { getBackendUrl } from '@/lib/deepResearch/backendUrl';
import { ModelDefinition, openCodeGoModels } from '@/lib/constants/aiModels';

export const OPENCODE_GO_PROVIDER_ID = 'opencode-go';
export const OPENCODE_GO_PREFIX = 'opencode-go/';
export const OPENCODE_GO_DEFAULT_MODEL = 'opencode-go/deepseek-v4.1-flash';
export const OPENCODE_GO_SESSION_STORAGE_KEY = 'opencode_go_session_id';

const MODELS_TIMEOUT_MS = 8000;
const STATUS_TIMEOUT_MS = 8000;
const TEST_TIMEOUT_MS = 15000;

let inMemorySessionId: string | null = null;

function createSessionId(): string {
  const fallback = `ocg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      return fallback;
    }
  }

  return fallback;
}

export function getOpenCodeGoBaseUrl(): string {
  return `${getBackendUrl()}/api/ai/opencode-go/v1`;
}

export function getOpenCodeGoSessionId(): string {
  if (inMemorySessionId) return inMemorySessionId;

  try {
    const stored = localStorage.getItem(OPENCODE_GO_SESSION_STORAGE_KEY);
    if (stored && stored.trim()) {
      inMemorySessionId = stored.trim();
      return inMemorySessionId;
    }
    inMemorySessionId = createSessionId();
    localStorage.setItem(OPENCODE_GO_SESSION_STORAGE_KEY, inMemorySessionId);
    return inMemorySessionId;
  } catch {
    inMemorySessionId = createSessionId();
    return inMemorySessionId;
  }
}

export function stripOpenCodeGoPrefix(model: string): string {
  return model.startsWith(OPENCODE_GO_PREFIX)
    ? model.slice(OPENCODE_GO_PREFIX.length)
    : model;
}

export function isOpenCodeGoModel(model: string): boolean {
  return model.startsWith(OPENCODE_GO_PREFIX);
}

export function getOpenCodeGoHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-bricks-session': getOpenCodeGoSessionId(),
  };
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

function extractModelIds(payload: unknown): string[] {
  if (Array.isArray(payload)) {
    return payload
      .map((entry: unknown) => {
        if (typeof entry === 'string') return entry;
        if (entry && typeof entry === 'object' && 'id' in entry) {
          const id = (entry as { id?: unknown }).id;
          return typeof id === 'string' ? id : null;
        }
        return null;
      })
      .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
  }

  if (payload && typeof payload === 'object') {
    const record = payload as { data?: unknown; models?: unknown };
    if (Array.isArray(record.data)) return extractModelIds(record.data);
    if (Array.isArray(record.models)) return extractModelIds(record.models);
  }

  return [];
}

function toDisplayName(id: string): string {
  return id
    .replace(/[-_.]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export async function fetchOpenCodeGoModels(): Promise<ModelDefinition[]> {
  try {
    const response = await fetchWithTimeout(
      `${getOpenCodeGoBaseUrl()}/models`,
      { method: 'GET', headers: getOpenCodeGoHeaders() },
      MODELS_TIMEOUT_MS
    );

    if (!response.ok) return openCodeGoModels;

    const payload = await response.json();
    const staticByUpstreamId = new Map(
      openCodeGoModels.map(model => [stripOpenCodeGoPrefix(model.id), model])
    );
    const seen = new Set<string>();
    const models: ModelDefinition[] = [];

    for (const rawId of extractModelIds(payload)) {
      const upstreamId = stripOpenCodeGoPrefix(rawId.trim());
      if (!upstreamId || seen.has(upstreamId)) continue;
      seen.add(upstreamId);

      const known = staticByUpstreamId.get(upstreamId);
      models.push(
        known ?? {
          id: `${OPENCODE_GO_PREFIX}${upstreamId}`,
          name: toDisplayName(upstreamId),
          supportsThinking: false,
          cost: 'Go plan',
        }
      );
    }

    return models.length > 0 ? models : openCodeGoModels;
  } catch {
    return openCodeGoModels;
  }
}

export async function getOpenCodeGoStatus(): Promise<{ configured: boolean }> {
  try {
    const response = await fetchWithTimeout(
      `${getOpenCodeGoBaseUrl()}/status`,
      { method: 'GET', headers: getOpenCodeGoHeaders() },
      STATUS_TIMEOUT_MS
    );

    if (!response.ok) return { configured: false };

    const payload = await response.json();
    return { configured: Boolean(payload?.configured) };
  } catch {
    return { configured: false };
  }
}

export async function testOpenCodeGoConnection(
  model: string = OPENCODE_GO_DEFAULT_MODEL
): Promise<{ success: boolean; message: string; latency: number }> {
  const startTime = Date.now();

  try {
    const response = await fetchWithTimeout(
      `${getOpenCodeGoBaseUrl()}/chat/completions`,
      {
        method: 'POST',
        headers: getOpenCodeGoHeaders(),
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Reply OK' }],
          max_tokens: 1,
        }),
      },
      TEST_TIMEOUT_MS
    );

    const latency = Date.now() - startTime;

    if (!response.ok) {
      let detail = '';
      try {
        detail = (await response.text()).slice(0, 200);
      } catch {
        detail = '';
      }

      return {
        success: false,
        message: detail
          ? `Request failed (${response.status}): ${detail}`
          : `Request failed (${response.status})`,
        latency,
      };
    }

    return { success: true, message: 'Connection successful', latency };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed',
      latency: Date.now() - startTime,
    };
  }
}
