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

const SYSTEM_PROMPT = `You are a data research agent. Your job is to find specific information by searching the web and reading web pages.

Guidelines:
- Use search_web to find relevant URLs about the topic.
- Use read_url to extract the full content from promising URLs.
- Use parallel_read_url when you have multiple URLs to check at once.
- Be concise and extract only the specific information requested.
- If you cannot find the information after reasonable attempts, say so clearly.
- Return only the final answer – no explanations about what you did.`;

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
    const maxAttempts = 3;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await generateText({
          model: aiModel,
          system: SYSTEM_PROMPT,
          prompt: resolvedInstruction,
          tools,
          stopWhen: stepCountIs(maxSteps),
        });

        console.log('🤖 Agent response:', { text: response.text, steps: response.steps?.length });

        return {
          result: response.text,
          steps: response.steps?.length ?? 0,
        };
      } catch (err) {
        lastError = err;
        if (!isRetryableProviderError(err) || attempt === maxAttempts) {
          break;
        }

        const backoffMs = 1000 * 2 ** (attempt - 1) + Math.floor(Math.random() * 400);
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
