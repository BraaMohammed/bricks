/**
 * AI Search Agent Executor
 *
 * Runs an autonomous agentic loop using Vercel AI SDK's generateText().
 * The agent can call search tools (search_web, read_url, parallel_read_url)
 * to answer the user's instruction.
 *
 * Usage:
 *   const result = await runSearchAgent({
 *     instruction: 'Find the CEO of {Company}',
 *     rowData: { Company: 'OpenAI' },
 *     provider: 'groq',
 *     model: 'llama-3.3-70b-versatile',
 *     maxSteps: 5,
 *   });
 */

import { generateText, stepCountIs } from 'ai';
import { buildSearchTools } from './searchTools';
import { getAgentModel, readAgentKeysFromStorage } from './providerRouter';

export interface AgentRunOptions {
  /** Natural language instruction, may contain {ColumnName} placeholders. */
  instruction: string;
  /** Row data – used to interpolate {ColumnName} placeholders. */
  rowData: Record<string, string>;
  /** AI provider to use. */
  provider: 'openai' | 'gemini' | 'groq' | 'ollama';
  /** Model ID. */
  model: string;
  /** Maximum agentic iterations (tool call rounds). Default: 5. */
  maxSteps?: number;
  temperature?: number;
  thinkingMode?: boolean;
}

export interface AgentRunResult {
  /** Final text answer from the agent. */
  result: string;
  /** Number of steps taken. */
  steps: number;
  /** Any non-fatal error message. */
  error?: string;
}

/**
 * Interpolate {ColumnName} placeholders in an instruction string with row data.
 */
function interpolate(instruction: string, rowData: Record<string, string>): string {
  return instruction.replace(/\{([^}]+)\}/g, (_, key) => {
    const val = rowData[key];
    return val !== undefined ? val : `{${key}}`;
  });
}

function buildSystemPrompt(maxSteps: number): string {
  return `You are a data research agent. Your job is to find specific information by searching the web and reading web pages.

You have a budget of ${maxSteps} tool-call steps total.
Step budget rules (CRITICAL):
- Keep track of how many tool calls you have made so far.
- You MUST stop calling tools and write your final text answer before you run out of steps.
- Reserve at least 1 step at the end to write your answer — if you are on step ${maxSteps} or beyond, do NOT call any more tools; write your answer immediately.
- If you have used ${Math.max(1, maxSteps - 1)} or more steps, stop gathering information and synthesize your answer now.

Research guidelines:
- Use search_web to find relevant URLs about the topic.
- Use read_url to extract the full content from promising URLs.
- Use parallel_read_url when you have multiple URLs to check at once (saves steps).
- Be concise and extract only the specific information requested.
- If you cannot find the information after reasonable attempts, say so clearly.
- Return only the final answer – no explanations about what you did.`;
}

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

  // Look for "try again in X.XXs"
  const sMatch = msg.match(/try again in ([\d\.]+)s/);
  if (sMatch && sMatch[1]) {
    return parseFloat(sMatch[1]) * 1000;
  }

  // Look for "try again in X.XXms"
  const msMatch = msg.match(/try again in ([\d\.]+)ms/);
  if (msMatch && msMatch[1]) {
    return parseFloat(msMatch[1]);
  }

  return null;
}

async function sleep(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Run the search agent for a single data row.
 */
export async function runSearchAgent(options: AgentRunOptions): Promise<AgentRunResult> {
  const {
    instruction,
    rowData,
    provider,
    model,
    maxSteps = 5,
    temperature = 0.7,
  } = options;

  // Resolve AI provider keys
  const storedKeys = readAgentKeysFromStorage();

  // Build tools (keys are server-side, no key needed here)
  const tools = buildSearchTools();

  // Resolve model instance
  let aiModel;
  try {
    aiModel = getAgentModel({ provider, model, ...storedKeys });
  } catch (err) {
    return { result: '', steps: 0, error: String(err) };
  }

  // Interpolate row data into instruction
  const resolvedInstruction = interpolate(instruction, rowData);

  try {
    const maxAttempts = 50; // Groq free tier 6000 TPM limit requires many, many retries across a large batch
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await generateText({
          model: aiModel,
          system: buildSystemPrompt(maxSteps),
          prompt: resolvedInstruction,
          tools,
          // +1 so the model always has a spare step to write its final text answer
          // after tool calls finish. Without this, all N steps can be consumed by
          // tool calls and response.text comes back empty.
          stopWhen: stepCountIs(maxSteps + 1),
          maxRetries: 0, // Handle retries entirely in this loop so we can respect explicit wait times
          temperature,
        });

        console.log('🤖 Agent response:', { text: response.text, steps: response.steps?.length });

        // Happy path — model produced a final text answer
        if (response.text) {
          return {
            result: response.text,
            steps: response.steps?.length ?? 0,
          };
        }

        // ── Synthesis fallback ──────────────────────────────────────────────────
        // The model used all steps on tool calls and never wrote a text answer.
        // Collect all research gathered so far and make ONE final call with NO tools
        // so the model is forced to synthesize a plain-text answer.
        console.warn('⚠️ response.text was empty – running synthesis fallback call...');

        const researchSummary = (response.steps ?? [])
          .flatMap(step => step.toolResults ?? [])
          .map((tr, i) => `[Research result ${i + 1}]\n${JSON.stringify(tr.result, null, 2)}`)
          .join('\n\n');

        if (!researchSummary) {
          // Truly nothing was gathered — return empty
          return { result: '', steps: response.steps?.length ?? 0 };
        }

        const synthResponse = await generateText({
          model: aiModel,
          system: 'You are a data extraction assistant. Based only on the research data provided, answer the user\'s question concisely. Return only the answer — no explanations.',
          prompt: `Question: ${resolvedInstruction}\n\nResearch data collected:\n${researchSummary}`,
          // No tools — model MUST produce plain text
          maxRetries: 0,
          temperature,
        });

        console.log('🔁 Synthesis result:', synthResponse.text);

        return {
          result: synthResponse.text,
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
          // Add a tiny 150ms buffer PLUS a random jitter up to 1.5 seconds.
          // The jitter prevents the "thundering herd" problem where 5 concurrent promises 
          // all wake up at the exact same millisecond and instantly smash the rate limit again.
          const jiter = Math.floor(Math.random() * 1500);
          backoffMs = explicitDelay + 150 + jiter;
          console.warn(`⏳ [Attempt ${attempt}] Rate limit hit. Extracted exact wait time: ${explicitDelay}ms. Sleeping for ${backoffMs}ms (including jitter)...`);
        } else {
          // Cap exponential backoff at 10 seconds if no explicit delay is given
          backoffMs = Math.min(backoffMs, 10000);
          console.warn(`⏳ [Attempt ${attempt}] Rate limit hit. No exact wait time found. Sleeping for ${backoffMs}ms...`);
        }

        await sleep(backoffMs);
      }
    }

    return {
      result: '',
      steps: 0,
      error: `Agent error: ${String(lastError)}`,
    };
  } catch (err) {
    return {
      result: '',
      steps: 0,
      error: `Agent error: ${String(err)}`,
    };
  }
}
