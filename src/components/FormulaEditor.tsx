import { useState, useEffect, useRef, useCallback } from 'react';
import { Code, Save, X, Info, Sparkles, Brain, Wand2, Trash2, Upload, FileSpreadsheet, Users, PenTool, UserCheck, Zap, Server, Key, ChevronDown, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useDataStore } from '@/stores/useDataStore'
import { toast } from '@/hooks/use-toast';
import { SlashMenu } from './SlashMenu';
import { FormulaValidator, validateFormula } from './FormulaValidator';
import { Input } from '@/components/ui/input';
import { runAIAgents } from '@/lib/aiAgents';
import { checkOllamaConnection as checkOllamaStatus } from '@/lib/ollama';
import Papa from 'papaparse';

// Helper function to detect Ollama models (same as in aiAgents.ts)
const isOllamaModel = (modelName: string): boolean => {
  const ollamaPatterns = [
    'llama', 'mistral', 'codellama', 'vicuna', 'alpaca', 'orca', 
    'phi', 'neural-chat', 'starling', 'openhermes', 'dolphin',
    'wizardlm', 'evo', 'gemma', 'qwen', 'mixtral'
  ];
  
  const lowerModel = modelName.toLowerCase();
  return ollamaPatterns.some(pattern => lowerModel.includes(pattern)) ||
         lowerModel.includes(':') && !lowerModel.startsWith('gpt');
};

