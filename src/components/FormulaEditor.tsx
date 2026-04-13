/**
 * FormulaEditor Component (Refactored Orchestrator)
 * 
 * Main orchestrator component that coordinates all formula editing modes.
 * This component is intentionally kept small (~300 lines) by delegating
 * to specialized sub-components and custom hooks.
 * 
 * Architecture:
 * - Custom Hooks: Handle state management and business logic
 * - Sub-Components: Handle UI rendering for each mode
 * - This File: Orchestrates everything and manages data flow
 */

import { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

// Store
import { useDataStore } from '@/stores/useDataStore';

// Custom Hooks
import { useAISettings } from '@/hooks/useAISettings';
import { useOllamaConnection } from '@/hooks/useOllamaConnection';
import { useFormulaGeneration } from '@/hooks/useFormulaGeneration';
import { useSavedFormulas } from '@/hooks/useSavedFormulas';
import { useFormulaMode } from '@/hooks/useFormulaMode';

// Sub-Components
import { ModeSelector } from '@/components/FormulaEditor/ModeSelector';
import { CodeModeEditor } from '@/components/FormulaEditor/modes/CodeModeEditor';
import { AIModeEditor } from '@/components/FormulaEditor/modes/AIModeEditor';
import { FirecrawlModeEditor } from '@/components/FormulaEditor/modes/FirecrawlModeEditor';
import { AIAgentsModeEditor } from '@/components/FormulaEditor/modes/AIAgentsModeEditor';
import { PuppeteerModeEditor } from '@/components/FormulaEditor/modes/PuppeteerModeEditor';
import { AgentModeEditor } from '@/components/FormulaEditor/modes/AgentModeEditor';
import { EmailFinderModeEditor } from '@/components/FormulaEditor/modes/EmailFinderModeEditor';
import { SlashMenu } from '@/components/SlashMenu';

// Utilities
import { validateFormula } from '@/components/FormulaValidator';
import { openAIModels, geminiModels, defaultMessageCreatorInstructions, defaultLeadRoleplayInstructions, getProviderModels, AIProvider } from '@/lib/constants/aiModels';
import type { FormulaMode } from '@/lib/constants/formulaModes';
import { encodeAgentFormula, decodeAgentFormula } from '@/lib/agents/agentFormula';
import { encodeEmailFinderFormula, decodeEmailFinderFormula } from '@/lib/agents/emailFinderFormula';

// Extend window interface for Puppeteer logging
declare global {
  interface Window {
    updatePuppeteerLog?: (message: string) => void;
    setPuppeteerLastResult?: (result: { type: 'success' | 'error', message: string }) => void;
  }
}

interface FormulaEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FormulaEditor = ({ open, onOpenChange }: FormulaEditorProps) => {
  // ============================================================
  // STORE & DATA ACCESS
  // ============================================================
  const { activeColumn, getFormula, setFormula, removeColumn, headers, rows } = useDataStore();

  // ============================================================
  // CUSTOM HOOKS - Business Logic & State Management
  // ============================================================
  const ollamaConnection = useOllamaConnection();
  const aiSettings = useAISettings(ollamaConnection.models);
  const formulaModeHook = useFormulaMode('code');
  const savedFormulasHook = useSavedFormulas();
  const formulaGenerators = useFormulaGeneration();

  // ============================================================
  // LOCAL COMPONENT STATE - UI State Only
  // ============================================================
  const [formula, setFormulaText] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 });
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [formulaName, setFormulaName] = useState('');
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Mode-specific state (AI mode)
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiMessage, setAiMessage] = useState('');

  // Mode-specific state (Firecrawl mode)
  const [firecrawlUrl, setFirecrawlUrl] = useState('');

  // Mode-specific state (AI Agents mode)
  const [userOfferDetails, setUserOfferDetails] = useState('');
  const [messageCreatorModel, setMessageCreatorModel] = useState('gpt-4o-mini');
  const [leadRoleplayModel, setLeadRoleplayModel] = useState('gpt-4o-mini');
  const [messageCreatorThinking, setMessageCreatorThinking] = useState(false);
  const [leadRoleplayThinking, setLeadRoleplayThinking] = useState(false);
  const [messageCreatorInstructions, setMessageCreatorInstructions] = useState('');
  const [leadRoleplayInstructions, setLeadRoleplayInstructions] = useState('');
  const [maxIterations, setMaxIterations] = useState(5);

  // Mode-specific state (Puppeteer mode)
  const [puppeteerCode, setPuppeteerCode] = useState('');
  const [puppeteerTimeout, setPuppeteerTimeout] = useState(30000);
  const [puppeteerHeadless, setPuppeteerHeadless] = useState(true);
  const [puppeteerExecutionLog, setPuppeteerExecutionLog] = useState<string[]>([]);
  const [puppeteerLastResult, setPuppeteerLastResult] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Mode-specific state (Agent mode)
  const [agentProvider, setAgentProvider] = useState<AIProvider>('openai');
  const [agentModel, setAgentModel] = useState('gpt-4o-mini');
  const [agentMaxSteps, setAgentMaxSteps] = useState(10);
  const [agentTemperature, setAgentTemperature] = useState(0.7);
  const [agentThinkingMode, setAgentThinkingMode] = useState(false);
  const [agentInstruction, setAgentInstruction] = useState('');

  // Mode-specific state (Email Finder mode)
  const [emailProvider, setEmailProvider] = useState<AIProvider>('openai');
  const [emailModel, setEmailModel] = useState('gpt-4o-mini');
  const [emailMaxSteps, setEmailMaxSteps] = useState(15);
  const [emailTemperature, setEmailTemperature] = useState(0.3);
  const [emailThinkingMode, setEmailThinkingMode] = useState(false);
  const [emailContext, setEmailContext] = useState('');

  // ============================================================
  // COMPUTED VALUES
  // ============================================================
  const firstRow = rows && rows.length > 0 ? rows[0] : null;

  // Combine all models for AI Agents mode
  const allAvailableModels = [
    ...openAIModels,
    ...geminiModels.map(model => ({
      ...model,
      name: `${model.name} (Gemini)`
    })),
    ...(ollamaConnection.models || []).map(model => ({
      id: model,
      name: `${model} (Ollama)`,
      supportsThinking: false,
      cost: 'Free (Local)'
    }))
  ];

  // Available models for the AI search agent; ollama ones included via helper
  const agentAvailableModels = getProviderModels(agentProvider, ollamaConnection.models || []);

  const emailAvailableModels = getProviderModels(emailProvider, ollamaConnection.models || []);

  // Keep agentModel in sync when provider or ollama models change
  useEffect(() => {
    if (agentAvailableModels.length > 0) {
      // if current model isn't in list or is empty, pick the first one
      const exists = agentAvailableModels.some(m => m.id === agentModel);
      if (!exists) {
        setAgentModel(agentAvailableModels[0].id);
      }
    }
  }, [agentProvider, agentAvailableModels, agentModel]);

  // Keep emailModel in sync
  useEffect(() => {
    if (emailAvailableModels.length > 0) {
      const exists = emailAvailableModels.some(m => m.id === emailModel);
      if (!exists) {
        setEmailModel(emailAvailableModels[0].id);
      }
    }
  }, [emailProvider, emailAvailableModels, emailModel]);

  // ============================================================
  // EFFECTS
  // ============================================================

  // Initialize Ollama connection on mount so Ollama models are available 
  // across all modes (AI Agents, AI Web Research Agent, etc.)
  useEffect(() => {
    ollamaConnection.checkConnection();
  }, [ollamaConnection.checkConnection]);

  // Expose Puppeteer logging functions to window
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.updatePuppeteerLog = (message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        setPuppeteerExecutionLog(prev => [...prev, `${timestamp}: ${message}`]);
      };
      window.setPuppeteerLastResult = (result: { type: 'success' | 'error', message: string }) => {
        setPuppeteerLastResult(result);
      };
    }

    return () => {
      if (typeof window !== 'undefined') {
        delete window.updatePuppeteerLog;
        delete window.setPuppeteerLastResult;
      }
    };
  }, []);

  // Load existing formula when column changes
  useEffect(() => {
    if (activeColumn) {
      const existingFormula = getFormula(activeColumn);
      setFormulaText(existingFormula);
      setHasChanges(false);

      // Detect mode from formula
      const detectedMode = formulaModeHook.detectModeFromFormula(existingFormula);
      formulaModeHook.setMode(detectedMode);

      // Parse agent config if in agent mode
      if (detectedMode === 'agent') {
        const agentConfig = decodeAgentFormula(existingFormula);
        if (agentConfig) {
          setAgentProvider(agentConfig.provider as AIProvider);
          setAgentModel(agentConfig.model);
          setAgentMaxSteps(agentConfig.maxSteps);
          if (agentConfig.temperature !== undefined) setAgentTemperature(agentConfig.temperature);
          if (agentConfig.thinkingMode !== undefined) setAgentThinkingMode(agentConfig.thinkingMode);
          setAgentInstruction(agentConfig.instruction);
        }
      }

      // Parse email finder config
      if (detectedMode === 'email-finder') {
        const emailConfig = decodeEmailFinderFormula(existingFormula);
        if (emailConfig) {
          setEmailProvider(emailConfig.provider as AIProvider);
          setEmailModel(emailConfig.model);
          setEmailMaxSteps(emailConfig.maxSteps);
          if (emailConfig.temperature !== undefined) setEmailTemperature(emailConfig.temperature);
          setEmailContext(emailConfig.context);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeColumn]);

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  const handleAIInputChange = () => {
    setHasChanges(true);
  };

  const handleSlashMenuTrigger = (position: { top: number, left: number }) => {
    setSlashMenuPosition(position);
    setShowSlashMenu(true);
  };

  // ============================================================
  // MAIN SAVE HANDLER - Orchestrates formula generation
  // ============================================================

  const handleSave = () => {
    if (!activeColumn) return;

    let finalFormula = '';
    const mode = formulaModeHook.mode;

    try {
      switch (mode) {
        case 'code': {
          // Validate formula syntax
          const validation = validateFormula(formula, headers);
          if (!validation.isValid) {
            toast({
              title: "Validation Error",
              description: "Please fix the formula errors before saving.",
              variant: "destructive",
            });
            return;
          }
          finalFormula = formula;
          break;
        }

        case 'ai': {
          // Validate AI inputs
          if (!aiPrompt.trim()) {
            toast({
              title: "Validation Error",
              description: "Please enter a prompt for the AI.",
              variant: "destructive",
            });
            return;
          }

          // Generate AI formula using the hook
          finalFormula = formulaGenerators.generateAIFormula({
            prompt: aiPrompt,
            message: aiMessage,
            model: aiSettings.model,
            provider: aiSettings.aiProvider,
            temperature: aiSettings.temperature,
            maxTokens: aiSettings.maxTokens,
            topK: aiSettings.topK,
            thinkingMode: aiSettings.thinkingMode,
            ollamaBaseUrl: aiSettings.ollamaBaseUrl
          });
          break;
        }

        case 'firecrawl': {
          // Validate Firecrawl inputs
          if (!firecrawlUrl.trim()) {
            toast({
              title: "Validation Error",
              description: "Please enter a URL template for Firecrawl.",
              variant: "destructive",
            });
            return;
          }

          finalFormula = formulaGenerators.generateFirecrawlFormula(firecrawlUrl);
          break;
        }

        case 'ai-agents': {
          // Validate AI Agents inputs
          if (!userOfferDetails.trim()) {
            toast({
              title: "Validation Error",
              description: "Please enter your offer details for the AI agents.",
              variant: "destructive",
            });
            return;
          }

          finalFormula = formulaGenerators.generateAIAgentsFormula({
            userOfferDetails,
            messageCreatorModel,
            leadRoleplayModel,
            messageCreatorThinking,
            leadRoleplayThinking,
            messageCreatorInstructions: messageCreatorInstructions || defaultMessageCreatorInstructions,
            leadRoleplayInstructions: leadRoleplayInstructions || defaultLeadRoleplayInstructions,
            maxIterations
          });
          break;
        }

        case 'puppeteer': {
          finalFormula = formulaGenerators.generatePuppeteerFormula({
            code: puppeteerCode,
            timeout: puppeteerTimeout,
            headless: puppeteerHeadless
          });
          break;
        }

        case 'agent': {
          if (!agentInstruction.trim()) {
            toast({
              title: 'Validation Error',
              description: 'Please enter a research instruction for the AI Agent.',
              variant: 'destructive',
            });
            return;
          }
          finalFormula = encodeAgentFormula({
            provider: agentProvider,
            model: agentModel,
            maxSteps: agentMaxSteps,
            temperature: agentTemperature,
            thinkingMode: agentThinkingMode,
            instruction: agentInstruction,
          });
          break;
        }

        case 'email-finder': {
          if (!emailContext.trim()) {
            toast({
              title: 'Validation Error',
              description: 'Please enter lead context for the Email Finder.',
              variant: 'destructive',
            });
            return;
          }
          finalFormula = encodeEmailFinderFormula({
            provider: emailProvider,
            model: emailModel,
            maxSteps: emailMaxSteps,
            temperature: emailTemperature,
            context: emailContext,
          });
          break;
        }

        default:
          console.error('Unknown mode:', mode);
          return;
      }

      // Save the formula
      setFormula(activeColumn, finalFormula);
      onOpenChange(false);

      toast({
        title: "Formula Saved",
        description: `Formula for "${activeColumn}" has been saved.`,
      });

    } catch (error) {
      console.error('Error saving formula:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save formula",
        variant: "destructive",
      });
    }
  };

  const handleRemoveColumn = () => {
    if (activeColumn) {
      removeColumn(activeColumn);
      setShowRemoveDialog(false);
      onOpenChange(false);
      toast({
        title: "Column Removed",
        description: `Column "${activeColumn}" has been removed.`,
      });
    }
  };

  // ============================================================
  // JSX RENDER - Clean orchestration of sub-components
  // ============================================================

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-[800px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Formula: {activeColumn}</SheetTitle>
            <SheetDescription>
              Write JavaScript formulas, use AI to generate content, or automate with Puppeteer
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6">
            <Tabs value={formulaModeHook.mode} onValueChange={(value) => formulaModeHook.setMode(value as FormulaMode)}>
              <ModeSelector
                mode={formulaModeHook.mode}
                onModeChange={(mode) => formulaModeHook.setMode(mode)}
              />

              <TabsContent value="code" className="space-y-4">
                <CodeModeEditor
                  formula={formula}
                  headers={headers}
                  savedFormulas={savedFormulasHook.savedFormulas}
                  formulaName={formulaName}
                  onFormulaChange={(value) => {
                    setFormulaText(value);
                    setHasChanges(true);
                  }}
                  onFormulaNameChange={setFormulaName}
                  onSaveFormula={() => {
                    savedFormulasHook.saveFormula(formulaName, formula);
                    setFormulaName('');
                  }}
                  onLoadFormula={(savedFormula) => {
                    setFormulaText(savedFormula.code);
                    setHasChanges(true);
                  }}
                  onDeleteFormula={savedFormulasHook.deleteFormula}
                  onClearFormula={() => {
                    setFormulaText('');
                    setFormulaName('');
                    setHasChanges(true);
                  }}
                  onSlashMenuTrigger={handleSlashMenuTrigger}
                />
              </TabsContent>

              <TabsContent value="ai" className="space-y-4">
                <AIModeEditor
                  headers={headers}
                  firstRow={firstRow}
                  provider={aiSettings.aiProvider}
                  onProviderChange={aiSettings.setAiProvider}
                  ollamaConnected={ollamaConnection.connected}
                  ollamaModels={ollamaConnection.models}
                  ollamaBaseUrl={aiSettings.ollamaBaseUrl}
                  onRefreshConnection={ollamaConnection.checkConnection}
                  onBaseUrlChange={aiSettings.setOllamaBaseUrl}
                  availableModels={aiSettings.availableModels}
                  selectedModel={aiSettings.model}
                  onModelChange={aiSettings.setModel}
                  temperature={aiSettings.temperature}
                  onTemperatureChange={aiSettings.setTemperature}
                  maxTokens={aiSettings.maxTokens}
                  onMaxTokensChange={aiSettings.setMaxTokens}
                  topK={aiSettings.topK}
                  onTopKChange={aiSettings.setTopK}
                  thinkingMode={aiSettings.thinkingMode}
                  onThinkingModeChange={aiSettings.setThinkingMode}
                  prompt={aiPrompt}
                  onPromptChange={setAiPrompt}
                  message={aiMessage}
                  onMessageChange={setAiMessage}
                  showAdvancedSettings={showAdvancedSettings}
                  onAdvancedSettingsChange={setShowAdvancedSettings}
                  onInputChange={handleAIInputChange}
                />
              </TabsContent>

              <TabsContent value="firecrawl" className="space-y-4">
                <FirecrawlModeEditor
                  headers={headers}
                  firstRow={firstRow}
                  url={firecrawlUrl}
                  onUrlChange={setFirecrawlUrl}
                  onInputChange={handleAIInputChange}
                />
              </TabsContent>

              <TabsContent value="ai-agents" className="space-y-4">
                <AIAgentsModeEditor
                  headers={headers}
                  firstRow={firstRow}
                  userOfferDetails={userOfferDetails}
                  onUserOfferDetailsChange={setUserOfferDetails}
                  messageCreatorModel={messageCreatorModel}
                  onMessageCreatorModelChange={setMessageCreatorModel}
                  leadRoleplayModel={leadRoleplayModel}
                  onLeadRoleplayModelChange={setLeadRoleplayModel}
                  messageCreatorThinking={messageCreatorThinking}
                  onMessageCreatorThinkingChange={setMessageCreatorThinking}
                  leadRoleplayThinking={leadRoleplayThinking}
                  onLeadRoleplayThinkingChange={setLeadRoleplayThinking}
                  messageCreatorInstructions={messageCreatorInstructions}
                  onMessageCreatorInstructionsChange={setMessageCreatorInstructions}
                  leadRoleplayInstructions={leadRoleplayInstructions}
                  onLeadRoleplayInstructionsChange={setLeadRoleplayInstructions}
                  maxIterations={maxIterations}
                  onMaxIterationsChange={setMaxIterations}
                  allAvailableModels={allAvailableModels}
                  ollamaConnected={ollamaConnection.connected}
                  onInputChange={handleAIInputChange}
                />
              </TabsContent>

              <TabsContent value="puppeteer" className="space-y-4">
                <PuppeteerModeEditor
                  headers={headers}
                  firstRow={firstRow}
                  code={puppeteerCode}
                  onCodeChange={setPuppeteerCode}
                  timeout={puppeteerTimeout}
                  onTimeoutChange={setPuppeteerTimeout}
                  headless={puppeteerHeadless}
                  onHeadlessChange={setPuppeteerHeadless}
                  executionLog={puppeteerExecutionLog}
                  onClearLog={() => setPuppeteerExecutionLog([])}
                  lastResult={puppeteerLastResult}
                  onInputChange={handleAIInputChange}
                />
              </TabsContent>

              <TabsContent value="agent" className="space-y-4">
                <AgentModeEditor
                  headers={headers}
                  firstRow={firstRow}
                  provider={agentProvider}
                  onProviderChange={setAgentProvider}
                  model={agentModel}
                  onModelChange={setAgentModel}
                  maxSteps={agentMaxSteps}
                  onMaxStepsChange={setAgentMaxSteps}
                  temperature={agentTemperature}
                  onTemperatureChange={setAgentTemperature}
                  thinkingMode={agentThinkingMode}
                  onThinkingModeChange={setAgentThinkingMode}
                  instruction={agentInstruction}
                  onInstructionChange={setAgentInstruction}
                  onInputChange={handleAIInputChange}
                  ollamaModels={ollamaConnection.models}
                />
              </TabsContent>

              <TabsContent value="email-finder" className="space-y-4">
                <EmailFinderModeEditor
                  headers={headers}
                  firstRow={firstRow}
                  provider={emailProvider}
                  onProviderChange={setEmailProvider}
                  model={emailModel}
                  onModelChange={setEmailModel}
                  maxSteps={emailMaxSteps}
                  onMaxStepsChange={setEmailMaxSteps}
                  temperature={emailTemperature}
                  onTemperatureChange={setEmailTemperature}
                  thinkingMode={emailThinkingMode}
                  onThinkingModeChange={setEmailThinkingMode}
                  context={emailContext}
                  onContextChange={setEmailContext}
                  onInputChange={handleAIInputChange}
                  ollamaModels={ollamaConnection.models}
                />
              </TabsContent>
            </Tabs>

            {/* Footer Actions */}
            <div className="flex justify-between items-center mt-6 pt-4 border-t">
              <Button
                variant="destructive"
                onClick={() => setShowRemoveDialog(true)}
              >
                Remove Column
              </Button>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={!hasChanges && formulaModeHook.mode === 'code'}>
                  Save Formula
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Slash Menu for Code Mode */}
      <SlashMenu
        isVisible={showSlashMenu}
        position={slashMenuPosition}
        onClose={() => setShowSlashMenu(false)}
        onSelect={(value) => {
          if (textareaRef.current) {
            const start = textareaRef.current.selectionStart;
            const newFormula = formula.substring(0, start - 1) + value + formula.substring(start);
            setFormulaText(newFormula);
            setHasChanges(true);
          }
          setShowSlashMenu(false);
        }}
        availableColumns={headers}
      />

      {/* Remove Column Confirmation Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Column?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the column "{activeColumn}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveColumn}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
