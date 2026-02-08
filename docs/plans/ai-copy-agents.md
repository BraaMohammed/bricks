# AI Copy Agents Feature Plan - 30 Minute Implementation

## Overview
This document outlines the RAPID implementation plan for a dual-AI agent system that creates and refines DM (Direct Message) messages for leads through roleplay iterations. The feature will be integrated into the FormulaEditor component as a new mode alongside the existing AI and Firecrawl modes.

## Feature Description

### Core Concept
Two AI agents work together in an iterative loop with structured outputs:
1. **Message Creator Agent**: Creates DM messages for leads based on their data + chat history + user's offer details
2. **Lead Roleplay Agent**: Acts as the lead, provides structured feedback with APPROVE/REJECT decision
3. **Iterative Refinement**: They continue until lead agent APPROVES or max iterations reached
4. **Chat History**: Full conversation history passed internally (console only, not in table output)
5. **User Instructions**: Both agents can receive additional custom instructions from user

### Key Benefits
- Automated personalized outreach with user's offer details
- Quality assurance through AI roleplay with approval system
- Scalable lead engagement
- Internal chat history prevents repeated mistakes (console logging only)
- User-customizable instructions for both agents
- Structured outputs for reliable loop control

## Technical Requirements

### Structured Output Format
```typescript
interface MessageCreatorOutput {
  message: string;
  reasoning: string;
  improvements_made: string[];
  personalization_used: string[];
}

interface LeadRoleplayOutput {
  approved: boolean;
  score: number; // 1-10
  feedback: string;
  specific_issues: string[];
  suggested_improvements: string[];
  decision_reasoning: string;
}

interface ChatHistoryItem {
  iteration: number;
  created_message: string;
  lead_feedback: LeadRoleplayOutput;
  timestamp: string;
}
```

### Latest OpenAI Models (2025) with Thinking Modes
**Premium Models**
- `gpt-5` - Best for coding and agentic tasks ($1.25/$10.00 per 1M tokens) ⭐ NEW
- `gpt-5-mini` - Faster, cheaper version ($0.25/$2.00 per 1M tokens) ⭐ NEW
- `gpt-5-nano` - Fastest, cheapest ($0.05/$0.40 per 1M tokens) ⭐ NEW

**Standard Models**
- `gpt-4o` - Multimodal default model ($0.005/$0.01 per 1K tokens)
- `gpt-4o-mini` - Small & efficient ($0.00015/$0.00060 per 1K tokens) - DEFAULT

**Thinking Models** (with reasoning mode support)
- `o3` - Expert reasoning model ($0.01/$0.04 per 1K tokens) 🧠 THINKING
- `o4-mini` - Rapid reasoning tasks ($0.00015 per 1K input tokens) 🧠 THINKING

### Thinking Mode Configuration
```typescript
interface ModelConfig {
  name: string;
  supportsThinking: boolean;
  thinkingEnabled?: boolean; // User can toggle
  cost: { input: number; output: number };
}
```

### Integration Architecture

#### FormulaEditor Extension
- Add new tab: "AI Copy Agents" 
- Extend existing mode system: `'code' | 'ai' | 'firecrawl' | 'ai-agents'`
- Reuse existing column data integration patterns
- Maintain consistent UI/UX with other modes

#### Agent Configuration System
```typescript
interface AIAgentsConfig {
  // Models and Thinking Mode
  messageCreatorModel: string;
  leadRoleplayModel: string;
  messageCreatorThinking: boolean;
  leadRoleplayThinking: boolean;
  
  // User's Business Context
  userOfferDetails: string; // User's product/service/offer description
  
  // Custom Instructions
  messageCreatorInstructions: string; // Additional user instructions for writer
  leadRoleplayInstructions: string;   // Additional user instructions for roleplay
  
  // Settings
  maxIterations: number;
  targetPlatform: 'linkedin' | 'email' | 'twitter' | 'generic';
}
```

## UI Components (Shadcn/UI Consistent)

### AI Copy Agents Tab Layout
```tsx
<TabsContent value="ai-agents" className="space-y-6">
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Users className="h-5 w-5" />
        AI Copy Agents Configuration
      </CardTitle>
      <CardDescription>
        Two AI agents collaborate to create perfect DM messages through iterative refinement
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      
      {/* User Offer Details */}
      <div>
        <Label className="text-base font-semibold">Your Offer Details</Label>
        <Textarea 
          placeholder="Describe your product/service/offer that will be mentioned in messages..."
          className="mt-2"
        />
      </div>

      {/* Agent Configuration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Message Creator Agent */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <PenTool className="h-4 w-4" />
              Message Creator Agent
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select> {/* Model Selection */}
            <Switch> {/* Thinking Mode Toggle */}
            <Textarea> {/* Custom Instructions */}
          </CardContent>
        </Card>

        {/* Lead Roleplay Agent */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserCheck className="h-4 w-4" />
              Lead Roleplay Agent
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select> {/* Model Selection */}
            <Switch> {/* Thinking Mode Toggle */}
            <Textarea> {/* Custom Instructions */}
          </CardContent>
        </Card>
      </div>

      {/* Settings */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <Label>Max Iterations</Label>
            <Slider defaultValue={[5]} max={10} min={1} step={1} />
          </div>
        </CardContent>
      </Card>

    </CardContent>
  </Card>
</TabsContent>
```

## RAPID Implementation (30 Minutes)

