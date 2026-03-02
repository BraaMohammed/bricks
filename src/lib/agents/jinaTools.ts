/**
 * Jina AI Tools for Vercel AI SDK v6
 *
 * Wraps Jina's public REST APIs as Vercel AI SDK tool definitions.
 * Used by the agent executor (executor.ts) at runtime.
 *
 * Jina REST endpoints:
 *  Search: GET https://s.jina.ai/{query}
 *  Reader: GET https://r.jina.ai/{url}
 *
 * Key is optional — free tier works without one, key removes rate limits.
 */

import { tool } from 'ai';
import { z } from 'zod';

const JINA_READER_BASE = 'https://r.jina.ai';
const JINA_SEARCH_BASE = 'https://s.jina.ai';

let inFlightJinaRequests = 0;
const jinaQueue: Array<() => void> = [];

async function withJinaConcurrencyLimit<T>(maxConcurrent: number, task: () => Promise<T>): Promise<T> {
  if (inFlightJinaRequests >= maxConcurrent) {
    await new Promise<void>(resolve => jinaQueue.push(resolve));
  }

  inFlightJinaRequests += 1;
  try {
    return await task();
  } finally {
    inFlightJinaRequests -= 1;
    const next = jinaQueue.shift();
    if (next) next();
  }
}

function shouldRetryStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 429 || (status >= 500 && status < 600);
}

async function sleep(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJinaWithRetry(url: string, apiKey?: string): Promise<Response> {
  const maxAttempts = 4;
  const maxConcurrent = apiKey ? 6 : 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await withJinaConcurrencyLimit(maxConcurrent, async () => {
      return fetch(url, { headers: jinaHeaders(apiKey) });
    });

    if (response.ok || !shouldRetryStatus(response.status) || attempt === maxAttempts) {
      return response;
    }

    const retryAfterHeader = response.headers.get('retry-after');
    const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : 0;
    const backoffMs = Math.max(retryAfterMs, 500 * 2 ** (attempt - 1) + Math.floor(Math.random() * 300));
    await sleep(backoffMs);
  }

  return fetch(url, { headers: jinaHeaders(apiKey) });
}

function jinaHeaders(apiKey?: string): HeadersInit {
  return {
    Accept: 'application/json',
    'X-Return-Format': 'markdown',
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
  };
}

// ── Explicit return types (AI SDK v6 requires consistent return shapes) ──────

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface SearchWebResult {
  results: SearchResult[];
  error: string | null;
}

interface ReadUrlResult {
  url: string;
  content: string;
  error: string | null;
}

interface ParallelReadResult {
  results: ReadUrlResult[];
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build all Jina tools with an optional API key baked in.
 * Pass the returned object directly to generateText({ tools }).
 */
export function buildJinaTools(jinaApiKey?: string) {
  return {

    search_web: tool({
      description:
        'Search the web for current information. Returns a list of results with title, URL, and a snippet. Use this first to discover relevant URLs before reading them.',
      inputSchema: z.object({
        query: z.string().describe('The search query. Be specific for best results.'),
      }),
      execute: async ({ query }): Promise<SearchWebResult> => {
        try {
          const url = `${JINA_SEARCH_BASE}/${encodeURIComponent(query)}`;
          const res = await fetchJinaWithRetry(url, jinaApiKey);
          if (!res.ok) {
            return { results: [], error: `Search failed: ${res.status} ${res.statusText}` };
          }
          const data = await res.json();
          const results: SearchResult[] = (data?.data ?? [])
            .slice(0, 5)
            .map((r: Record<string, string>) => ({
              title: r.title ?? '',
              url: r.url ?? '',
              snippet: r.description ?? (r.content ?? '').slice(0, 300),
            }));
          return { results, error: null };
        } catch (err) {
          return { results: [], error: String(err) };
        }
      },
    }),

    read_url: tool({
      description:
        'Extract clean, readable content from a web page as markdown. Use this after search_web to read the full content of a promising result.',
      inputSchema: z.object({
        url: z.string().url().describe('The full URL of the web page to read.'),
      }),
      execute: async ({ url }): Promise<ReadUrlResult> => {
        try {
          const readerUrl = `${JINA_READER_BASE}/${url}`;
          const res = await fetchJinaWithRetry(readerUrl, jinaApiKey);
          if (!res.ok) {
            return { url, content: '', error: `Read failed: ${res.status} ${res.statusText}` };
          }
          const data = await res.json();
          const content: string = data?.data?.content ?? data?.content ?? '';
          return { url, content: content.slice(0, 8000), error: null };
        } catch (err) {
          return { url, content: '', error: String(err) };
        }
      },
    }),

    parallel_read_url: tool({
      description:
        'Read multiple web pages in parallel. Use this when you have several promising URLs and want to extract content from all of them at once.',
      inputSchema: z.object({
        urls: z.array(z.string().url()).max(5).describe('List of URLs to read (max 5).'),
      }),
      execute: async ({ urls }): Promise<ParallelReadResult> => {
        const settled = await Promise.allSettled(
          urls.map(async (url): Promise<ReadUrlResult> => {
            try {
              const readerUrl = `${JINA_READER_BASE}/${url}`;
              const res = await fetchJinaWithRetry(readerUrl, jinaApiKey);
              if (!res.ok) {
                return { url, content: '', error: `${res.status} ${res.statusText}` };
              }
              const data = await res.json();
              const content: string = data?.data?.content ?? data?.content ?? '';
              return { url, content: content.slice(0, 4000), error: null };
            } catch (err) {
              return { url, content: '', error: String(err) };
            }
          })
        );
        const results: ReadUrlResult[] = settled.map((r) =>
          r.status === 'fulfilled'
            ? r.value
            : { url: '', content: '', error: String((r as PromiseRejectedResult).reason) }
        );
        return { results };
      },
    }),

  };
}

export type JinaTools = ReturnType<typeof buildJinaTools>;
