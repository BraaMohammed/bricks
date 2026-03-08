/**
 * Rate Limiter Utility
 * 
 * Provides functions to execute promises in batches with rate limiting.
 * Essential for handling bulk operations with API providers that have rate limits
 * (e.g., Groq: 30-60 req/min, Gemini: 60 req/min).
 */

import pLimit from 'p-limit';

export async function executeWithRateLimit<T>(
  promises: Array<() => Promise<T>>,
  options: {
    maxConcurrent?: number;
    delayMs?: number;
    onProgress?: (completed: number, total: number) => void;
    signal?: AbortSignal;
  } = {}
): Promise<T[]> {
  const { maxConcurrent = 10, delayMs = 1000, onProgress, signal } = options;

  const limit = pLimit(maxConcurrent);
  const total = promises.length;
  let completed = 0;

  const tasks = promises.map((fn, index) => {
    return limit(async () => {
      // 1. Check for cancellation before starting
      if (signal?.aborted) {
        throw new Error('Rate limited execution cancelled');
      }

      // 2. Stagger starting times slightly within a burst
      // This prevents maxConcurrent requests from hitting the API at the exact same millisecond
      if (delayMs > 0 && maxConcurrent > 1) {
        const staggerMs = (index % maxConcurrent) * Math.min(200, delayMs / maxConcurrent);
        if (staggerMs > 0) {
          await new Promise(resolve => setTimeout(resolve, staggerMs));
        }
      }

      // 3. Execute the promise
      const result = await fn();

      // 4. Update progress
      completed++;
      if (onProgress) {
        onProgress(completed, total);
      }

      // 5. Check for cancellation after completion
      if (signal?.aborted) {
        throw new Error('Rate limited execution cancelled');
      }

      // 6. Hold the concurrency slot for delayMs
      // This acts as a rate limiter per slot, guaranteeing spacing between requests in the same slot
      if (delayMs > 0 && completed < total) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }

      return result;
    });
  });

  return Promise.all(tasks);
}

/**
 * Get rate limit configuration for each provider
 * 
 * @param provider - AI provider name
 * @param model - Optional model name for provider-specific limits
 * @returns Configuration with maxConcurrent, delayMs, and description
 * 
 * @example
 * ```typescript
 * const config = getRateLimitConfig('groq', 'qwen/qwen3-32b');
 * console.log(config.description); // "Groq (60 req/min - Qwen/Kimi models)"
 * ```
 */
export function getRateLimitConfig(provider: string, model?: string): {
  maxConcurrent: number;
  delayMs: number;
  description: string;
} {
  // Normalize provider to lowercase for case-insensitive matching
  const normalizedProvider = provider.toLowerCase();

  console.log('🚦 Rate limiter config requested for:', { provider, normalizedProvider, model });

  switch (normalizedProvider) {
    case 'groq': {
      // Groq Rate Limits (Free Tier):
      // - Standard models: ~30 requests/minute
      // - Qwen/Kimi models: ~60 requests/minute
      // Strategy: Use p-limit. Allow multiple rows to execute concurrently.
      // Since each row might take 5-10s (due to search_web/read_url),
      // running 5 concurrently naturally spreads out the Groq requests over time.
      // Groq limits based on official docs (Free tier base):
      // - qwen3-32b: 60 RPM, 6K TPM
      // - llama-3.3-70b: 30 RPM, 12K TPM
      // - llama-8b: 30 RPM, 6K TPM
      // - kimi: 60 RPM, 10K TPM

      const isQwen = model?.includes('qwen');
      const isLlamaLarge = model?.includes('llama-3.3') || model?.includes('llama-guard'); // These have 12K-15K TPM limits
      const isKimi = model?.includes('kimi');

      // 6K TPM runs out instantly with >= 3 concurrent requests per row (since 1 row = ~3000 tokens due to tool calls)
      let maxConcurrent = 1;
      let delayMs = 3000;
      let description = 'Groq (6000 TPM Limit) - 1 concurrent';

      if (isLlamaLarge || isKimi) {
        // 10K - 15K TPM can support roughly double the parallel token stream before crashing
        maxConcurrent = 2;
        delayMs = 2500;
        description = 'Groq (12K+ TPM Limit - Llama Large/Kimi) - 2 concurrent';
      } else if (isQwen) {
        // Qwen has 60 RPM but only 6K TPM. 
        // Since TPM is the actual bottleneck, we MUST keep concurrency at 1 or max 2.
        maxConcurrent = 2;
        delayMs = 2000;
        description = 'Groq (6000 TPM / 60 RPM - Qwen) - 2 concurrent';
      }

      const config = { maxConcurrent, delayMs, description };
      console.log('✅ Groq config selected:', config);
      return config;
    }

    case 'gemini': {
      const config = {
        maxConcurrent: 30,
        delayMs: 500,
        description: 'Gemini (60 req/min)'
      };
      console.log('✅ Gemini config selected:', config);
      return config;
    }

    case 'openai': {
      const config = {
        maxConcurrent: 50,
        delayMs: 100,
        description: 'OpenAI (high limits)'
      };
      console.log('✅ OpenAI config selected:', config);
      return config;
    }

    case 'ollama': {
      const config = {
        maxConcurrent: 100, // No rate limit for local
        delayMs: 0,
        description: 'Ollama (local - no limits)'
      };
      console.log('✅ Ollama config selected:', config);
      return config;
    }

    case 'puppeteer': {
      const config = {
        maxConcurrent: 100, // Server has queue management - send all at once
        delayMs: 0,
        description: 'Puppeteer (server-side queue handles rate limiting)'
      };
      console.log('✅ Puppeteer config selected:', config);
      return config;
    }

    default: {
      const config = {
        maxConcurrent: 10,
        delayMs: 1000,
        description: 'Default rate limiting'
      };
      console.log('⚠️ Default config selected (unknown provider):', config);
      return config;
    }
  }
}