/**
 * tools.ts
 *
 * Mastra tools for the AI Deep Researcher's Search Sub-Agents.
 *
 * Search and reading go over the backend's own HTTP routes so provider
 * waterfalls, the Puppeteer toggle and retries stay in one place. Apify and
 * Apollo are called directly and only appear when their credentials exist.
 *
 * Every tool returns plain JSON-serializable data and never throws raw fetch
 * errors; failures come back as `{ error }`. Secrets are never logged or
 * returned.
 */

import { createTool, type Tool } from '@mastra/core/tools';
import { z } from 'zod';
import { getSelfBaseUrl } from './env';
import { getResearchSource } from './sources';

type DeepResearchTool = Tool<any>;

const MAX_SEARCH_RESULTS = 10;
const MAX_READER_CHARS = 8_000;
const MAX_APIFY_ITEMS = 25;
const MAX_APOLLO_PEOPLE = 25;
const MAX_ITEM_CHARS = 4_000;

const SEARCH_TIMEOUT_MS = 30_000;
const READER_TIMEOUT_MS = 75_000;
const APIFY_TIMEOUT_MS = 120_000;
const APOLLO_TIMEOUT_MS = 30_000;

interface PostJsonOptions {
  headers?: Record<string, string>;
  timeoutMs: number;
  /** Values that must never appear in a returned error message. */
  secrets?: string[];
}

interface PostJsonResult {
  data?: unknown;
  error?: string;
}

function messageOf(error: unknown, secrets: string[] = []): string {
  let message = error instanceof Error ? error.message : String(error);
  for (const secret of secrets) {
    if (!secret) continue;
    message = message.split(secret).join('[redacted]');
  }
  return message || 'Unknown error';
}

/** Keeps arbitrary actor/profile payloads bounded but JSON-serializable. */
function truncateJsonValue(value: unknown, maxChars: number): unknown {
  let serialized: string;
  try {
    serialized = JSON.stringify(value) ?? 'null';
  } catch {
    return String(value).slice(0, maxChars);
  }
  if (serialized.length <= maxChars) return value;
  return serialized.slice(0, maxChars);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * POSTs JSON without ever throwing. `label` is used in error messages instead
 * of the URL, because Apify carries its token in the query string.
 */
async function postJson(
  label: string,
  url: string,
  body: unknown,
  options: PostJsonOptions,
): Promise<PostJsonResult> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(options.timeoutMs),
    });

    if (!response.ok) {
      return { error: `${label} returned HTTP ${response.status}.` };
    }

    return { data: await response.json() };
  } catch (error) {
    return {
      error: `${label} failed: ${messageOf(error, options.secrets)}`,
    };
  }
}

function configuredApifyActorIds(): string[] {
  return (process.env.APIFY_ACTORS ?? '')
    .split(',')
    .map((actor) => actor.trim())
    .filter(Boolean);
}

// ── Tools ────────────────────────────────────────────────────────────────────

const webSearchTool = createTool({
  id: 'web_search',
  description:
    'Search the public web. Returns up to 10 ranked results with title, url and snippet.',
  inputSchema: z.object({
    query: z.string().describe('The search query.'),
  }),
  execute: async ({ query }) => {
    const trimmed = query.trim();
    if (!trimmed) return { results: [], error: 'Missing query.' };

    const response = await postJson(
      'Web search',
      `${getSelfBaseUrl()}/api/search`,
      { query: trimmed },
      { timeoutMs: SEARCH_TIMEOUT_MS },
    );
    if (response.error) return { results: [], error: response.error };

    const payload = asRecord(response.data);
    const raw = Array.isArray(payload.results) ? payload.results : [];
    const results = raw.slice(0, MAX_SEARCH_RESULTS).map((entry) => {
      const row = asRecord(entry);
      return {
        title: String(row.title ?? ''),
        url: String(row.url ?? ''),
        snippet: String(row.snippet ?? ''),
      };
    });

    if (payload.error) {
      return { results, error: String(payload.error) };
    }
    return { results };
  },
});

const readPageTool = createTool({
  id: 'read_page',
  description:
    'Fetch and read one web page as text. Returns the page title, url and up to 8000 characters of content.',
  inputSchema: z.object({
    url: z.string().describe('The page URL to read.'),
  }),
  execute: async ({ url }) => {
    const trimmed = url.trim();
    if (!trimmed) return { error: 'Missing url.' };

    const response = await postJson(
      'Page reader',
      `${getSelfBaseUrl()}/api/reader`,
      { url: trimmed },
      { timeoutMs: READER_TIMEOUT_MS },
    );
    if (response.error) return { error: response.error };

    const payload = asRecord(response.data);
    const content = typeof payload.content === 'string' ? payload.content : '';
    if (!content.trim()) {
      return {
        error:
          (typeof payload.error === 'string' && payload.error) ||
          'The page returned no readable content.',
      };
    }

    return {
      title: typeof payload.title === 'string' ? payload.title : '',
      url: typeof payload.url === 'string' && payload.url ? payload.url : trimmed,
      content: content.slice(0, MAX_READER_CHARS),
    };
  },
});

