/**
 * Email Finder Agent Executor
 *
 * Runs an autonomous agentic loop using Vercel AI SDK's generateText().
 * The agent follows a strict 3-phase strategy to find and validate emails:
 *
 *   Phase 1 — Scan context for existing emails → validate immediately
 *   Phase 2 — Generate creative email patterns → validate each
 *   Phase 3 — Deep web search → extract & validate emails found
 *
 * Mirrors executor.ts in structure (retry loop, rate limit handling,
 * synthesis fallback) but uses buildEmailFinderTools() and a specialized
 * system prompt tuned for email discovery.
 */

import { generateText, stepCountIs } from 'ai';
import { buildEmailFinderTools } from './emailFinderTools';
import { getAgentModel, readAgentKeysFromStorage } from './providerRouter';

export interface EmailFinderRunOptions {
  /** Lead context — may contain {ColumnName} placeholders already interpolated */
  context: string;
  /** AI provider to use */
  provider: 'openai' | 'gemini' | 'groq' | 'ollama';
  /** Model ID */
  model: string;
  /** Maximum agentic tool-call steps. Default: 15 */
  maxSteps?: number;
  /** Temperature. Default: 0.3 (lower = more focused/systematic) */
  temperature?: number;
}

export interface EmailFinderRunResult {
  /** The found email, or "not found" message */
  result: string;
  /** Number of tool-call steps taken */
  steps: number;
  /** Any non-fatal error message */
  error?: string;
}

// ── System prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt(maxSteps: number): string {
  return `You are an expert email finder agent. Your ONLY job is to find and return a valid, deliverable email address for the lead described by the user.

You have a tool budget of ${maxSteps} steps total. Plan carefully — every step counts.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 1 — SCAN THE CONTEXT FOR AN EXISTING EMAIL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Carefully read the lead context the user provided.
• Does it already contain an email address? (look for patterns like x@y.com)
• If YES → call validate_email on it immediately.
  - If "valid" → return EXACTLY: {email} + verifed
  - If "invalid" → discard it. Move to Phase 2.
  - If "catch_all" → note it as a fallback. Continue to Phase 2 to try for a "valid" result.
  - If "service_error" → STOP finding. Return EXACTLY: error : validation system is down

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 2 — TEST TOP COMMON EMAIL PATTERNS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Extract from context: first name, last name, and company domain.
  - Company domain = the website URL without www/http (e.g. stripe.com)
  - If no domain is given, infer it from company name (e.g. "Stripe" → stripe.com)
  - BE CREATIVE with names: if a name is long or has common shorter versions, try the short version FIRST.
  - Examples of shortening: Mohammed → mo, Christopher → chris/christoph, Alexandria → alex, Veronique → vero, William → will/bill.
  - Don't forget that many names have shorter 2-character versions as well (e.g., Mohammed → mo, Edward → ed, Albert → al, Joseph → jo).
  - MIDDLE NAMES & HYPHENS: If there's a middle initial/name, try variations of it (e.g. fmlast@, first.m.last@) or try omitting it. If the name is hyphenated (Jean-Luc), try without the hyphen (jeanluc@) or with it.

• Test ONLY the top 3-4 most common patterns first (sequentially, one at a time):
  1.  first@domain.com
  2.  first.last@domain.com
  3.  flast@domain.com          (first initial + last)
  4.  f.last@domain.com

• For EACH pattern → call validate_email:
  - CRITICAL: NEVER test multiple emails at once! You must check them STRICTLY SEQUENTIALLY (one at a time) and wait for the result before trying the next. Parallel testing wastes credits and is FORBIDDEN.
  - "valid" → return EXACTLY: {email} + verifed
  - "catch_all" → save as best fallback. CRITICAL: If you get "catch_all" for 2 different patterns (like first@ and flast@), the domain is a global catch-all. STOP testing patterns immediately to save steps! Move to Phase 3.
  - "service_error" → STOP checking immediately! Return EXACTLY: error : validation system error
  - "invalid" → If all top patterns fail, the probability of the other patterns working is low. MOVE TO PHASE 3 (Web Search) to gather clues before wasting more credits.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 3 — DEEP WEB SEARCH (After Top Patterns Fail)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Use search_web with targeted queries:
  - "[First Name] [Last Name] [Company] email"
  - "site:[domain] email [First Name]"
• Pay close attention to search results from email indexing sites (RocketReach, Apollo, etc.). They often show masked emails like "e###@spacex.com" or "j****@company.com".
• If you see a masked email, use the visible letters and the exact number of masking characters (* or #) to deduce the length and structure of the email (e.g. "e###" = 4 letters starting with e = "elon", "j####" = 5 letters starting with j = "james") and then use validate_email on your deduction.
• Use read_url on the most promising pages (contact pages, about pages, team pages).
• Extract and validate any email addresses found in the content.
  - "valid" → return EXACTLY: {email} + verifed
  - If Phase 3 yields no clear valid emails, MOVE TO PHASE 4.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 4 — FALLBACK PATTERN FUZZING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• If the web search failed to find a valid email, test the remaining, less common patterns sequentially:
  5.  firstlast@domain.com
  6.  last@domain.com
  7.  first_last@domain.com
  8.  firstl@domain.com         (first + last initial)
  9.  hello@domain.com / contact@domain.com

• For EACH pattern → call validate_email:
  - CRITICAL: You must still check these STRICTLY SEQUENTIALLY (one at a time) and wait for the result before trying the next!
  - "valid" → return EXACTLY: {email} + verifed.
  - "invalid" → try the next.
• If you exhaust all patterns and only have a "catch_all" result from previous phases → return EXACTLY: {best_catch_all_email} + catch all

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP BUDGET RULES (CRITICAL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• You have ${maxSteps} steps total. Reserve 1 step at the end to write your final answer.
• If you are on step ${maxSteps} or beyond, STOP calling tools and write your answer now.
• If you are on step ${Math.max(1, maxSteps - 2)} or more, stop researching and synthesize immediately.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT (STRICT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• If found a "valid" email → return ONLY the email address followed by + verifed. 
  Example: john.smith@stripe.com + verifed

• If found only a "catch_all" email → return the email followed by + catch all.
  Example: john.smith@stripe.com + catch all

• If all services returned "service_error" and you could not confirm anything:
  Return exactly: error : {reason}

• If you searched thoroughly and found nothing (or all were invalid):
  Return exactly: couldnt find : exhausted all patterns`;
}

