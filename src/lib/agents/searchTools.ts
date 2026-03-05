/**
 * Search Tools for Vercel AI SDK
 *
 * Wraps the bricks-api server endpoints as Vercel AI SDK tool definitions.
 * Replaces jinaTools.ts — no API key needed on the frontend.
 *
 * Server endpoints (bricks-api):
 *  Search: POST /api/search  { query }  → { results: [{title,url,snippet}], provider, error }
 *  Reader: POST /api/reader  { url }    → { url, content, title, error }
 */

import { tool } from 'ai';
import { z } from 'zod';

const API_BASE = 'http://localhost:3000';

// ── Shared fetch helper ───────────────────────────────────────────────────────

async function apiFetch(path: string, body: Record<string, unknown>): Promise<Response> {
    return fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

// ── Return types (same shape as jinaTools.ts) ─────────────────────────────────

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
 * Build all search tools. Pass the returned object directly to generateText({ tools }).
 * No API key required — keys are managed server-side.
 */
export function buildSearchTools() {
    return {

        search_web: tool({
            description:
                'Search the web for current information. Returns a list of results with title, URL, and a snippet. Use this first to discover relevant URLs before reading them.',
            inputSchema: z.object({
                query: z.string().describe('The search query. Be specific for best results.'),
            }),
            execute: async ({ query }): Promise<SearchWebResult> => {
                try {
                    const res = await apiFetch('/api/search', { query });
                    if (!res.ok) {
                        return { results: [], error: `Search failed: ${res.status} ${res.statusText}` };
                    }
                    const data = await res.json();
                    return {
                        results: (data?.results ?? []).slice(0, 5),
                        error: data?.error ?? null,
                    };
                } catch (err) {
                    return { results: [], error: String(err) };
                }
            },
        }),

        read_url: tool({
            description:
                'Extract clean, readable content from a web page as text. Use this after search_web to read the full content of a promising result.',
            inputSchema: z.object({
                url: z.string().url().describe('The full URL of the web page to read.'),
            }),
            execute: async ({ url }): Promise<ReadUrlResult> => {
                try {
                    const res = await apiFetch('/api/reader', { url });
                    if (!res.ok) {
                        return { url, content: '', error: `Read failed: ${res.status} ${res.statusText}` };
                    }
                    const data = await res.json();
                    return {
                        url,
                        content: data?.content ?? '',
                        error: data?.error ?? null,
                    };
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
                            const res = await apiFetch('/api/reader', { url });
                            if (!res.ok) {
                                return { url, content: '', error: `${res.status} ${res.statusText}` };
                            }
                            const data = await res.json();
                            return {
                                url,
                                content: data?.content ?? '',
                                error: data?.error ?? null,
                            };
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

export type SearchTools = ReturnType<typeof buildSearchTools>;
