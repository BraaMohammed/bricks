/**
 * Formula Code Generators
 * 
 * This module contains functions that generate executable formula code
 * for different modes (AI, Firecrawl, AI Agents, Puppeteer).
 */

import { detectThinkingSupport, isOllamaModel } from '../providers/aiProviders';
import { isGroqModel } from '../groq';

/**
 * AI Formula generation parameters
 */
export interface AIFormulaParams {
  prompt: string;
  message: string;
  model: string;
  provider: 'openai' | 'ollama' | 'gemini' | 'groq';
  temperature: number;
  maxTokens: number;
  topK: number;
  thinkingMode: boolean;
  ollamaBaseUrl: string;
  customSettings?: {
    hasCustomTemperature?: boolean;
    hasCustomMaxTokens?: boolean;
    hasCustomTopK?: boolean;
  };
}

/**
 * AI Agents configuration
 */
export interface AIAgentsConfig {
  messageCreatorModel: string;
  leadRoleplayModel: string;
  messageCreatorThinking: boolean;
  leadRoleplayThinking: boolean;
  userOfferDetails: string;
  messageCreatorInstructions: string;
  leadRoleplayInstructions: string;
  maxIterations: number;
}

/**
 * Puppeteer configuration
 */
export interface PuppeteerConfig {
  code: string;
  timeout: number;
  headless: boolean;
}

/**
 * Processes column references in templates
 * Replaces {Column Name} with ${row["Column Name"] || ""}
 */
export const processColumnReferences = (template: string): string => {
  return template.replace(/\{([^}]+)\}/g, (match, columnName) => {
    return `\${row["${columnName}"] || ""}`;
  });
};

/**
 * Generates AI formula code for different providers
 */