// ── Retry helpers (identical to executor.ts) ──────────────────────────────────

function isRetryableProviderError(error: unknown): boolean {
  const message = String(error).toLowerCase();
  return (
    message.includes('429') ||
    message.includes('rate limit') ||
    message.includes('too many requests') ||
    message.includes('timeout') ||
    message.includes('503') ||
    message.includes('502') ||
    message.includes('504')
  );
}

function extractRetryDelay(error: unknown): number | null {
  const msg = String(error).toLowerCase();

  const sMatch = msg.match(/try again in ([\d\.]+)s/);
  if (sMatch?.[1]) return parseFloat(sMatch[1]) * 1000;

  const msMatch = msg.match(/try again in ([\d\.]+)ms/);
  if (msMatch?.[1]) return parseFloat(msMatch[1]);

  return null;
}

async function sleep(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}

// ── Main executor ─────────────────────────────────────────────────────────────

export async function runEmailFinderAgent(
  options: EmailFinderRunOptions,
): Promise<EmailFinderRunResult> {
  const {
    context,
    provider,
    model,
    maxSteps = 15,
    temperature = 0.3,
  } = options;

  // Resolve AI provider keys from localStorage (same as search agent)
  const storedKeys = readAgentKeysFromStorage();

  // Build the specialized tools
  const tools = buildEmailFinderTools();

  // Resolve model instance
  let aiModel;
  try {
    aiModel = getAgentModel({ provider, model, ...storedKeys });
  } catch (err) {
    return { result: '', steps: 0, error: String(err) };
  }

  const systemPrompt = buildSystemPrompt(maxSteps);

  const maxAttempts = 50; // Same generous retry budget as search agent (handles Groq free tier)
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await generateText({
        model: aiModel,
        system: systemPrompt,
        prompt: `Find the email address for this lead:\n\n${context}`,
        tools,
        // +1 so the model always has a spare step to write its final answer
        stopWhen: stepCountIs(maxSteps + 1),
        maxRetries: 0,
        temperature,
      });

      console.log('📧 Email finder response:', { text: response.text, steps: response.steps?.length });

      // Happy path — model produced a final text answer
      if (response.text) {
        return {
          result: response.text.trim(),
          steps: response.steps?.length ?? 0,
        };
      }

      // ── Synthesis fallback ────────────────────────────────────────────────
      // The model used all steps on tool calls and never wrote a final answer.
      // Collect all tool results and force a synthesis call with no tools.
      console.warn('⚠️ response.text was empty — running synthesis fallback call...');

      const researchSummary = (response.steps ?? [])
        .flatMap(step => step.toolResults ?? [])
        .map((tr, i) => `[Tool result ${i + 1}]\n${JSON.stringify((tr as any).result, null, 2)}`)
        .join('\n\n');

      if (!researchSummary) {
        return { result: 'not found', steps: response.steps?.length ?? 0 };
      }

      const synthResponse = await generateText({
        model: aiModel,
        system: `You are an email finder assistant. Based only on the tool results provided, determine the best email address found for the lead.

Output rules:
- If a "valid" email was found → return EXACTLY: {email} + verifed
- If only a "catch_all" email was found → return EXACTLY: {email} + catch all
- If all services failed → return EXACTLY: error : validation unavailable
- If nothing was found or all were invalid → return EXACTLY: couldnt find : exhausted all patterns`,
        prompt: `Lead context: ${context}\n\nTool results collected:\n${researchSummary}`,
        maxRetries: 0,
        temperature,
      });

      console.log('🔁 Email finder synthesis result:', synthResponse.text);

      return {
        result: synthResponse.text?.trim() ?? 'couldnt find : exhausted all patterns',
        steps: (response.steps?.length ?? 0) + 1,
      };

    } catch (err) {
      lastError = err;

      if (!isRetryableProviderError(err) || attempt === maxAttempts) {
        break;
      }

      let backoffMs = 1000 * 2 ** (attempt - 1) + Math.floor(Math.random() * 400);

      const explicitDelay = extractRetryDelay(err);
      if (explicitDelay !== null) {
        const jitter = Math.floor(Math.random() * 1500);
        backoffMs = explicitDelay + 150 + jitter;
        console.warn(`⏳ [Attempt ${attempt}] Rate limit. Waiting ${backoffMs}ms (extracted ${explicitDelay}ms + jitter)...`);
      } else {
        backoffMs = Math.min(backoffMs, 10000);
        console.warn(`⏳ [Attempt ${attempt}] Rate limit. Backing off ${backoffMs}ms...`);
      }

      await sleep(backoffMs);
    }
  }

  return {
    result: '',
    steps: 0,
    error: `Email finder agent error: ${String(lastError)}`,
  };
}