### Step 1: Add AI Agents Mode to FormulaEditor (5 mins)
- Add `ai-agents` to mode type
- Add new TabsContent with basic UI
- Wire up mode switching

### Step 2: Basic UI Components (10 mins)
- Agent configuration cards
- Model selection dropdowns
- Instructions text areas
- Max iterations slider

### Step 3: Core Agent Logic (10 mins)
- Structured output prompts
- Chat history management
- Iteration loop with approval logic
- Formula generation

### Step 4: Integration & Testing (5 mins)
- Wire up to existing formula system
- Test with sample data
- Basic error handling

## Default Agent Instructions

### Message Creator Agent (Structured Output)
```
You are an expert copywriter creating personalized DM messages. 

RESPOND IN VALID JSON FORMAT:
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
```

### Lead Roleplay Agent (Structured Output)
```
You roleplay as this lead prospect. Evaluate the message critically and decide approval.

RESPOND IN VALID JSON FORMAT:
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
```

## Core Implementation Code

### Formula Generator Function (With Console Logging)
```typescript
const generateAIAgentsFormula = (config: AIAgentsConfig): string => {
  return `
// AI Copy Agents Formula
const config = ${JSON.stringify(config)};
const apiKey = localStorage.getItem('openai_api_key');
if (!apiKey) return 'Please set OpenAI API key in AI Settings';

console.log('🤖 AI Copy Agents Starting...', { leadData: row, config });

const chatHistory = [];
let currentMessage = '';
let approved = false;
let finalResult = '';

try {
  for (let i = 0; i < config.maxIterations && !approved; i++) {
    console.log(\`\\n🔄 Iteration \${i + 1}/\${config.maxIterations}\`);
    
    // Message Creator Agent
    console.log('✍️ Message Creator Agent working...');
    const creatorPrompt = \`${config.messageCreatorInstructions}\`
      .replace('{columns}', JSON.stringify(row))
      .replace('{userOfferDetails}', config.userOfferDetails || 'No offer details provided')
      .replace('{previousIterations}', JSON.stringify(chatHistory))
      .replace('{customInstructions}', config.messageCreatorInstructions || '');

    const creatorResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${apiKey}\`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.messageCreatorModel,
        messages: [{
          role: 'user',
          content: creatorPrompt
        }],
        response_format: { type: "json_object" },
        ...(config.messageCreatorThinking && { reasoning: true })
      })
    });
    
    if (!creatorResponse.ok) throw new Error(\`Creator API error: \${creatorResponse.status}\`);
    
    const creatorData = await creatorResponse.json();
    const messageResult = JSON.parse(creatorData.choices[0].message.content);
    currentMessage = messageResult.message;
    
    console.log('📝 Created message:', messageResult);
    
    // Lead Roleplay Agent
    console.log('🎭 Lead Roleplay Agent evaluating...');
    const roleplayPrompt = \`${config.leadRoleplayInstructions}\`
      .replace('{columns}', JSON.stringify(row))
      .replace('{message}', currentMessage)
      .replace('{chatHistory}', JSON.stringify(chatHistory))
      .replace('{customInstructions}', config.leadRoleplayInstructions || '');

    const roleplayResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${apiKey}\`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.leadRoleplayModel,
        messages: [{
          role: 'user',
          content: roleplayPrompt
        }],
        response_format: { type: "json_object" },
        ...(config.leadRoleplayThinking && { reasoning: true })
      })
    });
    
    if (!roleplayResponse.ok) throw new Error(\`Roleplay API error: \${roleplayResponse.status}\`);
    
    const roleplayData = await roleplayResponse.json();
    const feedback = JSON.parse(roleplayData.choices[0].message.content);
    
    console.log('🎯 Lead feedback:', feedback);
    
    // Add to chat history
    const historyItem = {
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
      console.log(\`❌ Message rejected (Score: \${feedback.score}/10). Continuing...\`);
    }
  }
  
  if (!approved) {
    console.log(\`⚠️ Max iterations reached without approval. Using last message.\`);
    finalResult = currentMessage || 'Failed to generate message';
  }
  
  console.log('🏁 Final result:', finalResult);
  console.log('📊 Full chat history:', chatHistory);
  
  return finalResult;
  
} catch (error) {
  console.error('❌ AI Copy Agents Error:', error);
  return \`Error: \${error.message}\`;
}
  `;
};
```

## Success Requirements

### Must Have Features
- ✅ User offer details integration in message creation
- ✅ Console-only chat history logging (not in table output)
- ✅ Custom instruction fields for both agents
- ✅ GPT-5 models support with thinking mode toggle
- ✅ Shadcn/UI components for consistent styling
- ✅ Structured JSON outputs for reliable loop control
- ✅ Lead agent must APPROVE message to complete
- ✅ Max iterations to prevent infinite loops

### Implementation Priority
1. **CRITICAL**: User offer details field and integration
2. **CRITICAL**: Custom instruction textareas for both agents  
3. **CRITICAL**: GPT-5 model support with thinking mode toggles
4. **CRITICAL**: Console logging only (no table output)
5. **HIGH**: Shadcn/UI consistent components
6. **HIGH**: Structured outputs with JSON mode
7. **MEDIUM**: Model cost indicators and recommendations

### Shadcn Components Required
```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, PenTool, UserCheck, Brain, Zap } from 'lucide-react';
```
