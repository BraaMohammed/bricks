/**
 * Rate Limiter Utility
 * 
 * Provides functions to execute promises in batches with rate limiting.
 * Essential for handling bulk operations with API providers that have rate limits
 * (e.g., Groq: 30-60 req/min, Gemini: 60 req/min).
 */

/**
 * Execute promises in batches with rate limiting
 * 
 * @param promises - Array of promise-returning functions (not promises themselves!)
 * @param options - Configuration options for rate limiting
 * @returns Promise that resolves with array of results
 * 
 * @example
 * ```typescript
 * const tasks = rows.map((row, i) => async () => {
 *   return await processRow(row, i);
 * });
 * 
 * const results = await executeWithRateLimit(tasks, {
 *   maxConcurrent: 10,
 *   delayMs: 1000,
 *   onProgress: (completed, total) => console.log(`${completed}/${total}`)
 * });
 * ```
 */
export async function executeWithRateLimit<T>(
  // <T> is a TypeScript generic - it means this function works with any type
  // Example: If you pass functions that return strings, T = string
  //          If you pass functions that return numbers, T = number
  //          If you pass functions that return {success: boolean, data: any}, T = {success: boolean, data: any}
  
  promises: Array<() => Promise<T>>,
  // promises is an array of FUNCTIONS that return promises
  // Each function is: () => Promise<T>
  // Example: async () => { return someResult; }
  // NOT: [promise1, promise2] - we need functions that create promises!
  
  options: {
    maxConcurrent?: number;      // How many requests to run at once (batch size)
    delayMs?: number;             // How long to wait between batches (in milliseconds)
    onProgress?: (completed: number, total: number) => void;  // Callback for progress updates
    signal?: AbortSignal;         // Signal to cancel execution
  } = {}
  // The "= {}" means: if caller doesn't pass options, use empty object as default
  // They CAN still pass options! Example: executeWithRateLimit(tasks, { maxConcurrent: 20 })
  // Without "= {}", you'd have to always pass options, even if empty: executeWithRateLimit(tasks, {})
): Promise<T[]> {
  // Destructure options with default values
  // If options.maxConcurrent is not provided, use 10
  // If options.delayMs is not provided, use 1000
  const {
    maxConcurrent = 10,
    delayMs = 1000,
    onProgress,
    signal
  } = options;

  // Array to store all results from executed promises
  const results: T[] = [];  // T[] means "array of T" - same type as the promises return
  const total = promises.length;  // Total number of tasks to execute
  
  // MAIN LOOP: Process promises in batches
  // Start at 0, increment by maxConcurrent each time
  // Example: If maxConcurrent=10 and total=100, loop runs: 0, 10, 20, 30...90
  for (let i = 0; i < total; i += maxConcurrent) {
    // STEP 1: Check if user cancelled execution
    if (signal?.aborted) {
      throw new Error('Rate limited execution cancelled');
    }

    // STEP 2: Get the next batch of functions to execute
    // slice(i, i + maxConcurrent) gets functions from index i to i+maxConcurrent
    // Example: slice(0, 10) gets first 10 functions, slice(10, 20) gets next 10, etc.
    const batch = promises.slice(i, i + maxConcurrent);
    
    // STEP 3: Execute all functions in this batch simultaneously
    // batch.map(fn => fn()) calls each function to create a promise
    // Promise.all() waits for all promises in the batch to complete
    const batchResults = await Promise.all(batch.map(fn => fn()));
    
    // STEP 4: Add the results from this batch to our results array
    results.push(...batchResults);  // ...spread operator adds all items individually
    
    // STEP 5: Call progress callback if provided
    if (onProgress) {
      // Report how many tasks have been completed so far
      // Use Math.min to avoid reporting more than total (in case of rounding)
      onProgress(Math.min(i + maxConcurrent, total), total);
    }
    
    // STEP 6: Wait before processing next batch (rate limiting!)
    // Only wait if there are more batches to process (not on last batch)
    if (i + maxConcurrent < total) {
      // Create a promise that resolves after delayMs milliseconds
      // This creates the delay between batches to avoid hitting rate limits
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  // Return all results after all batches are complete
  return results;
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
  switch (provider) {
    case 'groq': {
      // Groq Rate Limits:
      // - Standard models: 30 requests/minute = 0.5 req/second
      // - Qwen/Kimi models: 60 requests/minute = 1 req/second
      // Strategy: Send small batches with longer delays to stay under limit
      const isHigherLimit = model?.includes('qwen') || model?.includes('kimi');
      return {
        maxConcurrent: isHigherLimit ? 4 : 2,  // Very small batches
        delayMs: isHigherLimit ? 5000 : 5000,  // 5 second delay between batches
        description: isHigherLimit 
          ? 'Groq (60 req/min - Qwen/Kimi models) - 4 req every 5s'
          : 'Groq (30 req/min) - 2 req every 5s'
      };
    }
    
    case 'gemini':
      return {
        maxConcurrent: 30,
        delayMs: 500,
        description: 'Gemini (60 req/min)'
      };
    
    case 'openai':
      return {
        maxConcurrent: 50,
        delayMs: 100,
        description: 'OpenAI (high limits)'
      };
    
    case 'ollama':
      return {
        maxConcurrent: 100, // No rate limit for local
        delayMs: 0,
        description: 'Ollama (local - no limits)'
      };
    
    case 'puppeteer':
      return {
        maxConcurrent: 100, // Server has queue management - send all at once
        delayMs: 0,
        description: 'Puppeteer (server-side queue handles rate limiting)'
      };
    
    default:
      return {
        maxConcurrent: 10,
        delayMs: 1000,
        description: 'Default rate limiting'
      };
  }
}