const apifyActorRunTool = createTool({
  id: 'apify_actor_run',
  description:
    'Run one configured Apify actor synchronously and return up to 25 dataset items. Only actor ids listed in APIFY_ACTORS are allowed.',
  inputSchema: z.object({
    actorId: z
      .string()
      .describe('One of the configured APIFY_ACTORS actor ids.'),
    input: z
      .record(z.string(), z.unknown())
      .optional()
      .describe('Actor input JSON passed through unchanged.'),
  }),
  execute: async ({ actorId, input }) => {
    const allowed = configuredApifyActorIds();
    const requested = actorId.trim();
    if (!allowed.includes(requested)) {
      return {
        error: `Actor "${requested}" is not allowed. Configured actors: ${
          allowed.join(', ') || '(none)'
        }.`,
      };
    }

    const token = process.env.APIFY_API_TOKEN?.trim();
    if (!token) return { error: 'APIFY_API_TOKEN is not configured.' };

    const endpoint = `https://api.apify.com/v2/acts/${encodeURIComponent(
      requested,
    )}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`;

    const response = await postJson('Apify actor run', endpoint, input ?? {}, {
      timeoutMs: APIFY_TIMEOUT_MS,
      secrets: [token, encodeURIComponent(token)],
    });
    if (response.error) return { error: response.error };

    const raw = Array.isArray(response.data) ? response.data : [];
    const items = raw
      .slice(0, MAX_APIFY_ITEMS)
      .map((item) => truncateJsonValue(item, MAX_ITEM_CHARS));

    return { items };
  },
});

const apolloPeopleSearchTool = createTool({
  id: 'apollo_people_search',
  description:
    'Search Apollo public people profiles. Returns profile search results only; this endpoint provides no emails or phone numbers.',
  inputSchema: z.object({
    q_organization_domains: z
      .string()
      .optional()
      .describe('Organisation domains to search, comma or newline separated.'),
    person_titles: z
      .array(z.string())
      .optional()
      .describe('Job titles to match.'),
    person_locations: z
      .array(z.string())
      .optional()
      .describe('Locations to match.'),
    page: z.number().int().positive().optional().describe('Result page.'),
  }),
  execute: async ({
    q_organization_domains,
    person_titles,
    person_locations,
    page,
  }) => {
    const apiKey = process.env.APOLLO_API_KEY?.trim();
    if (!apiKey) return { error: 'APOLLO_API_KEY is not configured.' };

    const body: Record<string, unknown> = {};
    const domains = q_organization_domains?.trim();
    if (domains) body.q_organization_domains = domains;

    const titles = person_titles?.map((title) => title.trim()).filter(Boolean);
    if (titles?.length) body.person_titles = titles;

    const locations = person_locations
      ?.map((location) => location.trim())
      .filter(Boolean);
    if (locations?.length) body.person_locations = locations;

    if (page) body.page = page;

    const response = await postJson(
      'Apollo people search',
      'https://api.apollo.io/api/v1/mixed_people/api_search',
      body,
      {
        headers: { 'x-api-key': apiKey, accept: 'application/json' },
        timeoutMs: APOLLO_TIMEOUT_MS,
        secrets: [apiKey],
      },
    );
    if (response.error) return { error: response.error };

    const payload = asRecord(response.data);
    const people = Array.isArray(payload.people)
      ? payload.people
          .slice(0, MAX_APOLLO_PEOPLE)
          .map((person) => truncateJsonValue(person, MAX_ITEM_CHARS))
      : [];

    return { people };
  },
});

// ── Factory ──────────────────────────────────────────────────────────────────

/**
 * The tools available to Search Sub-Agents in this environment. API-gated
 * tools are omitted entirely when their credentials are not configured.
 */
export function createDeepResearchTools(): Record<string, DeepResearchTool> {
  const tools: Record<string, DeepResearchTool> = {
    web_search: webSearchTool,
    read_page: readPageTool,
  };

  if (getResearchSource('apollo-api')?.isAvailable()) {
    tools.apollo_people_search = apolloPeopleSearchTool;
  }

  if (getResearchSource('apify')?.isAvailable()) {
    tools.apify_actor_run = apifyActorRunTool;
  }

  return tools;
}

/** Tool ids available to Search Sub-Agents in this environment. */
export function deepResearchToolNames(): string[] {
  return Object.keys(createDeepResearchTools());
}