export const generateAIFormulaCode = (params: AIFormulaParams): string => {
  const {
    prompt,
    message,
    model,
    provider,
    temperature,
    maxTokens,
    topK,
    thinkingMode,
    ollamaBaseUrl,
    customSettings
  } = params;

  // Default to true if customSettings not provided (for backward compatibility)
  const hasCustomTemperature = customSettings?.hasCustomTemperature ?? true;
  const hasCustomMaxTokens = customSettings?.hasCustomMaxTokens ?? true;
  const hasCustomTopK = customSettings?.hasCustomTopK ?? true;

  // Process column references in prompt
  const processedPrompt = processColumnReferences(prompt);
  const fullPrompt = message ? `${processedPrompt}. Additional context: ${message}` : processedPrompt;

  // Determine provider type
  const isOllamaProvider = provider === 'ollama';
  const isGeminiModel = provider === 'gemini';
  const isGroqProvider = provider === 'groq';

  // API endpoint
  let apiEndpoint = '';
  if (isOllamaProvider) {
    apiEndpoint = `${ollamaBaseUrl}/v1/chat/completions`;
  } else if (isGeminiModel) {
    apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  } else if (isGroqProvider) {
    apiEndpoint = 'https://api.groq.com/openai/v1/chat/completions';
  } else {
    apiEndpoint = 'https://api.openai.com/v1/chat/completions';
  }

  // API key handling
  let apiKeyCheck = '';
  if (isOllamaProvider) {
    apiKeyCheck = '// Ollama runs locally without API key\nconst apiKey = null;';
  } else if (isGeminiModel) {
    apiKeyCheck = `const apiKey = localStorage.getItem('gemini_api_key');\n\nif (!apiKey) {\n  return 'Please set your Gemini API key in AI Settings';\n}`;
  } else if (isGroqProvider) {
    apiKeyCheck = `const apiKey = localStorage.getItem('groq_api_key');\n\nif (!apiKey) {\n  return 'Please set your Groq API key in AI Settings';\n}`;
  } else {
    apiKeyCheck = `const apiKey = localStorage.getItem('openai_api_key');\n\nif (!apiKey) {\n  return 'Please set your OpenAI API key in AI Settings';\n}`;
  }

  // Authorization header
  let authHeader = '';
  if (isOllamaProvider) {
    authHeader = `      'Content-Type': 'application/json',`;
  } else if (isGeminiModel) {
    authHeader = `      'x-goog-api-key': apiKey,\n      'Content-Type': 'application/json',`;
  } else if (isGroqProvider) {
    authHeader = `      'Authorization': \`Bearer \${apiKey}\`,\n      'Content-Type': 'application/json',`;
  } else {
    authHeader = `      'Authorization': \`Bearer \${apiKey}\`,\n      'Content-Type': 'application/json',`;
  }

  // Check if this is a reasoning model
  const isReasoningModel = detectThinkingSupport(model);

  // Newer models (GPT-5, o-series) use 'max_completion_tokens'
  const useMaxCompletionTokens = model.startsWith('gpt-5') || model.startsWith('o');

  const providerName = isGeminiModel ? 'Gemini' : isGroqProvider ? 'Groq' : isOllamaProvider ? 'Ollama' : 'OpenAI';

  // Build request body based on provider
  let requestBodyCode = '';
  if (isGeminiModel) {
    requestBodyCode = `
// Build Gemini request body
const generationConfig = {};

// Only include temperature if user explicitly set it
if (${hasCustomTemperature}) {
  generationConfig.temperature = ${temperature};
}

// Only include maxOutputTokens if user explicitly set max tokens
if (${hasCustomMaxTokens}) {
  generationConfig.maxOutputTokens = ${maxTokens};
}

const requestBody = {
  contents: [{
    parts: [{ text: \`${fullPrompt.replace(/`/g, '\\`')}\` }]
  }],
  generationConfig: generationConfig
};`;
  } else if (isOllamaProvider) {
    requestBodyCode = `
// Build Ollama options object conditionally
const ollamaOptions = {};

// Only include temperature if user explicitly set it
if (${hasCustomTemperature}) {
  ollamaOptions.temperature = ${temperature};
}

// Only include num_predict if user explicitly set max tokens
if (${hasCustomMaxTokens}) {
  ollamaOptions.num_predict = ${maxTokens};
}

// Only include top_k if user explicitly set it
if (${hasCustomTopK}) {
  ollamaOptions.top_k = ${topK};
}

const requestBody = {
  model: '${model}',
  messages: [
    {
      role: 'user',
      content: \`${fullPrompt.replace(/`/g, '\\`')}\`
    }
  ],
  stream: false,
  think: ${thinkingMode},  // Use Ollama's native think parameter
  options: ollamaOptions
};`;
  } else {
    // OpenAI and Groq use same request format
    requestBodyCode = `
// Build ${isGroqProvider ? 'Groq' : 'OpenAI'} request body conditionally
const requestBody = {
  model: '${model}',
  messages: [{
    role: 'user',
    content: \`${fullPrompt.replace(/`/g, '\\`')}\`
  }]
};

// Only include temperature if user explicitly set it
if (${hasCustomTemperature}) {
  requestBody.temperature = ${temperature};
}

// Only include token limit if user explicitly set max tokens
if (${hasCustomMaxTokens}) {
  ${useMaxCompletionTokens ? `requestBody.max_completion_tokens = ${maxTokens};` : `requestBody.max_tokens = ${maxTokens};`}
}
`;
  }

  // Ollama fallback response handling (for legacy native API)
  const ollamaFallback = isOllamaProvider ? `
  // Fallback: Handle legacy Ollama native API response structure (if still used)
  if (data.message) {
    let result;
    
    if (data.message.thinking && data.message.content) {
      // Reasoning model with separate thinking and content
      console.log('🧠 Found thinking content:', data.message.thinking.substring(0, 200) + '...');
      console.log('💬 Found response content:', data.message.content.substring(0, 200) + '...');
      
      result = ${thinkingMode} ? 
        \`Thinking:\\n\${data.message.thinking}\\n\\nResponse:\\n\${data.message.content}\` : 
        data.message.content;
    } else if (data.message.content) {
      // Regular response or thinking disabled
      result = data.message.content;
      console.log('📄 Found content:', result.substring(0, 200) + '...');
    } else {
      throw new Error('No content found in Ollama response');
    }
    
    // Apply content filtering if thinking mode is disabled
    ${!thinkingMode ? 'result = filterThinkingContent(result);' : 'console.log("🧠 Thinking mode enabled - keeping all content");'}
    console.log('📄 Final result preview:', result.substring(0, 200) + '...');
    
    return result;
  }` : '';

  return `// ${providerName} Generated Formula${isReasoningModel ? ' (Reasoning Model)' : ''}
${apiKeyCheck}

// Filter thinking content from response
const filterThinkingContent = (content) => {
  if (!content) return content;
  
  console.log('🚿 Original content length:', content.length);
  console.log('🚿 Content preview:', content.substring(0, 200) + '...');
  
  // Remove <thinking>...</thinking> blocks (including nested ones)
  let filtered = content;
  
  // Remove thinking tags and content between them
  const beforeFilter = filtered.length;
  filtered = filtered.replace(/<thinking[^>]*>[\\s\\S]*?<\\/thinking>/g, '');
  filtered = filtered.replace(/<think[^>]*>[\\s\\S]*?<\\/think>/g, '');
  
  const afterFilter = filtered.length;
  
  console.log('🚿 Removed', beforeFilter - afterFilter, 'characters of thinking content');
  
  // Remove any remaining thinking markers
  filtered = filtered.replace(/<\\/thinking>/g, '');
  filtered = filtered.replace(/<thinking[^>]*>/g, '');
  filtered = filtered.replace(/<\\/think>/g, '');
  filtered = filtered.replace(/<think[^>]*>/g, '');
  
  // Clean up extra whitespace
  filtered = filtered.replace(/\\n\\s*\\n\\s*\\n/g, '\\n\\n');
  filtered = filtered.trim();
  
  console.log('🚿 Final filtered content length:', filtered.length);
  return filtered;
};

// Use Promise-based approach with timeout control
console.log('🚀 Making API request with model:', '${model}');
console.log('📝 Prompt:', \`${fullPrompt.replace(/`/g, '\\`')}\`);
console.log('🔧 Is reasoning model:', ${isReasoningModel});
console.log('⚙️ Custom settings - Temperature: ${hasCustomTemperature}, MaxTokens: ${hasCustomMaxTokens}, TopK: ${hasCustomTopK}');
${isReasoningModel ? `console.log('🧠 Thinking mode:', ${thinkingMode});` : ''}
${requestBodyCode}

console.log('📦 Request body:', JSON.stringify(requestBody, null, 2));

return fetch('${apiEndpoint}', {
  method: 'POST',
  headers: {
${authHeader}
  },
  body: JSON.stringify(requestBody)
})
.then(response => {
  console.log('📡 Response status:', response.status);
  console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
  return response.text();
})
.then(responseText => {
  console.log('📡 Raw response text:', responseText.substring(0, 500) + '...');
  
  let data;
  try {
    data = JSON.parse(responseText);
    console.log('✅ Successfully parsed JSON response');
  } catch (parseError) {
    console.error('❌ JSON Parse Error:', parseError);
    console.error('❌ Raw response that failed to parse:', responseText);
    throw new Error(\`JSON Parse Error: \${parseError.message}. Raw response: \${responseText.substring(0, 200)}...\`);
  }
  
  console.log('📊 API Response structure:', Object.keys(data));

  if (data.error) {
    console.error('❌ API Error:', data.error);
    throw new Error(\`API Error: \${data.error.message || JSON.stringify(data.error)}\`);
  }

  // Handle Gemini API response structure
  if (data.candidates && data.candidates.length > 0) {
    const candidate = data.candidates[0];
    if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
      const result = candidate.content.parts[0].text;
      console.log('✅ Found content in Gemini structure');
      console.log('📄 Result preview:', result.substring(0, 200) + '...');
      return result;
    }
  }

  // Handle OpenAI-compatible API response structure (used by both OpenAI and Ollama v1/chat/completions)
  if (data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
    let result = data.choices[0].message.content;
    console.log('✅ Found content in OpenAI-compatible structure');
    console.log('📄 Raw content preview:', result.substring(0, 200) + '...');
    
    // Apply content filtering for reasoning models
    ${!thinkingMode && isReasoningModel ? 'result = filterThinkingContent(result);' : 'console.log("🧠 Keeping original content");'}
    console.log('📄 Final result preview:', result.substring(0, 200) + '...');
    
    return result;
  }
${ollamaFallback}

  // If standard structure is not found, return the whole response for debugging
  console.warn('⚠️ Unexpected response structure:', data);
  throw new Error(\`Unexpected response structure. Keys: \${Object.keys(data).join(', ')}. Data: \${JSON.stringify(data, null, 2)}\`);
})
.catch(error => {
  console.error('💥 Fetch error details:', {
    name: error.name,
    message: error.message,
    stack: error.stack
  });
  return \`Error: \${error.name}: \${error.message}\`;
});`;
};

