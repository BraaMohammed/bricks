interface AgentConfig {
  messageCreatorModel: string;
  leadRoleplayModel: string;
  messageCreatorThinking: boolean;
  leadRoleplayThinking: boolean;
  userOfferDetails: string;
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

// Helper function to get API endpoint and headers
function getApiConfig(modelName: string) {
  const isOllama = isOllamaModel(modelName);
  
  if (isOllama) {
    const baseUrl = localStorage.getItem('ollama_base_url') || 'http://localhost:11434';
    return {
      endpoint: `${baseUrl}/v1/chat/completions`,
      headers: {
        'Content-Type': 'application/json'
      },
      requiresApiKey: false
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
      apiKey
    };
  }
}

interface MessageResult {
  message: string;
  reasoning?: string;
  improvements_made?: string[];
  personalization_used?: string[];
}

interface FeedbackResult {
  approved: boolean;
  score: number;
  feedback: string;
  specific_issues?: string[];
  suggested_improvements?: string[];
  decision_reasoning?: string;
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
  const creatorConfig = getApiConfig(config.messageCreatorModel);
  const roleplayConfig = getApiConfig(config.leadRoleplayModel);
  
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
    creatorProvider: isOllamaModel(config.messageCreatorModel) ? 'Ollama' : 'OpenAI',
    roleplayProvider: isOllamaModel(config.leadRoleplayModel) ? 'Ollama' : 'OpenAI'
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
      const messageResult = await callMessageCreator(config, row, chatHistory);
      currentMessage = messageResult.message || messageResult.toString();
      
      console.log('📝 Created message:', messageResult);
      
      // Lead Roleplay Agent
      console.log('🎭 Lead Roleplay Agent evaluating...');
      const feedback = await callLeadRoleplay(config, row, currentMessage, chatHistory);
      
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
  chatHistory: HistoryItem[]
): Promise<MessageResult> {
  const apiConfig = getApiConfig(config.messageCreatorModel);
  
  const baseCreatorInstructions = `You are an expert copywriter creating personalized DM messages. 

CRITICAL: You MUST respond with ONLY a valid JSON object. No other text before or after.

REQUIRED JSON FORMAT:
{
  "message": "Your personalized message here",
  "reasoning": "Why this approach was chosen",
  "improvements_made": ["List of improvements based on previous feedback"],
  "personalization_used": ["Specific data points used for personalization"]
}

CONTEXT:
- Lead Data: {columns}
- User's Offer: {userOfferDetails}
- Chat History: {previousIterations}
- Additional Instructions: {customInstructions}

GUIDELINES:
- Keep under 200 characters for DMs
- Integrate user's offer naturally
- Personalize using lead data
- Learn from chat history feedback
- Follow user's additional instructions
- Include clear value proposition
- End with soft CTA

REMEMBER: Output ONLY the JSON object, nothing else.`;

  const creatorPrompt = baseCreatorInstructions
    .replace('{columns}', JSON.stringify(row))
    .replace('{userOfferDetails}', config.userOfferDetails || 'No offer details provided')
    .replace('{previousIterations}', JSON.stringify(chatHistory))
    .replace('{customInstructions}', config.messageCreatorInstructions || 'No additional instructions.');

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
  const rawCreatorContent = choice.message?.content || choice.content || '';
  console.log('📄 Raw creator content:', rawCreatorContent);
  console.log('📄 Full choice object:', choice);
  
  if (!rawCreatorContent || rawCreatorContent.trim() === '') {
    console.error('Empty content from Creator API. Full response:', JSON.stringify(creatorData, null, 2));
    throw new Error(`Empty response from Creator API. Response: ${JSON.stringify(creatorData)}`);
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
  currentMessage: string,
  chatHistory: HistoryItem[]
): Promise<FeedbackResult> {
  const apiConfig = getApiConfig(config.leadRoleplayModel);
  
  const baseRoleplayInstructions = `You roleplay as this lead prospect. Evaluate the message critically and decide approval.

CRITICAL: You MUST respond with ONLY a valid JSON object. No other text before or after.

REQUIRED JSON FORMAT:
{
  "approved": true/false,
  "score": 1-10,
  "feedback": "Your honest reaction as the lead",
  "specific_issues": ["List specific problems"],
  "suggested_improvements": ["Specific actionable suggestions"],
  "decision_reasoning": "Why you approved/rejected this message"
}

CONTEXT:
- Your Profile: {columns}
- Message to Evaluate: {message}
- Previous Iterations: {chatHistory}
- Additional Instructions: {customInstructions}

ROLEPLAY AS: {lead characteristics based on data}
ONLY approve (true) if message is 8+ score and genuinely compelling.
Consider: relevance, personalization, offer appeal, professionalism, likelihood to respond.

REMEMBER: Output ONLY the JSON object, nothing else.`;

  const roleplayPrompt = baseRoleplayInstructions
    .replace('{columns}', JSON.stringify(row))
    .replace('{message}', currentMessage)
    .replace('{chatHistory}', JSON.stringify(chatHistory))
    .replace('{customInstructions}', config.leadRoleplayInstructions || 'No additional instructions.');

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
  const rawRoleplayContent = choice.message?.content || choice.content || '';
  console.log('📄 Raw roleplay content:', rawRoleplayContent);
  console.log('📄 Full choice object:', choice);
  
  if (!rawRoleplayContent || rawRoleplayContent.trim() === '') {
    console.error('Empty content from Roleplay API. Full response:', JSON.stringify(roleplayData, null, 2));
    throw new Error(`Empty response from Roleplay API. Response: ${JSON.stringify(roleplayData)}`);
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
      feedback: rawRoleplayContent, 
      specific_issues: ['Failed to parse JSON response'],
      suggested_improvements: ['Try again with clearer instructions'],
      decision_reasoning: 'Could not parse response properly'
    };
  }
}