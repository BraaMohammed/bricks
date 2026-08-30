import { isGeminiModel, sendGeminiChatRequest } from './gemini';
import { isGroqModel, sendGroqChatRequest } from './groq';
import type { AIProvider } from './constants/aiModels';

interface AgentConfig {
  creatorProvider: AIProvider;
  roleplayProvider: AIProvider;
  messageCreatorModel: string;
  leadRoleplayModel: string;
  messageCreatorThinking: boolean;
  leadRoleplayThinking: boolean;
  messageCreatorInstructions: string;
  leadRoleplayInstructions: string;
  maxIterations: number;
}

// Helper function to detect if a model is from Ollama
function isOllamaModel(modelName: string): boolean {
  // Check if model name matches typical Ollama patterns
  const ollamaPatterns = [
    'llama', 'mistral', 'codellama', 'vicuna', 'alpaca', 'orca', 
    'phi', 'neural-chat', 'starling', 'openhermes', 'dolphin',
    'wizardlm', 'evo', 'gemma', 'qwen', 'mixtral'
  ];
  
  const lowerModel = modelName.toLowerCase();
  return ollamaPatterns.some(pattern => lowerModel.includes(pattern)) ||
         lowerModel.includes(':') && !lowerModel.startsWith('gpt'); // Ollama models often have version tags
}

function getModelProvider(modelName: string): AIProvider {
  if (isGeminiModel(modelName)) {
    return 'gemini';
  } else if (isGroqModel(modelName)) {
    return 'groq';
  } else if (isOllamaModel(modelName)) {
    return 'ollama';
  } else {
    // If it's none of the above, we'll let the calling code pass the explicit provider from config
    return 'openai';
  }
}

