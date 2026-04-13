/**
 * Email Finder Tools for Vercel AI SDK
 *
 * Provides three tools to the email-finder agent:
 *
 *   1. validate_email  → POST /api/validate-email
 *      The agent calls this for every email candidate it wants to test.
 *      Returns a normalized status so the agent knows what to do next.
 *
 *   2. search_web      → POST /api/search   (reused from searchTools.ts)
 *      Used in Phase 3 when guessing and validation both fail.
 *
 *   3. read_url        → POST /api/reader   (reused from searchTools.ts)
 *      Used in Phase 3 to read pages that might contain the email.
 *
 * The validate_email tool description is written carefully to teach the
 * agent exactly what each status means so it can reason correctly.
 */

import { tool } from 'ai';
import { z } from 'zod';

const API_BASE = 'http://localhost:3000';

async function apiFetch(path: string, body: Record<string, unknown>): Promise<Response> {
    return fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

// ── Tool return types ─────────────────────────────────────────────────────────

interface ValidateEmailResult {
    email: string;
    /** "valid" = confirmed deliverable — use this email
     *  "invalid" = confirmed does NOT exist — stop trying this email
     *  "catch_all" = domain accepts everything, uncertain but likely fine if pattern is normal (e.g. first.last@company.com)
     *  "service_error" = our validation system is temporarily down — decide based on context */
    status: 'valid' | 'invalid' | 'catch_all' | 'service_error';
    service: string;
    reason: string;
    error: string | null;
}

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

// ── Tool definitions ──────────────────────────────────────────────────────────

export function buildEmailFinderTools() {
    return {

        validate_email: tool({
            description: `Verify whether an email address is deliverable.

Status meanings — act on them exactly as described:
- "valid"         → Confirmed deliverable. Return this email immediately. STOP searching.
- "invalid"       → Confirmed does NOT exist. Do NOT try other validation services — try a different email pattern instead.
- "catch_all"     → Domain accepts all emails, cannot confirm this specific address. Usually safe for cold outreach if the pattern follows normal naming conventions (first.last@company.com, f.last@company.com, etc.). Use your judgment — if you have no better option, return it with a note that it is catch-all.
- "service_error" → Validation system is temporarily unavailable. Decide based on context:
    • If you are still in early guessing phases (e.g. trying firstname@company.com which has high prior probability), you may continue trying other patterns — they might get a valid result when the service recovers.
    • If you have exhausted most patterns, tell the user the email could not be confirmed due to a service issue and suggest retrying later.`,
            inputSchema: z.object({
                email: z.string().email().describe('The email address to validate.'),
            }),
            execute: async ({ email }): Promise<ValidateEmailResult> => {
                try {
                    const res = await apiFetch('/api/validate-email', { email });
                    if (!res.ok) {
                        return {
                            email,
                            status: 'service_error',
                            service: 'route_error',
                            reason: `HTTP ${res.status} ${res.statusText}`,
                            error: `validate-email route returned ${res.status}`,
                        };
                    }
                    const data = await res.json();
                    return {
                        email: data.email ?? email,
                        status: data.status ?? 'service_error',
                        service: data.service ?? 'unknown',
                        reason: data.reason ?? '',
                        error: data.error ?? null,
                    };
                } catch (err) {
                    return {
                        email,
                        status: 'service_error',
                        service: 'network_error',
                        reason: 'Could not reach validate-email route',
                        error: String(err),
                    };
                }
            },
        }),

        search_web: tool({
            description:
                'Search the web for current information. Use this in Phase 3 when you cannot find a valid email through pattern guessing. Try queries like: "First Last Company email" or "First Last Company contact". Returns a list of results with title, URL, and a snippet.',
            inputSchema: z.object({
                query: z.string().describe('The search query. Be specific — include the person\'s name and company.'),
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
                'Extract readable text content from a web page. Use this after search_web to read pages that might contain the lead\'s email. Look for contact pages, about pages, LinkedIn profiles, or team pages. Do NOT use for login-protected sites like LinkedIn, Facebook, Instagram, Twitter/X.',
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

    };
}

export type EmailFinderTools = ReturnType<typeof buildEmailFinderTools>;