interface FormulaEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FormulaEditor = ({ open, onOpenChange }: FormulaEditorProps) => {
  const { activeColumn, getFormula, setFormula, removeColumn, headers, rows, setData, clearData } = useDataStore();
  const [formula, setFormulaText] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 });
  const [mode, setMode] = useState<'code' | 'ai' | 'firecrawl' | 'ai-agents'>('code');
  const [aiModel, setAiModel] = useState('gpt-4o-mini');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiMessage, setAiMessage] = useState('');
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [firecrawlUrl, setFirecrawlUrl] = useState('');
  const [firecrawlResult, setFirecrawlResult] = useState('');
  const [firecrawlLoading, setFirecrawlLoading] = useState(false);
  const [firecrawlError, setFirecrawlError] = useState('');
  const [savedFormulas, setSavedFormulas] = useState<Array<{name: string, code: string}>>([]);
  const [formulaName, setFormulaName] = useState('');
  const [aiProvider, setAiProvider] = useState<'openai' | 'ollama'>('openai');
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [ollamaConnected, setOllamaConnected] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [topK, setTopK] = useState(40);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // Thinking controls for reasoning models (DeepSeek R1, etc.)
  const [thinkingMode, setThinkingMode] = useState(false);

  // AI Agents state
  const [userOfferDetails, setUserOfferDetails] = useState('');
  const [messageCreatorModel, setMessageCreatorModel] = useState('gpt-4o-mini');
  const [leadRoleplayModel, setLeadRoleplayModel] = useState('gpt-4o-mini');
  const [messageCreatorThinking, setMessageCreatorThinking] = useState(false);
  const [leadRoleplayThinking, setLeadRoleplayThinking] = useState(false);
  const [messageCreatorInstructions, setMessageCreatorInstructions] = useState('');
  const [leadRoleplayInstructions, setLeadRoleplayInstructions] = useState('');
  const [maxIterations, setMaxIterations] = useState(5);

  // Available models with thinking mode support (latest as of August 2025)
  const openAIModels = [
    { id: 'gpt-5', name: 'GPT-5 (Flagship)', supportsThinking: false, cost: 'TBD' },
    { id: 'gpt-5-mini', name: 'GPT-5 Mini', supportsThinking: false, cost: 'TBD' },
    { id: 'gpt-4o', name: 'GPT-4o (Latest)', supportsThinking: false, cost: '$5.00/$15.00 per 1M tokens' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', supportsThinking: false, cost: '$0.15/$0.60 per 1M tokens' },
    { id: 'o3', name: 'OpenAI o3 (Reasoning)', supportsThinking: true, cost: 'TBD' },
    { id: 'o3-pro', name: 'OpenAI o3-pro (Reasoning)', supportsThinking: true, cost: 'TBD' },
    { id: 'o4-mini', name: 'OpenAI o4-mini (Reasoning)', supportsThinking: true, cost: 'TBD' },
  ];
  
  // Helper function to detect thinking support in Ollama models
  const detectThinkingSupport = (modelName: string): boolean => {
    const thinkingPatterns = [
      'deepseek', 'r1', 'thinking', 'reasoning', 'o1', 'o3', 'qwq'
    ];
    const lowerModel = modelName.toLowerCase();
    return thinkingPatterns.some(pattern => lowerModel.includes(pattern));
  };

  const availableModels = aiProvider === 'openai' ? openAIModels : 
    (ollamaModels || []).map(model => ({ 
      id: model, 
      name: model, 
      supportsThinking: detectThinkingSupport(model), 
      cost: 'Free (Local)' 
    }));
    
  // For AI Agents mode, combine both OpenAI and Ollama models
  const allAvailableModels = [
    ...openAIModels,
    ...(ollamaModels || []).map(model => ({ 
      id: model, 
      name: `${model} (Ollama)`, 
      supportsThinking: false, 
      cost: 'Free (Local)' 
    }))
  ];

  // Default instructions
  const defaultMessageCreatorInstructions = `You are an expert copywriter creating personalized DM messages. 

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

  const defaultLeadRoleplayInstructions = `You roleplay as this lead prospect. Evaluate the message critically and decide approval.

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

  const firstRow = rows && rows.length > 0 ? rows[0] : null;

  // Load provider settings and check Ollama connection
  useEffect(() => {
    try {
      const savedProvider = localStorage.getItem('ai_provider') as 'openai' | 'ollama' || 'openai';
      setAiProvider(savedProvider);
      
      // Load thinking controls settings
      const savedThinkingMode = localStorage.getItem('thinking_mode') === 'true';
      setThinkingMode(savedThinkingMode);
      
      // Load temperature setting
      const savedTemperature = localStorage.getItem('ai_temperature');
      if (savedTemperature) {
        setTemperature(parseFloat(savedTemperature));
      }
      
      // Load max tokens setting
      const savedMaxTokens = localStorage.getItem('ai_max_tokens');
      if (savedMaxTokens) {
        setMaxTokens(parseInt(savedMaxTokens));
      }
      
      // Load top_k setting
      const savedTopK = localStorage.getItem('ai_top_k');
      if (savedTopK) {
        setTopK(parseInt(savedTopK));
      }
      
      // Check Ollama connection if it's the selected provider
      if (savedProvider === 'ollama') {
        checkOllamaConnection().catch(error => {
          console.error('Failed to check Ollama connection:', error);
        });
      }
    } catch (error) {
      console.error('Error loading provider settings:', error);
      setAiProvider('openai'); // Fallback to OpenAI
    }
  }, []);
  
  const checkOllamaConnection = async () => {
    try {
      const status = await checkOllamaStatus();
      setOllamaConnected(status.connected);
      setOllamaModels(status.models);
    } catch (error) {
      console.error('Error checking Ollama:', error);
      setOllamaConnected(false);
      setOllamaModels([]);
    }
  };

  // Validate and reset model when provider or available models change
  useEffect(() => {
    if (availableModels.length > 0) {
      const isCurrentModelValid = availableModels.some(model => model.id === aiModel);
      if (!isCurrentModelValid || !aiModel) {
        // Reset to the first available model
        setAiModel(availableModels[0].id);
      }
    }
  }, [aiProvider, availableModels, aiModel]);

  // Load saved formulas from localStorage
  useEffect(() => {
    const savedFormulasFromStorage = localStorage.getItem('saved_formulas');
    if (savedFormulasFromStorage) {
      try {
        setSavedFormulas(JSON.parse(savedFormulasFromStorage));
      } catch (error) {
        console.error('Error loading saved formulas:', error);
      }
    }
  }, []);

  // Save formula to localStorage
  const saveCurrentFormula = () => {
    if (!formulaName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a name for the formula.",
        variant: "destructive",
      });
      return;
    }

    if (!formula.trim()) {
      toast({
        title: "Validation Error", 
        description: "Please enter a formula to save.",
        variant: "destructive",
      });
      return;
    }

    const newFormula = {
      name: formulaName.trim(),
      code: formula
    };

    const updatedFormulas = [...savedFormulas.filter(f => f.name !== newFormula.name), newFormula];
    setSavedFormulas(updatedFormulas);
    localStorage.setItem('saved_formulas', JSON.stringify(updatedFormulas));
    setFormulaName('');
    
    toast({
      title: "Formula Saved",
      description: `Formula "${newFormula.name}" has been saved for reuse.`,
    });
  };

  // Delete saved formula
  const deleteSavedFormula = (name: string) => {
    const updatedFormulas = savedFormulas.filter(f => f.name !== name);
    setSavedFormulas(updatedFormulas);
    localStorage.setItem('saved_formulas', JSON.stringify(updatedFormulas));
    
    toast({
      title: "Formula Deleted",
      description: `Formula "${name}" has been deleted.`,
    });
  };

  // Clear current formula
  const clearCurrentFormula = () => {
    setFormulaText('');
    setFormulaName('');
    setHasChanges(true);
  };

  // Auto-save current table to localStorage  
  const autoSaveCurrentTable = useCallback(() => {
    try {
      const currentData = {
        headers,
        rows,
        timestamp: new Date().toISOString(),
        name: `Auto-saved ${new Date().toLocaleString()}`
      };
      
      // Get existing auto-saves
      const existingAutoSaves = localStorage.getItem('auto_saved_tables');
      let autoSaves = existingAutoSaves ? JSON.parse(existingAutoSaves) : [];
      
      // Keep only last 5 auto-saves
      autoSaves.unshift(currentData);
      if (autoSaves.length > 5) {
        autoSaves = autoSaves.slice(0, 5);
      }
      
      localStorage.setItem('auto_saved_tables', JSON.stringify(autoSaves));
      
      toast({
        title: "Table Auto-saved",
        description: "Current table has been automatically saved before loading new CSV.",
      });
    } catch (error) {
      console.error('Error auto-saving table:', error);
    }
  }, [headers, rows]);

  // Process CSV file upload
  const processCSVFile = useCallback((file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          toast({
            title: "CSV Parse Error",
            description: "There were errors parsing your CSV file.",
            variant: "destructive",
          });
          return;
        }

        const newHeaders = results.meta.fields || [];
        const newRows = results.data as Record<string, string>[];

        if (newHeaders.length === 0) {
          toast({
            title: "No Headers Found",
            description: "Your CSV file doesn't appear to have headers.",
            variant: "destructive",
          });
          return;
        }

        // Auto-save current table before loading new one
        if (headers.length > 0 && rows.length > 0) {
          autoSaveCurrentTable();
        }

        // Clear existing data and load new data
        clearData();
        setData(newHeaders, newRows);
        
        toast({
          title: "CSV Loaded Successfully",
          description: `Loaded ${newRows.length} rows with ${newHeaders.length} columns.`,
        });

        // Close the formula editor
        onOpenChange(false);
      },
      error: (error) => {
        toast({
          title: "File Error",
          description: `Error reading file: ${error.message}`,
          variant: "destructive",
        });
      },
    });
  }, [headers, rows, clearData, setData, onOpenChange, autoSaveCurrentTable]);

  // Handle CSV file selection
  const handleCSVUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,text/csv,application/vnd.ms-excel';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        processCSVFile(file);
      }
    };
    input.click();
  };

  useEffect(() => {
    if (activeColumn) {
      const existingFormula = getFormula(activeColumn);
      setFormulaText(existingFormula);
      setHasChanges(false);
      
      // Check if it's an AI formula and parse it
      if (existingFormula.includes('localStorage.getItem(\'openai_api_key\')') || existingFormula.includes('http://localhost:11434/v1/chat/completions')) {
        if (existingFormula.includes('🤖 AI Copy Agents Starting')) {
          // AI Agents mode
          setMode('ai-agents');
          try {
            // Try to extract config from the formula
            const configMatch = existingFormula.match(/const config = ({.*?});/s);
            if (configMatch) {
              const config = JSON.parse(configMatch[1]);
              setUserOfferDetails(config.userOfferDetails || '');
              setMessageCreatorModel(config.messageCreatorModel || 'gpt-4o-mini');
              setLeadRoleplayModel(config.leadRoleplayModel || 'gpt-4o-mini');
              setMessageCreatorThinking(config.messageCreatorThinking || false);
              setLeadRoleplayThinking(config.leadRoleplayThinking || false);
              setMessageCreatorInstructions(config.messageCreatorInstructions || '');
              setLeadRoleplayInstructions(config.leadRoleplayInstructions || '');
              setMaxIterations(config.maxIterations || 5);
            }
          } catch (error) {
            console.error('Error parsing AI agents config:', error);
          }
        } else {
          // Regular AI mode
          setMode('ai');
          
          // Detect if it's Ollama or OpenAI
          if (existingFormula.includes('http://localhost:11434/v1/chat/completions')) {
            setAiProvider('ollama');
            checkOllamaConnection();
          } else {
            setAiProvider('openai');
          }
          
          // Try to extract model and prompt from existing formula
          const modelMatch = existingFormula.match(/model: '([^']+)'/);  
          if (modelMatch) {
            setAiModel(modelMatch[1]);
          }
          
          // Try to extract prompt from content
          const promptMatch = existingFormula.match(/content: `([^`]+)`/);
          if (promptMatch) {
            let extractedPrompt = promptMatch[1];
            // Convert back from template literal format
            extractedPrompt = extractedPrompt.replace(/\$\{row\["([^"]+)"\] \|\| ""\}/g, '{$1}');
            setAiPrompt(extractedPrompt);
          }
        }
      } else if (existingFormula.includes('localStorage.getItem(\'firecrawl_api_key\')')) {
        setMode('firecrawl');
        // Try to extract URL template from existing formula
        const urlMatch = existingFormula.match(/const url = `([^`]+)`;/);
        if (urlMatch) {
          // Convert back from template literal to our format
          const urlTemplate = urlMatch[1].replace(/\$\{row\["([^"]+)"\] \|\| ""\}/g, '{$1}');
          setFirecrawlUrl(urlTemplate);
        }
      } else {
        setMode('code');
      }
    }
  }, [activeColumn, getFormula]);

  const handleSave = () => {
    if (activeColumn) {
      let finalFormula = formula;
      
      if (mode === 'ai') {
        // Generate the AI formula from the simple inputs
        if (!aiPrompt.trim()) {
          toast({
            title: "Validation Error",
            description: "Please enter a prompt for the AI.",
            variant: "destructive",
          });
          return;
        }
        
        // Check provider-specific requirements
        if (aiProvider === 'openai') {
          const apiKey = localStorage.getItem('openai_api_key');
          if (!apiKey) {
            toast({
              title: "Validation Error",
              description: "Please set your OpenAI API key in AI Settings.",
              variant: "destructive",
            });
            return;
          }
        } else if (aiProvider === 'ollama') {
          if (!ollamaConnected) {
            toast({
              title: "Validation Error",
              description: "Ollama is not running. Please start Ollama and refresh connection.",
              variant: "destructive",
            });
            return;
          }
          if (ollamaModels.length === 0) {
            toast({
              title: "Validation Error",
              description: "No Ollama models installed. Run 'ollama pull llama2' to install a model.",
              variant: "destructive",
            });
            return;
          }
        }
        
        console.log('🔧 Generating AI formula with parameters:', {
          aiPrompt,
          aiMessage,
          aiModel,
          aiProvider,
          thinkingMode
        });
        
        try {
          // Check which settings were explicitly set by the user
          const hasCustomTemperature = localStorage.getItem('ai_temperature') !== null;
          const hasCustomMaxTokens = localStorage.getItem('ai_max_tokens') !== null;
          const hasCustomTopK = localStorage.getItem('ai_top_k') !== null;
          
          finalFormula = generateAIFormula(aiPrompt, aiMessage, aiModel, temperature, maxTokens, topK, {
            hasCustomTemperature,
            hasCustomMaxTokens,
            hasCustomTopK
          });
          console.log('✅ Successfully generated AI formula');
          console.log('📝 Formula preview:', finalFormula.substring(0, 500) + '...');
          
          // Validate the generated JavaScript syntax
          try {
            new Function('row', finalFormula);
            console.log('✅ Generated formula has valid JavaScript syntax');
          } catch (syntaxError) {
            console.error('❌ Generated formula has invalid JavaScript syntax:', syntaxError);
            console.error('🔍 Problematic formula:', finalFormula);
            toast({
              title: "Formula Syntax Error",
              description: `Generated formula has invalid syntax: ${syntaxError.message}. Check console for details.`,
              variant: "destructive",
            });
            return;
          }
        } catch (error) {
          console.error('❌ Error generating AI formula:', error);
          toast({
            title: "Formula Generation Error",
            description: `Failed to generate AI formula: ${error.message}`,
            variant: "destructive",
          });
          return;
        }
      } else if (mode === 'firecrawl') {
        // Generate the Firecrawl formula from the URL template
        if (!firecrawlUrl.trim()) {
          toast({
            title: "Validation Error",
            description: "Please enter a URL template for Firecrawl.",
            variant: "destructive",
          });
          return;
        }
        finalFormula = generateFirecrawlFormula(firecrawlUrl);
      } else if (mode === 'ai-agents') {
        // Generate the AI Agents formula
        if (!userOfferDetails.trim()) {
          toast({
            title: "Validation Error",
            description: "Please enter your offer details for the AI agents.",
            variant: "destructive",
          });
          return;
        }
        
        // Check if models are available
        const creatorIsOllama = isOllamaModel(messageCreatorModel);
        const roleplayIsOllama = isOllamaModel(leadRoleplayModel);
        
        // Validate Ollama models
        if (creatorIsOllama && (!ollamaConnected || !ollamaModels.includes(messageCreatorModel))) {
          toast({
            title: "Validation Error",
            description: `Message Creator model '${messageCreatorModel}' is not available in Ollama. Please install it or choose a different model.`,
            variant: "destructive",
          });
          return;
        }
        
        if (roleplayIsOllama && (!ollamaConnected || !ollamaModels.includes(leadRoleplayModel))) {
          toast({
            title: "Validation Error",
            description: `Lead Roleplay model '${leadRoleplayModel}' is not available in Ollama. Please install it or choose a different model.`,
            variant: "destructive",
          });
          return;
        }
        
        // Validate OpenAI API key for OpenAI models
        const apiKey = localStorage.getItem('openai_api_key');
        if ((!creatorIsOllama || !roleplayIsOllama) && !apiKey) {
          toast({
            title: "Validation Error",
            description: "OpenAI API key required for OpenAI models. Please set it in AI Settings.",
            variant: "destructive",
          });
          return;
        }
        
        finalFormula = generateAIAgentsFormula();
      } else {
        // Only validate formula syntax when in code mode
        const validation = validateFormula(finalFormula, headers);
        if (!validation.isValid) {
          toast({
            title: "Validation Error",
            description: "Please fix the formula errors before saving.",
            variant: "destructive",
          });
          return;
        }
      }
      
      console.log('💾 Setting formula for column:', activeColumn);
      console.log('💾 Final formula length:', finalFormula.length);
      
      try {
        setFormula(activeColumn, finalFormula);
        console.log('✅ Formula saved successfully');
        setHasChanges(false);
        toast({
          title: "Formula Saved",
          description: `${mode === 'ai' ? 'AI prompt' : mode === 'firecrawl' ? 'Firecrawl URL template' : mode === 'ai-agents' ? 'AI Copy Agents configuration' : 'Formula'} for "${activeColumn}" has been saved.`,
        });
        onOpenChange(false);
      } catch (error) {
        console.error('❌ Error saving formula:', error);
        toast({
          title: "Save Error",
          description: `Failed to save formula: ${error.message}`,
          variant: "destructive",
        });
      }
    }
  };

  const generateAIFormula = (prompt: string, message: string, model: string, temp: number, maxTokens: number, topK: number, customSettings?: {
    hasCustomTemperature?: boolean;
    hasCustomMaxTokens?: boolean;
    hasCustomTopK?: boolean;
  }) => {
    // Default to true if customSettings not provided (for backward compatibility)
    const hasCustomTemperature = customSettings?.hasCustomTemperature ?? true;
    const hasCustomMaxTokens = customSettings?.hasCustomMaxTokens ?? true;
    const hasCustomTopK = customSettings?.hasCustomTopK ?? true;
    // Replace {Column Name} references with actual row data access
    const processedPrompt = prompt.replace(/\{([^}]+)\}/g, (match, columnName) => {
      return `\${row["${columnName}"] || ""}`;
    });
    
    const fullPrompt = message ? `${processedPrompt}. Additional context: ${message}` : processedPrompt;
    
    // Determine if this is an Ollama model or OpenAI model
    const isOllamaModelLocal = aiProvider === 'ollama';
    const ollamaBaseUrl = localStorage.getItem('ollama_base_url') || 'http://localhost:11434';
    const apiEndpoint = isOllamaModelLocal 
      ? `${ollamaBaseUrl}/v1/chat/completions`  // Use OpenAI-compatible endpoint for better compatibility
      : 'https://api.openai.com/v1/chat/completions';
    
    // API key handling
    const apiKeyCheck = isOllamaModelLocal 
      ? '// Ollama runs locally without API key\nconst apiKey = null;'
      : `const apiKey = localStorage.getItem('openai_api_key');\n\nif (!apiKey) {\n  return 'Please set your OpenAI API key in AI Settings';\n}`;
    
    // Authorization header
    const authHeader = isOllamaModelLocal 
      ? `      'Content-Type': 'application/json',`
      : `      'Authorization': \`Bearer \${apiKey}\`,\n      'Content-Type': 'application/json',`;
    
    // Newer models (GPT-5, o-series) use 'max_completion_tokens' and need more tokens for reasoning
    const useMaxCompletionTokens = model.startsWith('gpt-5') || model.startsWith('o');
    const tokenParameter = useMaxCompletionTokens 
      ? `'max_completion_tokens': 4000` 
      : `'max_tokens': 150`;

    // Check if this is a reasoning model
    const isReasoningModel = detectThinkingSupport(model);

    // Log the generated code for debugging
    console.log('🏗️ Generated AI Formula Debug Info:');
    console.log('- Model:', model);
    console.log('- Is Reasoning Model:', isReasoningModel);
    console.log('- Is Ollama:', isOllamaModelLocal);
    console.log('- Thinking Mode:', thinkingMode);
    console.log('- Using native Ollama API with think parameter:', isOllamaModelLocal && isReasoningModel);

    const generatedCode = `// ${isOllamaModelLocal ? 'Ollama' : 'OpenAI'} Generated Formula${isReasoningModel ? ' (Reasoning Model)' : ''}
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

${isOllamaModelLocal ? `
// Build Ollama options object conditionally
const ollamaOptions = {};

// Only include temperature if user explicitly set it
if (${hasCustomTemperature}) {
  ollamaOptions.temperature = ${temp};
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
};` : `
// Build OpenAI request body conditionally
const requestBody = {
  model: '${model}',
  messages: [{
    role: 'user',
    content: \`${fullPrompt.replace(/`/g, '\\`')}\`
  }]
};

// Only include temperature if user explicitly set it
if (${hasCustomTemperature}) {
  requestBody.temperature = ${temp};
}

// Only include token limit if user explicitly set max tokens
if (${hasCustomMaxTokens}) {
  ${useMaxCompletionTokens ? `requestBody.max_completion_tokens = ${maxTokens};` : `requestBody.max_tokens = ${maxTokens};`}
}
`}

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

  ${isOllamaModelLocal ? `
  // Handle Ollama native API response structure
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
  }` : `
  // Handle OpenAI API response structure
  if (data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
    let result = data.choices[0].message.content;
    console.log('✅ Found content in OpenAI structure');
    console.log('📄 Raw content preview:', result.substring(0, 200) + '...');
    
    // Apply content filtering for reasoning models
    ${!thinkingMode && isReasoningModel ? 'result = filterThinkingContent(result);' : 'console.log("🧠 Keeping original content");'}
    console.log('📄 Final result preview:', result.substring(0, 200) + '...');
    
    return result;
  }`}

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

    console.log('📝 Generated code preview:');
    console.log(generatedCode.substring(0, 1000) + '...');
    
    return generatedCode;
  };

  const generateFirecrawlFormula = (urlTemplate: string) => {
    // Replace {Column Name} references with actual row data access
    const processedUrl = urlTemplate.replace(/\{([^}]+)\}/g, (match, columnName) => {
      return `\${row["${columnName}"] || ""}`;
    });
    
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

  const generateAIAgentsFormula = () => {
    const config = {
      messageCreatorModel,
      leadRoleplayModel,
      messageCreatorThinking,
      leadRoleplayThinking,
      userOfferDetails,
      messageCreatorInstructions: messageCreatorInstructions, // Keep user's custom instructions
      leadRoleplayInstructions: leadRoleplayInstructions, // Keep user's custom instructions
      maxIterations,
    };

    return `// AI Copy Agents Formula
const config = ${JSON.stringify(config, null, 2)};
return await runAIAgents(config, row);`;
  };

  const handleModeChange = (newMode: 'code' | 'ai' | 'firecrawl' | 'ai-agents') => {
    setMode(newMode);
    setHasChanges(true);
    
    if (newMode === 'ai' && !aiPrompt) {
      setAiPrompt('Analyze this data and provide insights');
    } else if (newMode === 'ai-agents') {
      // Initialize AI agents mode with defaults if empty
      if (!userOfferDetails) {
        setUserOfferDetails('');
      }
      if (!messageCreatorInstructions) {
        setMessageCreatorInstructions('');
      }
      if (!leadRoleplayInstructions) {
        setLeadRoleplayInstructions('');
      }
    }
  };

  const handleFormulaChange = (value: string) => {
    setFormulaText(value);
    setHasChanges(value !== getFormula(activeColumn || ''));
    
    // Check for slash command
    const textarea = textareaRef.current;
    if (textarea && value.endsWith('/')) {
      const rect = textarea.getBoundingClientRect();
      const textBeforeCursor = value.substring(0, textarea.selectionStart);
      const lines = textBeforeCursor.split('\n');
      const currentLine = lines.length;
      const lineHeight = 20; // Approximate line height
      
      setSlashMenuPosition({
        top: rect.top + currentLine * lineHeight,
        left: rect.left + 20
      });
      setShowSlashMenu(true);
    } else if (showSlashMenu && !value.endsWith('/')) {
      setShowSlashMenu(false);
    }
  };

  const handleAIInputChange = () => {
    setHasChanges(true);
  };

  const handleFirecrawlInputChange = () => {
    setHasChanges(true);
  };

  const handleRemoveColumn = () => {
    if (activeColumn) {
      removeColumn(activeColumn);
      setShowRemoveDialog(false);
      onOpenChange(false);
      
      toast({
        title: "Column Removed",
        description: `Column "${activeColumn}" has been removed successfully.`,
      });
    }
  };

  const handleSlashMenuSelect = (template: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const currentValue = formula;
      const newValue = currentValue.slice(0, -1) + template; // Remove the '/' and insert template
      setFormulaText(newValue);
      setHasChanges(true);
      setShowSlashMenu(false);
      
      // Focus back on textarea
      setTimeout(() => textarea.focus(), 0);
    }
  };

  // Firecrawl API call helper
  const fetchFirecrawlContent = useCallback(async () => {
    setFirecrawlLoading(true);
    setFirecrawlError('');
    setFirecrawlResult('');
    const apiKey = localStorage.getItem('firecrawl_api_key');
    if (!apiKey) {
      setFirecrawlError('Please set your Firecrawl API key in AI Settings.');
      setFirecrawlLoading(false);
      return;
    }
    if (!firecrawlUrl.trim()) {
      setFirecrawlError('Please enter a website URL.');
      setFirecrawlLoading(false);
      return;
    }
    try {
      const response = await fetch('https://api.firecrawl.dev/v2/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: firecrawlUrl.trim(),
          formats: ['markdown']
        })
      });
      if (!response.ok) {
        setFirecrawlError(`Firecrawl API error: ${response.status} - ${response.statusText}`);
        setFirecrawlLoading(false);
        return;
      }
      const data = await response.json();
      if (data.success && data.data && data.data.markdown) {
        setFirecrawlResult(data.data.markdown);
      } else if (data.markdown) {
        setFirecrawlResult(data.markdown);
      } else {
        setFirecrawlResult(JSON.stringify(data, null, 2));
      }
    } catch (err) {
      setFirecrawlError('Failed to fetch from Firecrawl.');
    } finally {
      setFirecrawlLoading(false);
    }
  }, [firecrawlUrl]);

  if (!activeColumn) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl h-full overflow-y-scroll">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Edit Formula: {activeColumn}
              </SheetTitle>
              <SheetDescription>
                Write JavaScript code to process each row. The current row data is available as the `row` object.
                Use bracket notation to access columns: row['Column Name']. Use `return` to specify the value for this column.
              </SheetDescription>
            </div>
           
          </div>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Mode Selection */}
          <Tabs value={mode} onValueChange={handleModeChange} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="code" className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                Code Mode
              </TabsTrigger>
              <TabsTrigger value="ai" className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                AI Mode
              </TabsTrigger>
              <TabsTrigger value="firecrawl" className="flex items-center gap-2">
                <Wand2 className="h-4 w-4" />
                Firecrawl Mode
              </TabsTrigger>
              <TabsTrigger value="ai-agents" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                AI Copy Agents
              </TabsTrigger>
            </TabsList>

            <TabsContent value="firecrawl" className="space-y-6">
              {/* Firecrawl Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Wand2 className="h-4 w-4" />
                    Firecrawl Website Scraper
                  </CardTitle>
                  <CardDescription>
                    Build a formula that fetches website content using Firecrawl. The result will be LLM-ready markdown content.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Available columns for Firecrawl */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Available Columns
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Click on a column to add it to your URL. Use column data to build dynamic URLs:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {headers.map((header) => (
                        <Badge 
                          key={header} 
                          variant="outline" 
                          className="cursor-pointer hover:bg-muted"
                          onClick={() => {
                            const insertion = `{${header}}`;
                            const currentUrl = firecrawlUrl;
                            const newUrl = currentUrl + insertion;
                            setFirecrawlUrl(newUrl);
                          }}
                        >
                          {header}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      💡 Tip: Use {`{Column Name}`} in your URL to reference data from each row. Example: https://company.com/profile/{`{Company}`}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="firecrawl-url" className="text-base font-semibold mb-3 block">
                      Website URL Template
                    </Label>
                    <Input
                      id="firecrawl-url"
                      type="text"
                      placeholder="https://example.com/{Company} or https://linkedin.com/in/{Username}"
                      value={firecrawlUrl}
                      onChange={e => {
                        setFirecrawlUrl(e.target.value);
                        handleFirecrawlInputChange();
                      }}
                      className="w-full"
                    />
                  </div>

                  {/* Preview with actual data */}
                  {firecrawlUrl && firstRow && (
                    <div>
                      <Label className="text-sm font-medium">Preview with actual data:</Label>
                      <div className="mt-1 p-2 bg-muted rounded border text-sm font-mono">
                        {firecrawlUrl.replace(/\{([^}]+)\}/g, (match, columnName) => {
                          const value = firstRow[columnName.trim()];
                          return value || `[${columnName.trim()} not found]`;
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        This shows how the URL will look for the first row in your data
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="code" className="space-y-6">
              {/* Available columns */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Available Columns
                </h4>
                <div className="flex flex-wrap gap-1">
                  {headers.map((header) => (
                    <Badge 
                      key={header} 
                      variant="outline" 
                      className="cursor-pointer hover:bg-muted"
                      onClick={() => {
                        const insertion = `row['${header}']`;
                        const textarea = document.querySelector('.formula-editor') as HTMLTextAreaElement;
                        if (textarea) {
                          const start = textarea.selectionStart;
                          const end = textarea.selectionEnd;
                          const newValue = formula.substring(0, start) + insertion + formula.substring(end);
                          setFormulaText(newValue);
                          setHasChanges(true);
                          
                          // Restore cursor position
                          setTimeout(() => {
                            textarea.focus();
                            textarea.setSelectionRange(start + insertion.length, start + insertion.length);
                          }, 0);
                        }
                      }}
                    >
                      {header}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Formula editor */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">JavaScript Formula</h4>
                  <Badge variant="outline" className="flex items-center gap-1 text-xs">
                    <Sparkles className="h-3 w-3" />
                    Type / for AI templates
                  </Badge>
                </div>
                <Textarea
                  ref={textareaRef}
                  value={formula}
                  onChange={(e) => handleFormulaChange(e.target.value)}
                  placeholder="// Enter your JavaScript code here
// Type '/' to access AI templates
// Example:
return row['email']?.includes('@gmail.com') ? 'Gmail User' : 'Other';"
                  className="formula-editor"
                  rows={12}
                />
              </div>

              {/* Formula validation */}
              <FormulaValidator formula={formula} availableColumns={headers} />

              {/* Saved Formulas */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">Saved Formulas</h4>
                  <div className="flex gap-2">
                    <Button
                      variant="outline" 
                      size="sm"
                      onClick={clearCurrentFormula}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
                
                {/* Save current formula */}
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="Enter formula name to save..."
                    value={formulaName}
                    onChange={(e) => setFormulaName(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={saveCurrentFormula}
                    disabled={!formulaName.trim() || !formula.trim()}
                  >
                    Save Formula
                  </Button>
                </div>

                {/* List of saved formulas */}
                {savedFormulas.length > 0 ? (
                  <div className="grid gap-2">
                    {savedFormulas.map((savedFormula, index) => (
                      <Card key={index} className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <p className="font-medium text-sm mb-1">{savedFormula.name}</p>
                            <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded block overflow-x-auto">
                              {savedFormula.code.length > 100 
                                ? savedFormula.code.substring(0, 100) + '...' 
                                : savedFormula.code}
                            </code>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setFormulaText(savedFormula.code);
                                setHasChanges(true);
                              }}
                            >
                              Use
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteSavedFormula(savedFormula.name)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No saved formulas yet. Create a formula and save it for reuse.
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="ai" className="space-y-6">
              <div className="space-y-6">
                {/* Provider Selection */}
                <div>
                  <Label className="text-base font-semibold flex items-center gap-2 mb-3">
                    <Server className="h-4 w-4" />
                    AI Provider
                  </Label>
                  <Select value={aiProvider} onValueChange={(value: 'openai' | 'ollama') => {
                    setAiProvider(value);
                    if (value === 'ollama') {
                      checkOllamaConnection();
                    }
                    handleAIInputChange();
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select AI provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">
                        <div className="flex items-center gap-2">
                          <Key className="h-4 w-4" />
                          OpenAI (Cloud)
                        </div>
                      </SelectItem>
                      <SelectItem value="ollama">
                        <div className="flex items-center gap-2">
                          <Server className="h-4 w-4" />
                          Ollama (Local)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {aiProvider === 'ollama' && (
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      {ollamaConnected ? (
                        <div className="flex items-center gap-2 text-green-700">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          Connected ({ollamaModels.length} models)
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-red-700">
                          <div className="w-2 h-2 bg-red-500 rounded-full" />
                          Ollama not running
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={checkOllamaConnection}
                        className="ml-auto h-6 px-2 text-xs"
                      >
                        Refresh
                      </Button>
                    </div>
                  )}
                </div>
                {/* Available columns for AI mode */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Available Columns
                  </h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Click on a column to add it to your prompt. The AI will have access to all this data for each row:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {headers.map((header) => (
                      <Badge 
                        key={header} 
                        variant="outline" 
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => {
                          const insertion = `{${header}}`;
                          const currentPrompt = aiPrompt;
                          const newPrompt = currentPrompt + (currentPrompt ? ' ' : '') + insertion;
                          setAiPrompt(newPrompt);
                          handleAIInputChange();
                        }}
                      >
                        {header}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    💡 Tip: Use {`{Column Name}`} in your prompt to reference specific data from each row
                  </p>
                </div>

                {/* AI Model Selection */}
                <div>
                  <Label htmlFor="ai-model" className="text-base font-semibold flex items-center gap-2 mb-3">
                    <Wand2 className="h-4 w-4" />
                    AI Model
                  </Label>
                  <Select 
                    value={availableModels.length > 0 ? aiModel : undefined} 
                    onValueChange={(value) => { 
                      setAiModel(value); 
                      handleAIInputChange(); 
                    }}
                    disabled={availableModels.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select AI model" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex items-center gap-2">
                            {model.name}
                            {model.supportsThinking && <Brain className="h-3 w-3" />}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {availableModels.length === 0 && (
                    <p className="text-sm text-orange-600 mt-2 p-2 bg-orange-50 rounded border border-orange-200">
                      {aiProvider === 'ollama' 
                        ? (ollamaConnected ? 'No models installed. Run: ollama pull llama2' : 'Connect to Ollama first')
                        : 'No models available'
                      }
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {availableModels.length > 0 && aiProvider === 'openai' ? (
                      <>💡 Cost: {availableModels.find(m => m.id === aiModel)?.cost || 'Select a model to see pricing'}
                      <br />
                      Choose based on your needs: GPT-4o Mini for cost efficiency, GPT-4o for multimodal tasks, o1/o3 for complex reasoning, GPT-5 for cutting-edge performance.</>
                    ) : availableModels.length > 0 && aiProvider === 'ollama' ? (
                      <>💡 {ollamaConnected 
                        ? `${ollamaModels.length} local models available. No API costs.`
                        : 'Install models with: ollama pull llama2'
                      }</>
                    ) : null}
                  </p>
                </div>

                {/* Temperature Control */}
                <div>
                  <Label className="text-base font-semibold flex items-center gap-2 mb-3">
                    <Zap className="h-4 w-4" />
                    Temperature ({temperature})
                  </Label>
                  <div className="space-y-2">
                    <Slider
                      value={[temperature]}
                      onValueChange={(value) => {
                        setTemperature(value[0]);
                        localStorage.setItem('ai_temperature', value[0].toString());
                        handleAIInputChange();
                      }}
                      max={2}
                      min={0}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0 (Deterministic)</span>
                      <span>1 (Balanced)</span>
                      <span>2 (Creative)</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Higher values make output more random and creative, lower values make it more focused and deterministic.
                    </p>
                  </div>
                </div>

                {/* Advanced Settings for Ollama */}
                {aiProvider === 'ollama' && (
                  <Collapsible open={showAdvancedSettings} onOpenChange={setShowAdvancedSettings}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                        <Label className="text-base font-semibold flex items-center gap-2 cursor-pointer">
                          <Settings className="h-4 w-4" />
                          Advanced Settings
                        </Label>
                        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showAdvancedSettings ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4 mt-3">
                      {/* Max Tokens Control */}
                      <div>
                        <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                          <FileSpreadsheet className="h-3 w-3" />
                          Max Tokens ({maxTokens})
                        </Label>
                        <div className="space-y-2">
                          <Slider
                            value={[maxTokens]}
                            onValueChange={(value) => {
                              setMaxTokens(value[0]);
                              localStorage.setItem('ai_max_tokens', value[0].toString());
                              handleAIInputChange();
                            }}
                            max={8192}
                            min={128}
                            step={128}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>128 (Short)</span>
                            <span>2048 (Balanced)</span>
                            <span>8192 (Long)</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Maximum number of tokens to generate. Higher values allow longer responses but may be slower.
                          </p>
                        </div>
                      </div>

                      {/* Top-K Control */}
                      <div>
                        <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                          <Sparkles className="h-3 w-3" />
                          Top-K Sampling ({topK})
                        </Label>
                        <div className="space-y-2">
                          <Slider
                            value={[topK]}
                            onValueChange={(value) => {
                              setTopK(value[0]);
                              localStorage.setItem('ai_top_k', value[0].toString());
                              handleAIInputChange();
                            }}
                            max={100}
                            min={1}
                            step={1}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>1 (Very Focused)</span>
                            <span>40 (Balanced)</span>
                            <span>100 (Diverse)</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Controls vocabulary diversity. Lower values focus on likely words, higher values allow more variety.
                          </p>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Thinking Controls for Reasoning Models */}
                {availableModels.find(m => m.id === aiModel)?.supportsThinking && (
                  <Card className="p-4 border-orange-200 bg-orange-50/50">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Brain className="h-4 w-4 text-orange-600" />
                        <h4 className="font-semibold text-orange-800">Reasoning Model Controls</h4>
                        <Badge variant="outline" className="text-orange-700 border-orange-300">
                          {aiModel}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-medium text-orange-800">Enable Thinking Mode</Label>
                          <p className="text-xs text-orange-600">
                            Allow model to show reasoning process (may include &lt;thinking&gt; tags)
                          </p>
                        </div>
                        <Switch
                          checked={thinkingMode}
                          onCheckedChange={(checked) => {
                            setThinkingMode(checked);
                            localStorage.setItem('thinking_mode', checked.toString());
                            handleAIInputChange();
                          }}
                        />
                      </div>

                      {!thinkingMode && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                          <p className="text-xs text-blue-700">
                            💡 <strong>Recommendation:</strong> Keep thinking mode disabled for faster responses. 
                            The output will be automatically filtered to remove &lt;thinking&gt; content.
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {/* AI Prompt */}
                <div>
                  <Label htmlFor="ai-prompt" className="text-base font-semibold flex items-center gap-2 mb-3">
                    <Brain className="h-4 w-4" />
                    Prompt
                  </Label>
                  <Textarea
                    id="ai-prompt"
                    value={aiPrompt}
                    onChange={(e) => { setAiPrompt(e.target.value); handleAIInputChange(); }}
                    placeholder="What do you want the AI to do with this row data? For example:
- Generate a personalized message for {Full Name}
- Analyze the sentiment of {Feedback}
- Create an email subject line for {Company}
- Classify this lead based on {Industry} and {Company Size}"
                    rows={4}
                  />
                </div>

                {/* Additional Message/Context */}
                <div>
                  <Label htmlFor="ai-message" className="text-base font-semibold mb-3 block">
                    Additional Context (Optional)
                  </Label>
                  <Textarea
                    id="ai-message"
                    value={aiMessage}
                    onChange={(e) => { setAiMessage(e.target.value); handleAIInputChange(); }}
                    placeholder="Add any additional context or instructions for the AI..."
                    rows={3}
                  />
                </div>

                {/* AI Prompt Examples
                
                     <div>
                  <h4 className="font-semibold mb-3">Example Prompts</h4>
                  <div className="grid gap-2">
                    {[
                      {
                        name: 'Personalized Outreach',
                        prompt: 'Write a friendly LinkedIn connection message for {Full Name} who works at {Company}'
                      },
                      {
                        name: 'Email Subject Line',
                        prompt: 'Create an engaging email subject line for {Full Name} based on their role at {Company}'
                      },
                      {
                        name: 'Lead Classification',
                        prompt: 'Classify this lead as Hot, Warm, or Cold based on {Company Size}, {Industry}, and {Title}'
                      },
                      {
                        name: 'Sentiment Analysis',
                        prompt: 'Analyze the sentiment of this feedback and return only: positive, negative, or neutral. Feedback: {Feedback}'
                      }
                    ].map((example, index) => (
                      <Card key={index} className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <p className="font-medium text-sm mb-1">{example.name}</p>
                            <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded block">
                              {example.prompt}
                            </code>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setAiPrompt(example.prompt);
                              handleAIInputChange();
                            }}
                          >
                            Use
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                
                
                
                */}
           
                {/* Preview */}
                {aiPrompt && (
                  <Card className="p-4 bg-muted/50">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Preview
                    </h4>
                    <div className="space-y-2">
                  
                      {firstRow && aiPrompt.includes('{') && (
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Example with actual data from the first row:
                          </p>
                          <span className="font-mono bg-background px-2 py-1 rounded text-sm block">
                            "{aiPrompt.replace(/\{([^}]+)\}/g, (match, columnName) => firstRow[columnName.trim()] || `[${columnName.trim()} not found]`)}{aiMessage ? `. Additional context: ${aiMessage}` : ''}"
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Column references like {`{Column Name}`} will be replaced with actual values from each row.
                    </div>
                  </Card>
                )}
              </div>
            </TabsContent>

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
                  
                  {/* Available columns for AI Agents */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Available Columns
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Click on a column to add it to your instructions. The AI agents will have access to all this data:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {headers.map((header) => (
                        <Badge 
                          key={header} 
                          variant="outline" 
                          className="cursor-pointer hover:bg-muted"
                          onClick={() => {
                            const insertion = `{${header}}`;
                            setUserOfferDetails(prev => prev + (prev ? ' ' : '') + insertion);
                          }}
                        >
                          {header}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* User Offer Details */}
                  <div>
                    <Label className="text-base font-semibold mb-3 block">
                      Your Offer Details
                    </Label>
                    <Textarea 
                      placeholder="Describe your product/service/offer that will be mentioned in messages..."
                      value={userOfferDetails}
                      onChange={(e) => {
                        setUserOfferDetails(e.target.value);
                        setHasChanges(true);
                      }}
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      💡 Tip: Use {`{Column Name}`} to reference lead data in your offer description
                    </p>
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
                        <CardDescription>
                          Creates personalized DM messages
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium">Model</Label>
                          <Select value={messageCreatorModel} onValueChange={(value) => {
                            setMessageCreatorModel(value);
                            setHasChanges(true);
                          }}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {allAvailableModels.map((model) => (
                                <SelectItem key={model.id} value={model.id}>
                                  <div className="flex items-center gap-2">
                                    {model.name}
                                    {model.supportsThinking && <Brain className="h-3 w-3" />}
                                    {isOllamaModel(model.id) && <Server className="h-3 w-3 text-green-600" />}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground mt-1">
                            {isOllamaModel(messageCreatorModel) ? (
                              <span className="flex items-center gap-1">
                                <Server className="h-3 w-3 text-green-600" />
                                Ollama (Local) - {allAvailableModels.find(m => m.id === messageCreatorModel)?.cost}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Key className="h-3 w-3 text-blue-600" />
                                OpenAI (Cloud) - {allAvailableModels.find(m => m.id === messageCreatorModel)?.cost}
                              </span>
                            )}
                          </p>
                        </div>

                        {/* Thinking Mode Toggle */}
                        {availableModels.find(m => m.id === messageCreatorModel)?.supportsThinking && (
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-sm font-medium">Thinking Mode</Label>
                              <p className="text-xs text-muted-foreground">Enable advanced reasoning</p>
                            </div>
                            <Switch
                              checked={messageCreatorThinking}
                              onCheckedChange={(checked) => {
                                setMessageCreatorThinking(checked);
                                setHasChanges(true);
                              }}
                            />
                          </div>
                        )}

                        <div>
                          <Label className="text-sm font-medium">Custom Instructions (Optional)</Label>
                          <Textarea
                            placeholder="Additional instructions for the message creator..."
                            value={messageCreatorInstructions}
                            onChange={(e) => {
                              setMessageCreatorInstructions(e.target.value);
                              setHasChanges(true);
                            }}
                            rows={3}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Lead Roleplay Agent */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <UserCheck className="h-4 w-4" />
                          Lead Roleplay Agent
                        </CardTitle>
                        <CardDescription>
                          Acts as the lead and evaluates messages
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium">Model</Label>
                          <Select value={leadRoleplayModel} onValueChange={(value) => {
                            setLeadRoleplayModel(value);
                            setHasChanges(true);
                          }}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {allAvailableModels.map((model) => (
                                <SelectItem key={model.id} value={model.id}>
                                  <div className="flex items-center gap-2">
                                    {model.name}
                                    {model.supportsThinking && <Brain className="h-3 w-3" />}
                                    {isOllamaModel(model.id) && <Server className="h-3 w-3 text-green-600" />}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground mt-1">
                            {isOllamaModel(leadRoleplayModel) ? (
                              <span className="flex items-center gap-1">
                                <Server className="h-3 w-3 text-green-600" />
                                Ollama (Local) - {allAvailableModels.find(m => m.id === leadRoleplayModel)?.cost}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Key className="h-3 w-3 text-blue-600" />
                                OpenAI (Cloud) - {allAvailableModels.find(m => m.id === leadRoleplayModel)?.cost}
                              </span>
                            )}
                          </p>
                        </div>

                        {/* Thinking Mode Toggle */}
                        {availableModels.find(m => m.id === leadRoleplayModel)?.supportsThinking && (
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-sm font-medium">Thinking Mode</Label>
                              <p className="text-xs text-muted-foreground">Enable advanced reasoning</p>
                            </div>
                            <Switch
                              checked={leadRoleplayThinking}
                              onCheckedChange={(checked) => {
                                setLeadRoleplayThinking(checked);
                                setHasChanges(true);
                              }}
                            />
                          </div>
                        )}

                        <div>
                          <Label className="text-sm font-medium">Custom Instructions (Optional)</Label>
                          <Textarea
                            placeholder="Additional instructions for the lead roleplay..."
                            value={leadRoleplayInstructions}
                            onChange={(e) => {
                              setLeadRoleplayInstructions(e.target.value);
                              setHasChanges(true);
                            }}
                            rows={3}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Settings */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm font-medium">Max Iterations</Label>
                            <p className="text-xs text-muted-foreground">Prevent infinite loops</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground">{maxIterations}</span>
                            <div className="w-32">
                              <Slider 
                                value={[maxIterations]} 
                                onValueChange={(value) => {
                                  setMaxIterations(value[0]);
                                  setHasChanges(true);
                                }}
                                max={10} 
                                min={1} 
                                step={1} 
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Preview */}
                  {userOfferDetails && firstRow && (
                    <Card className="p-4 bg-muted/50">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Preview with First Row Data
                      </h4>
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm text-muted-foreground">Lead Profile:</p>
                          <code className="text-xs bg-background px-2 py-1 rounded block overflow-x-auto">
                            {JSON.stringify(firstRow, null, 2)}
                          </code>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Your Offer (processed):</p>
                          <span className="font-mono bg-background px-2 py-1 rounded text-sm block">
                            {userOfferDetails.replace(/\{([^}]+)\}/g, (match, columnName) => {
                              const value = firstRow[columnName.trim()];
                              return value || `[${columnName.trim()} not found]`;
                            })}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Provider Configuration:</p>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono">Creator:</span>
                              {isOllamaModel(messageCreatorModel) ? (
                                <Badge variant="outline" className="text-green-700">
                                  <Server className="h-3 w-3 mr-1" />
                                  Ollama Local
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-blue-700">
                                  <Key className="h-3 w-3 mr-1" />
                                  OpenAI Cloud
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono">Roleplay:</span>
                              {isOllamaModel(leadRoleplayModel) ? (
                                <Badge variant="outline" className="text-green-700">
                                  <Server className="h-3 w-3 mr-1" />
                                  Ollama Local
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-blue-700">
                                  <Key className="h-3 w-3 mr-1" />
                                  OpenAI Cloud
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">API Key Status:</p>
                          <div className="space-y-1">
                            <Badge variant={localStorage.getItem('openai_api_key') ? "default" : "destructive"}>
                              {localStorage.getItem('openai_api_key') ? "✅ OpenAI API Key Found" : "❌ No OpenAI API Key"}
                            </Badge>
                            <Badge variant={ollamaConnected ? "default" : "destructive"}>
                              {ollamaConnected ? "✅ Ollama Connected" : "❌ Ollama Disconnected"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        The AI agents will use this data to create and evaluate personalized messages.
                      </div>
                    </Card>
                  )}

                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <SheetFooter>
          <div className="flex items-center justify-between w-full">
            <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove Column
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove Column</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to remove the column "{activeColumn}"? This action cannot be undone and will delete all data in this column including any formulas.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleRemoveColumn}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Remove Column
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={
                  !hasChanges || 
                  (mode === 'code' && !validateFormula(formula, headers).isValid) || 
                  (mode === 'ai' && !aiPrompt.trim()) ||
                  (mode === 'firecrawl' && !firecrawlUrl.trim()) ||
                  (mode === 'ai-agents' && !userOfferDetails.trim())
                }
              >
                <Save className="h-4 w-4 mr-2" />
                Save {mode === 'ai' ? 'AI Prompt' : mode === 'firecrawl' ? 'Firecrawl Template' : mode === 'ai-agents' ? 'AI Copy Agents' : 'Formula'}
              </Button>
            </div>
          </div>
        </SheetFooter>
      </SheetContent>

      <SlashMenu
        isVisible={showSlashMenu}
        position={slashMenuPosition}
        onSelect={handleSlashMenuSelect}
        onClose={() => setShowSlashMenu(false)}
        availableColumns={headers}
      />
    </Sheet>
  );
};