/**
 * Generates Firecrawl formula code
 */
export const generateFirecrawlFormulaCode = (urlTemplate: string): string => {
  const processedUrl = processColumnReferences(urlTemplate);

  return `// Firecrawl v2 Generated Formula
const apiKey = localStorage.getItem('firecrawl_api_key');

if (!apiKey) {
  return 'Please set your Firecrawl API key in AI Settings';
}

const url = \`${processedUrl}\`;

if (!url) {
  return 'No URL provided';
}

return fetch('https://api.firecrawl.dev/v2/scrape', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${apiKey}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    url: url,
    formats: ['markdown']
  })
})
.then(response => {
  if (!response.ok) {
    throw new Error(\`Firecrawl API error: \${response.status} - \${response.statusText}\`);
  }
  return response.json();
})
.then(data => {
  if (data.success && data.data && data.data.markdown) {
    return data.data.markdown;
  } else if (data.markdown) {
    return data.markdown;
  } else {
    throw new Error(\`Unexpected response: \${JSON.stringify(data, null, 2)}\`);
  }
})
.catch(error => {
  return \`Error: \${error.message}\`;
});`;
};

/**
 * Generates AI Agents formula code
 */
export const generateAIAgentsFormulaCode = (config: AIAgentsConfig): string => {
  return `// AI Copy Agents Formula
const config = ${JSON.stringify(config, null, 2)};
return await runAIAgents(config, row);`;
};