// Helper function to get API endpoint and headers
function getApiConfig(modelName: string, provider: AIProvider) {
  if (provider === 'waterfall') {
    const backendBase = localStorage.getItem('backend_api_url') || 'http://localhost:3000';
    return {
      endpoint: `${backendBase.replace(/\/+$/, '')}/api/ai/v1/chat/completions`,
      headers: {
        'Content-Type': 'application/json',
      },
      requiresApiKey: false,
      provider: 'waterfall' as const,
    };
  } else if (provider === 'gemini') {
    const apiKey = localStorage.getItem('gemini_api_key');
    return {
      endpoint: '', // Gemini uses custom API calls
      headers: {},
      requiresApiKey: true,
      apiKey,
      provider: 'gemini' as const
    };
  } else if (provider === 'groq') {
    const apiKey = localStorage.getItem('groq_api_key');
    return {
      endpoint: 'https://api.groq.com/openai/v1/chat/completions',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      requiresApiKey: true,
      apiKey,
      provider: 'groq' as const
    };
  } else if (provider === 'ollama') {
    const baseUrl = localStorage.getItem('ollama_base_url') || 'http://localhost:11434';
    return {
      endpoint: `${baseUrl}/v1/chat/completions`,
      headers: {
        'Content-Type': 'application/json'
      },
      requiresApiKey: false,
      provider: 'ollama' as const
    };
  } else if (provider.startsWith('custom:')) {
    // Handle custom providers
    let customProvider;
    try {
      const raw = localStorage.getItem('custom_ai_providers');
      if (raw) {
        const providers = JSON.parse(raw);
        customProvider = providers.find((p: any) => p.id === provider);
      }
    } catch (e) {
      console.error('Failed to parse custom providers', e);
    }

    if (!customProvider) {
      throw new Error(`Custom provider ${provider} not found`);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (customProvider.apiKey) {
      headers['Authorization'] = `Bearer ${customProvider.apiKey}`;
    }

    return {
      endpoint: `${customProvider.baseUrl}/chat/completions`,
      headers,
      requiresApiKey: false, // Don't enforce here, it might be a local model without auth
      apiKey: customProvider.apiKey,
      provider: provider as AIProvider
    };
  } else {
    const apiKey = localStorage.getItem('openai_api_key');
    return {
      endpoint: 'https://api.openai.com/v1/chat/completions',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      requiresApiKey: true,
      apiKey,
      provider: 'openai' as const
    };
  }
}

interface MessageResult {
  message: string;
}

interface FeedbackResult {
  approved: boolean;
  score: number;
  feedback: string;
}

interface HistoryItem {
  iteration: number;
  created_message: string;
  lead_feedback: FeedbackResult;
  timestamp: string;
}

type RowData = Record<string, string | number | boolean | null | undefined>;

export async function runAIAgents(config: AgentConfig, row: RowData): Promise<string> {
  // Check API requirements for both models
  const creatorConfig = getApiConfig(config.messageCreatorModel, config.creatorProvider);
  const roleplayConfig = getApiConfig(config.leadRoleplayModel, config.roleplayProvider);
  
  // Validate API keys for OpenAI models
  if (creatorConfig.requiresApiKey && !creatorConfig.apiKey) {
    return 'Please set OpenAI API key in AI Settings for Message Creator model';
  }
  if (roleplayConfig.requiresApiKey && !roleplayConfig.apiKey) {
    return 'Please set OpenAI API key in AI Settings for Lead Roleplay model';
  }

  console.log('🤖 AI Copy Agents Starting...', { 
    leadData: row, 
    config,
    creatorProvider: config.creatorProvider,
    roleplayProvider: config.roleplayProvider
  });

  const chatHistory: HistoryItem[] = [];
  let currentMessage = '';
  let approved = false;
  let finalResult = '';

  try {
    for (let i = 0; i < config.maxIterations && !approved; i++) {
      console.log(`\n🔄 Iteration ${i + 1}/${config.maxIterations}`);
      
      // Message Creator Agent
      console.log('✍️ Message Creator Agent working...');
      const lastIteration = chatHistory.length > 0 ? chatHistory[chatHistory.length - 1] : null;
      const messageResult = await callMessageCreator(config, row, lastIteration);
      currentMessage = messageResult.message || messageResult.toString();
      
      console.log('📝 Created message:', messageResult);
      
      // Lead Roleplay Agent
      console.log('🎭 Lead Roleplay Agent evaluating...');
      const feedback = await callLeadRoleplay(config, row, currentMessage);
      
      console.log('🎯 Lead feedback:', feedback);
      
      // Add to chat history
      const historyItem: HistoryItem = {
        iteration: i + 1,
        created_message: currentMessage,
        lead_feedback: feedback,
        timestamp: new Date().toISOString()
      };
      
      chatHistory.push(historyItem);
      approved = feedback.approved;
      
      if (approved) {
        console.log('✅ Message APPROVED by lead agent!');
        finalResult = currentMessage;
      } else {
        console.log(`❌ Message rejected (Score: ${feedback.score}/10). Continuing...`);
      }
    }
    
    if (!approved) {
      console.log(`⚠️ Max iterations reached without approval. Using last message.`);
      finalResult = currentMessage || 'Failed to generate message';
    }
    
    console.log('🏁 Final result:', finalResult);
    console.log('📊 Full chat history:', chatHistory);
    
    return finalResult;
    
  } catch (error) {
    console.error('❌ AI Copy Agents Error:', error);
    return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

async function callMessageCreator(
  config: AgentConfig, 
  row: RowData, 
  lastIteration: HistoryItem | null
): Promise<MessageResult> {
  const apiConfig = getApiConfig(config.messageCreatorModel, config.creatorProvider);
  
  const baseCreatorInstructions = `You are an expert copywriter creating personalized DM messages. 

CRITICAL: You MUST respond with ONLY a valid JSON object. Do NOT include explanations, reasoning, markdown formatting, or any other text. Output ONLY the raw JSON object.

REQUIRED JSON FORMAT:
{
  "message": "Your personalized message here"
}

CONTEXT:
- Previous Attempt Feedback: {previousFeedback}
- Instructions: {customInstructions}

GUIDELINES:
- Keep under 200 characters for DMs
- Integrate offer naturally
- Personalize using the lead context provided in instructions
- Fix the issues mentioned in the previous attempt feedback (if any)
- Follow user's additional instructions
- Include clear value proposition
- End with soft CTA`;

  // Resolve {ColumnName} in creator instructions
  let resolvedCreatorInstructions = config.messageCreatorInstructions || 'No additional instructions.';
  for (const [key, value] of Object.entries(row)) {
    resolvedCreatorInstructions = resolvedCreatorInstructions.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value || ''));
  }

  const previousFeedbackStr = lastIteration 
    ? `Failed Message: "${lastIteration.created_message}"\nFeedback: "${lastIteration.lead_feedback.feedback}"\nScore: ${lastIteration.lead_feedback.score}/10` 
    : 'None (First attempt)';

  const creatorPrompt = baseCreatorInstructions
    .replace('{previousFeedback}', previousFeedbackStr)
    .replace('{customInstructions}', resolvedCreatorInstructions);

  const creatorRequestBody = {
    model: config.messageCreatorModel,
    messages: [{
      role: 'user',
      content: creatorPrompt
    }],
    response_format: { type: "json_object" as const },
    // GPT-5 and reasoning models need much higher token limits (reasoning + output)
    ...(config.messageCreatorModel.startsWith('gpt-5') || config.messageCreatorModel.startsWith('o3') || config.messageCreatorModel.startsWith('o4')) 
      ? { max_completion_tokens: 25000 } 
      : { max_tokens: 500 }
  };

  console.log('📤 Creator request:', JSON.stringify(creatorRequestBody, null, 2));

  let rawCreatorContent: string;

  // Handle Gemini API calls differently
  if (apiConfig.provider === 'gemini') {
    try {
      rawCreatorContent = await sendGeminiChatRequest(
        config.messageCreatorModel as any,
        [{ role: 'user', content: creatorPrompt }],
        { temperature: 0.7, maxOutputTokens: 2048 }
      );
      console.log('📥 Gemini creator response:', rawCreatorContent);
    } catch (error) {
      throw new Error(`Gemini Creator API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else if (apiConfig.provider === 'groq') {
    try {
      rawCreatorContent = await sendGroqChatRequest(
        config.messageCreatorModel as any,
        [{ role: 'user', content: creatorPrompt }],
        { temperature: 0.7, maxTokens: 2048 }
      );
      console.log('📥 Groq creator response:', rawCreatorContent);
    } catch (error) {
      throw new Error(`Groq Creator API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else {
    // OpenAI and Ollama use standard chat completions API
    const creatorResponse = await fetch(apiConfig.endpoint, {
      method: 'POST',
      headers: apiConfig.headers,
      body: JSON.stringify(creatorRequestBody)
    });
    
    if (!creatorResponse.ok) {
      const errorText = await creatorResponse.text();
      console.error('Creator API Error Response:', errorText);
      
      // Provide specific error messages for different scenarios
      if (isOllamaModel(config.messageCreatorModel)) {
        if (creatorResponse.status === 0 || errorText.includes('fetch')) {
          throw new Error(`Ollama connection failed. Make sure Ollama is running on localhost:11434`);
        } else if (creatorResponse.status === 404) {
          throw new Error(`Model '${config.messageCreatorModel}' not found in Ollama. Run: ollama pull ${config.messageCreatorModel}`);
        }
      }
      
      throw new Error(`Creator API error: ${creatorResponse.status} - ${errorText}`);
    }
    
    const creatorData = await creatorResponse.json();
    console.log('📥 Creator response:', creatorData);
    
    // Check if response has the expected structure
    if (!creatorData.choices || !creatorData.choices[0]) {
      console.error('Unexpected API response structure:', creatorData);
      throw new Error(`Unexpected API response structure: ${JSON.stringify(creatorData)}`);
    }
    
    // Handle different response structures for newer models
    const choice = creatorData.choices[0];
    rawCreatorContent = choice.message?.content || choice.content || '';
    console.log('📄 Raw creator content:', rawCreatorContent);
    console.log('📄 Full choice object:', choice);
    
    if (!rawCreatorContent || rawCreatorContent.trim() === '') {
      console.error('Empty content from Creator API. Full response:', JSON.stringify(creatorData, null, 2));
      throw new Error(`Empty response from Creator API. Response: ${JSON.stringify(creatorData)}`);
    }
  }
  
  try {
    return JSON.parse(rawCreatorContent) as MessageResult;
  } catch (parseError) {
    console.error('JSON parse error for creator response:', parseError);
    console.error('Raw content that failed to parse:', rawCreatorContent);
    // If JSON parsing fails, try to extract message from raw text
    return { message: rawCreatorContent };
  }
}

async function callLeadRoleplay(
  config: AgentConfig, 
  row: RowData, 
  currentMessage: string
): Promise<FeedbackResult> {
  const apiConfig = getApiConfig(config.leadRoleplayModel, config.roleplayProvider);
  
  const baseRoleplayInstructions = `You roleplay as this lead prospect. Evaluate the message critically and decide approval.

CRITICAL: You MUST respond with ONLY a valid JSON object. Do NOT include explanations, reasoning, markdown formatting, or any other text. Output ONLY the raw JSON object.

REQUIRED JSON FORMAT:
{
  "approved": true/false,
  "score": 1-10,
  "feedback": "Exactly one concise sentence of feedback explaining your decision."
}

CONTEXT:
- Message to Evaluate: {message}
- Instructions: {customInstructions}

ROLEPLAY AS: The person described in the instructions.
ONLY approve (true) if message is 8+ score and genuinely compelling.
Consider: relevance, personalization, offer appeal, professionalism, likelihood to respond.`;

  // Resolve {ColumnName} in roleplay instructions
  let resolvedRoleplayInstructions = config.leadRoleplayInstructions || 'No additional instructions.';
  for (const [key, value] of Object.entries(row)) {
    resolvedRoleplayInstructions = resolvedRoleplayInstructions.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value || ''));
  }

  const roleplayPrompt = baseRoleplayInstructions
    .replace('{message}', currentMessage)
    .replace('{customInstructions}', resolvedRoleplayInstructions);

  const roleplayRequestBody = {
    model: config.leadRoleplayModel,
    messages: [{
      role: 'user',
      content: roleplayPrompt
    }],
    response_format: { type: "json_object" as const },
    // GPT-5 and reasoning models need much higher token limits (reasoning + output)
    ...(config.leadRoleplayModel.startsWith('gpt-5') || config.leadRoleplayModel.startsWith('o3') || config.leadRoleplayModel.startsWith('o4')) 
      ? { max_completion_tokens: 25000 } 
      : { max_tokens: 500 }
  };

  console.log('📤 Roleplay request:', JSON.stringify(roleplayRequestBody, null, 2));

  let rawRoleplayContent: string;

  // Handle Gemini API calls differently
  if (apiConfig.provider === 'gemini') {
    try {
      rawRoleplayContent = await sendGeminiChatRequest(
        config.leadRoleplayModel as any,
        [{ role: 'user', content: roleplayPrompt }],
        { temperature: 0.7, maxOutputTokens: 2048 }
      );
      console.log('📥 Gemini roleplay response:', rawRoleplayContent);
    } catch (error) {
      throw new Error(`Gemini Roleplay API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else if (apiConfig.provider === 'groq') {
    try {
      rawRoleplayContent = await sendGroqChatRequest(
        config.leadRoleplayModel as any,
        [{ role: 'user', content: roleplayPrompt }],
        { temperature: 0.7, maxTokens: 2048 }
      );
      console.log('📥 Groq roleplay response:', rawRoleplayContent);
    } catch (error) {
      throw new Error(`Groq Roleplay API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else {
    // OpenAI and Ollama use standard chat completions API
    const roleplayResponse = await fetch(apiConfig.endpoint, {
      method: 'POST',
      headers: apiConfig.headers,
      body: JSON.stringify(roleplayRequestBody)
    });
    
    if (!roleplayResponse.ok) {
      const errorText = await roleplayResponse.text();
      console.error('Roleplay API Error Response:', errorText);
      
      // Provide specific error messages for different scenarios
      if (isOllamaModel(config.leadRoleplayModel)) {
        if (roleplayResponse.status === 0 || errorText.includes('fetch')) {
          throw new Error(`Ollama connection failed. Make sure Ollama is running on localhost:11434`);
        } else if (roleplayResponse.status === 404) {
          throw new Error(`Model '${config.leadRoleplayModel}' not found in Ollama. Run: ollama pull ${config.leadRoleplayModel}`);
        }
      }
      
      throw new Error(`Roleplay API error: ${roleplayResponse.status} - ${errorText}`);
    }
    
    const roleplayData = await roleplayResponse.json();
    console.log('📥 Roleplay response:', roleplayData);
    
    // Check if response has the expected structure
    if (!roleplayData.choices || !roleplayData.choices[0]) {
      console.error('Unexpected API response structure:', roleplayData);
      throw new Error(`Unexpected API response structure: ${JSON.stringify(roleplayData)}`);
    }
    
    // Handle different response structures for newer models
    const choice = roleplayData.choices[0];
    rawRoleplayContent = choice.message?.content || choice.content || '';
    console.log('📄 Raw roleplay content:', rawRoleplayContent);
    console.log('📄 Full choice object:', choice);
    
    if (!rawRoleplayContent || rawRoleplayContent.trim() === '') {
      console.error('Empty content from Roleplay API. Full response:', JSON.stringify(roleplayData, null, 2));
      throw new Error(`Empty response from Roleplay API. Response: ${JSON.stringify(roleplayData)}`);
    }
  }
  
  try {
    const feedback = JSON.parse(rawRoleplayContent) as FeedbackResult;
    
    // Ensure feedback has required fields
    if (typeof feedback.approved === 'undefined') {
      feedback.approved = false;
    }
    if (typeof feedback.score === 'undefined') {
      feedback.score = 5;
    }
    
    return feedback;
  } catch (parseError) {
    console.error('JSON parse error for roleplay response:', parseError);
    console.error('Raw content that failed to parse:', rawRoleplayContent);
    // If JSON parsing fails, create a fallback feedback object
    return { 
      approved: false, 
      score: 5, 
      feedback: rawRoleplayContent
    };
  }
}