/**
 * Generates Puppeteer formula code
 * NOTE: Does NOT process column references - users should access rowData directly
 * (e.g., rowData.URL instead of {URL}) to avoid conflicts with JavaScript object literals
 */
export const generatePuppeteerFormulaCode = (code: string, timeout: number, headless: boolean): string => {
  // DO NOT process column references for Puppeteer code
  // Users should use rowData.ColumnName directly to avoid { } conflicts
  const puppeteerCode = code;

  return `// Puppeteer Generated Formula (Enhanced Error Handling)  
const puppeteerCodeString = ${JSON.stringify(puppeteerCode)};
const config = {
  timeout: ${timeout},
  headless: ${headless}
};

// Enhanced logging and error handling with UI updates
const logToUI = (message) => {
  console.log(message);
  // Try to update UI logs if available
  try {
    if (window.updatePuppeteerLog) {
      window.updatePuppeteerLog(message);
    }
  } catch (e) {
    // Ignore UI update errors
  }
};

logToUI('🤖 Puppeteer Mode: Starting browser automation');
logToUI('📋 Code length: ' + puppeteerCodeString.length + ' characters');
logToUI('⚙️ Config: ' + JSON.stringify(config, null, 2));
logToUI('📊 Row data keys: ' + Object.keys(row).join(', '));

// Validate inputs before sending
if (config.timeout < 5000 || config.timeout > 60000) {
  console.error('❌ Validation failed: Invalid timeout value:', config.timeout);
  return 'Error: Timeout must be between 5-60 seconds';
}

// API endpoint - using localhost:3000 for dev server
const apiEndpoint = 'http://localhost:3000/api/puppeteer';
logToUI('📡 API endpoint: ' + apiEndpoint);

// Submit job to queue with enhanced error handling
const startTime = Date.now();
logToUI('🚀 Submitting job at: ' + new Date(startTime).toISOString());

return fetch(apiEndpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    code: puppeteerCodeString,
    config: config,
    rowData: row
  })
})
.then(async response => {
  const responseTime = Date.now() - startTime;
  logToUI('📡 Response received in ' + responseTime + 'ms');
  console.log('📊 Response status:', response.status);
  console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
  
  // Handle different response statuses
  if (!response.ok) {
    let errorMessage = \`API error: \${response.status} - \${response.statusText}\`;
    
    try {
      const errorText = await response.text();
      console.error('❌ Error response body:', errorText);
      
      if (errorText) {
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.warn('⚠️ Could not parse error response as JSON');
          errorMessage += \`. Response: \${errorText.substring(0, 200)}\`;
        }
      }
    } catch (textError) {
      console.error('❌ Failed to read error response body:', textError);
    }
    
    throw new Error(errorMessage);
  }
  
  return response.json();
})
.then(data => {
  console.log('📊 Queue response data:', data);
  
  if (data.queued && data.jobId) {
    logToUI('✅ Job successfully queued');
    console.log('🆔 Job ID:', data.jobId);
    console.log('🕒 Queue position:', data.position || 'Unknown');
    console.log('📈 Queue stats:', data.queueStats || 'Not provided');
    
    // Start polling for result
    return pollForResult(data.jobId, startTime);
  } else {
    console.error('❌ Invalid queue response structure');
    console.error('📊 Expected: {queued: true, jobId: string}, Got:', data);
    throw new Error(\`Invalid queue response: \${JSON.stringify(data)}\`);
  }
})
.catch(error => {
  const totalTime = Date.now() - startTime;
  console.error('💥 Puppeteer submission failed after', totalTime, 'ms');
  console.error('💥 Error details:', {
    name: error.name,
    message: error.message,
    stack: error.stack
  });
  
  // Provide user-friendly error messages
  if (error.message.includes('Failed to fetch')) {
    return 'Error: Cannot connect to Puppeteer API. Make sure the dev server is running on localhost:3000';
  } else if (error.message.includes('Network')) {
    return 'Error: Network connection failed. Check your internet connection';
  } else if (error.message.includes('500')) {
    return 'Error: Server error occurred. Check server logs for details';
  } else if (error.message.includes('404')) {
    return 'Error: Puppeteer API endpoint not found. Make sure the API server is running';
  } else {
    return \`Error: \${error.message}\`;
  }
});

// Enhanced polling function with better logging and error handling
async function pollForResult(jobId, startTime) {
  const maxAttempts = 60; // 5 minutes max (5s intervals)
  const pollInterval = 5000; // 5 seconds
  let attempts = 0;
  
  console.log('🔄 Starting result polling');
  console.log('🆔 Job ID:', jobId);
  console.log('⏱️ Max attempts:', maxAttempts);
  console.log('🕒 Poll interval:', pollInterval, 'ms');
  
  while (attempts < maxAttempts) {
    attempts++;
    const pollStartTime = Date.now();
    
    try {
      console.log(\`🔄 Poll attempt \${attempts}/\${maxAttempts}\`);
      
      const statusEndpoint = \`http://localhost:3000/api/puppeteer/status/\${jobId}\`;
      const response = await fetch(statusEndpoint);
      
      const pollResponseTime = Date.now() - pollStartTime;
      console.log(\`📡 Status check completed in \${pollResponseTime}ms\`);
      
      if (!response.ok) {
        console.warn(\`⚠️ Status check failed: \${response.status} - \${response.statusText}\`);
        throw new Error(\`Status API error: \${response.status}\`);
      }
      
      const data = await response.json();
      console.log(\`📊 Job status: \${data.status}\`);
      
      if (data.status === 'completed') {
        const totalTime = Date.now() - startTime;
        console.log('✅ Puppeteer job completed successfully');
        console.log(\`⏱️ Total execution time: \${totalTime}ms\`);
        console.log('📄 Result preview:', typeof data.result === 'string' ? 
          data.result.substring(0, 100) + '...' : 
          JSON.stringify(data.result).substring(0, 100) + '...');
        
        // Update UI with success result if available
        try {
          if (window.setPuppeteerLastResult) {
            window.setPuppeteerLastResult({ type: 'success', message: data.result });
          }
        } catch (e) {
          // Ignore UI update errors
        }
        
        return data.result;
      } else if (data.status === 'failed') {
        const totalTime = Date.now() - startTime;
        console.error('❌ Puppeteer job failed');
        console.error(\`⏱️ Failed after: \${totalTime}ms\`);
        console.error('❌ Error details:', data.error);
        console.error('📊 Full error data:', data);
        
        // Update UI with error result if available
        try {
          if (window.setPuppeteerLastResult) {
            window.setPuppeteerLastResult({ type: 'error', message: data.error || 'Job failed without specific error message' });
          }
        } catch (e) {
          // Ignore UI update errors
        }
        
        return \`Error: \${data.error || 'Job failed without specific error message'}\`;
      } else if (data.status === 'pending' || data.status === 'processing') {
        const elapsed = Date.now() - startTime;
        console.log(\`⏳ Job \${data.status}, elapsed: \${Math.round(elapsed/1000)}s\`);
        console.log('🔢 Queue position:', data.position || 'Unknown');
        
        if (data.estimatedWaitTime) {
          console.log('⏰ Estimated wait time:', data.estimatedWaitTime, 'ms');
        }
        
        // Wait before next poll
        console.log(\`⏸️ Waiting \${pollInterval}ms before next poll...\`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } else {
        console.warn('⚠️ Unknown job status:', data.status);
        console.warn('📊 Full status data:', data);
        
        // Still wait and continue for unknown statuses
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
      
    } catch (pollError) {
      console.error(\`❌ Poll attempt \${attempts} failed:\`, pollError);
      
      // For network errors, wait and retry
      if (pollError.message.includes('Failed to fetch') || pollError.message.includes('Network')) {
        console.log('🔄 Network error during polling, will retry...');
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        continue;
      }
      
      // For other errors, still retry but log more details
      console.error('📊 Poll error details:', {
        name: pollError.name,
        message: pollError.message,
        stack: pollError.stack
      });
      
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }
  
  // Timeout reached
  const totalTime = Date.now() - startTime;
  console.error('⏰ Polling timeout reached');
  console.error(\`⏱️ Total time elapsed: \${Math.round(totalTime/1000)}s\`);
  console.error(\`🔄 Total polling attempts: \${attempts}\`);
  
  return \`Error: Job timeout - execution took longer than \${Math.round(maxAttempts * pollInterval / 1000)} seconds. Check server performance or increase timeout.\`;
}`;
};
