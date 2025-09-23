import { useState, useEffect, useCallback } from 'react';
import { Settings, Key, KeyRound, Save, Server, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { checkOllamaConnection as checkOllamaStatus, SUGGESTED_MODELS } from '@/lib/ollama';

export const AIConfiguration = () => {
  console.log('🏗️ AIConfiguration component rendered');
  
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-3.5-turbo');
  const [customPrompt, setCustomPrompt] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [firecrawlKey, setFirecrawlKey] = useState('');
  const [hasFirecrawlKey, setHasFirecrawlKey] = useState(false);
  const [aiProvider, setAiProvider] = useState<'openai' | 'ollama'>('openai');
  const [ollamaConnected, setOllamaConnected] = useState(false);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [checkingOllama, setCheckingOllama] = useState(false);
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState('http://localhost:11434');

  const checkOllamaConnection = useCallback(async () => {
    console.log('🔍 checkOllamaConnection called');
    setCheckingOllama(true);
    try {
      console.log('📡 Checking Ollama status...');
      const status = await checkOllamaStatus();
      console.log('📊 Ollama status result:', status);
      setOllamaConnected(status.connected);
      setOllamaModels(status.models);
      
      if (!status.connected && status.error) {
        console.warn('⚠️ Ollama connection failed:', status.error);
      } else {
        console.log('✅ Ollama connected, models:', status.models);
      }
    } catch (error) {
      console.error('❌ Error checking Ollama:', error);
      setOllamaConnected(false);
      setOllamaModels([]);
    } finally {
      console.log('🏁 checkOllamaConnection finished');
      setCheckingOllama(false);
    }
  }, []);

  useEffect(() => {
    console.log('🚀 AIConfiguration useEffect (settings load) triggered');
    
    const initializeComponent = async () => {
      // Load saved settings
      const savedApiKey = localStorage.getItem('openai_api_key');
      const savedFirecrawlKey = localStorage.getItem('firecrawl_api_key');
      const savedModel = localStorage.getItem('ai_model');
      const savedPrompt = localStorage.getItem('custom_ai_prompt');
      const savedProvider = localStorage.getItem('ai_provider') as 'openai' | 'ollama' || 'openai';
      const savedOllamaUrl = localStorage.getItem('ollama_base_url') || 'http://localhost:11434';

      console.log('💾 Loaded settings:', { savedProvider, savedModel, savedOllamaUrl });

      if (savedApiKey) {
        setApiKey(savedApiKey);
        setHasApiKey(true);
      }
      if (savedFirecrawlKey) {
        setFirecrawlKey(savedFirecrawlKey);
        setHasFirecrawlKey(true);
      }
      if (savedModel) {
        setModel(savedModel);
      }
      if (savedPrompt) {
        setCustomPrompt(savedPrompt);
      }
      setAiProvider(savedProvider);
      setOllamaBaseUrl(savedOllamaUrl);
      
      // Check Ollama connection on load only if provider is ollama
      if (savedProvider === 'ollama') {
        console.log('🔌 Triggering Ollama connection check from useEffect');
        try {
          const status = await checkOllamaStatus();
          console.log('📊 Ollama status result:', status);
          setOllamaConnected(status.connected);
          setOllamaModels(status.models);
          
          if (!status.connected && status.error) {
            console.warn('⚠️ Ollama connection failed:', status.error);
          } else {
            console.log('✅ Ollama connected, models:', status.models);
          }
        } catch (error) {
          console.error('❌ Error checking Ollama:', error);
          setOllamaConnected(false);
          setOllamaModels([]);
        }
      }
    };
    
    initializeComponent();
  }, []);

  // Auto-select first Ollama model when models are loaded and provider is ollama
  useEffect(() => {
    console.log('🎯 Auto-select model useEffect triggered:', {
      aiProvider,
      ollamaModelsLength: ollamaModels.length,
      currentModel: model,
      ollamaModels
    });
    
    if (aiProvider === 'ollama' && ollamaModels.length > 0 && !model) {
      console.log('✨ Auto-selecting first Ollama model:', ollamaModels[0]);
      setModel(ollamaModels[0]);
    }
  }, [aiProvider, ollamaModels, model]);

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem('openai_api_key', apiKey.trim());
      setHasApiKey(true);
    }
    if (firecrawlKey.trim()) {
      localStorage.setItem('firecrawl_api_key', firecrawlKey.trim());
      setHasFirecrawlKey(true);
    }
    localStorage.setItem('ai_model', model);
    localStorage.setItem('custom_ai_prompt', customPrompt);
    localStorage.setItem('ai_provider', aiProvider);
    localStorage.setItem('ollama_base_url', ollamaBaseUrl);

    toast({
      title: "AI Settings Saved",
      description: "Your AI configuration has been saved successfully.",
    });

    setOpen(false);
  };

  const handleClearApiKey = () => {
    localStorage.removeItem('openai_api_key');
    setApiKey('');
    setHasApiKey(false);
    toast({
      title: "API Key Cleared",
      description: "Your OpenAI API key has been removed.",
    });
  };

  const handleClearFirecrawlKey = () => {
    localStorage.removeItem('firecrawl_api_key');
    setFirecrawlKey('');
    setHasFirecrawlKey(false);
    toast({
      title: "API Key Cleared",
      description: "Your Firecrawl API key has been removed.",
    });
  };

  const availableModels = [
    'gpt-3.5-turbo',
    'gpt-4',
    'gpt-4-turbo',
    'gpt-4o',
    'gpt-4o-mini'
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <KeyRound className="h-4 w-4" />
          API Keys
          {hasApiKey && <div className="w-2 h-2 bg-green-500 rounded-full" />}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl h-[80vh] overflow-y-scroll">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            AI Configuration
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* API Keys Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Key className="h-4 w-4" />
                API Keys
              </CardTitle>
              <CardDescription>
                Your API keys are stored locally and never sent to our servers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key">OpenAI API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="api-key"
                    type="password"
                    placeholder={hasApiKey ? "API key is saved" : "Enter your OpenAI API key"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  {hasApiKey && (
                    <Button variant="outline" onClick={handleClearApiKey}>
                      Clear
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Get your API key from{' '}
                  <a 
                    href="https://platform.openai.com/api-keys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    OpenAI Platform
                  </a>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="firecrawl-key">Firecrawl API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="firecrawl-key"
                    type="password"
                    placeholder={hasFirecrawlKey ? "API key is saved" : "Enter your Firecrawl API key"}
                    value={firecrawlKey}
                    onChange={(e) => setFirecrawlKey(e.target.value)}
                  />
                  {hasFirecrawlKey && (
                    <Button variant="outline" onClick={handleClearFirecrawlKey}>
                      Clear
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Get your API key from{' '}
                  <a 
                    href="https://app.firecrawl.dev/api-keys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Firecrawl
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* AI Provider Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Server className="h-4 w-4" />
                AI Provider
              </CardTitle>
              <CardDescription>
                Choose between OpenAI's cloud models or local Ollama models.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="provider-select">Provider</Label>
                <Select 
                  value={aiProvider} 
                  onValueChange={(value: 'openai' | 'ollama') => {
                    console.log('🔄 Provider change initiated:', { from: aiProvider, to: value });
                    try {
                      console.log('📝 Setting provider to:', value);
                      setAiProvider(value);
                      
                      // Reset model when switching providers to prevent conflicts
                      if (value === 'openai') {
                        console.log('🤖 Switching to OpenAI, setting default model');
                        setModel('gpt-3.5-turbo'); // Default OpenAI model
                      } else {
                        console.log('🦙 Switching to Ollama, clearing model');
                        setModel(''); // Clear model until Ollama models are loaded
                      }
                      
                      if (value === 'ollama') {
                        console.log('⏰ Scheduling Ollama connection check');
                        // Delay the connection check to avoid blocking the UI
                        setTimeout(() => {
                          console.log('🔍 Executing delayed Ollama connection check');
                          checkOllamaConnection().catch(error => {
                            console.error('❌ Ollama connection check failed:', error);
                          });
                        }, 100);
                      }
                    } catch (error) {
                      console.error('💥 Error changing provider:', error);
                    }
                  }}
                >
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
              </div>
              
              {/* Ollama Configuration */}
              {aiProvider === 'ollama' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="ollama-url">Ollama Base URL</Label>
                    <Input
                      id="ollama-url"
                      type="url"
                      placeholder="http://localhost:11434"
                      value={ollamaBaseUrl}
                      onChange={(e) => setOllamaBaseUrl(e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground">
                      The base URL where your Ollama server is running. Default is http://localhost:11434
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Ollama Status</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={checkOllamaConnection}
                      disabled={checkingOllama}
                    >
                      {checkingOllama ? 'Checking...' : 'Refresh'}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-muted rounded">
                    {checkingOllama ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm">Checking connection...</span>
                      </div>
                    ) : ollamaConnected ? (
                      <div className="flex items-center gap-2">
                        <Wifi className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-700">Connected to Ollama</span>
                        <span className="text-xs text-muted-foreground">({ollamaModels.length} models)</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <WifiOff className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-red-700">Ollama not running</span>
                      </div>
                    )}
                  </div>
                  {!ollamaConnected && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Make sure Ollama is running on{' '}
                        <code className="bg-muted px-1 rounded">localhost:11434</code>.
                        {' '}Download from{' '}
                        <a 
                          href="https://ollama.ai" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          ollama.ai
                        </a>
                      </p>
                      <div className="p-2 bg-orange-50 border border-orange-200 rounded text-sm">
                        💡 <strong>Quick Start:</strong>
                        <ol className="list-decimal list-inside mt-1 space-y-1 text-xs">
                          <li>Download and install Ollama</li>
                          <li>Open terminal and run: <code className="bg-orange-100 px-1 rounded">ollama serve</code></li>
                          <li>Install a model: <code className="bg-orange-100 px-1 rounded">ollama pull llama2</code></li>
                          <li>Refresh this page to see available models</li>
                        </ol>
                      </div>
                    </div>
                  )}
                  
                  {/* Model suggestions when connected but no models */}
                  {ollamaConnected && ollamaModels.length === 0 && (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        No models installed. Here are some popular models you can install:
                      </p>
                      <div className="grid gap-2">
                        {SUGGESTED_MODELS.slice(0, 3).map((suggestedModel) => (
                          <div key={suggestedModel.name} className="p-3 bg-muted rounded border">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{suggestedModel.name}</p>
                                <p className="text-xs text-muted-foreground mb-1">
                                  {suggestedModel.description}
                                </p>
                                <code className="text-xs bg-background px-2 py-1 rounded">
                                  {suggestedModel.command}
                                </code>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {suggestedModel.size}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        💡 Run these commands in your terminal to install models.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Model Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Model Selection</CardTitle>
              <CardDescription>
                {aiProvider === 'openai' 
                  ? 'Choose which OpenAI model to use for AI operations.'
                  : 'Choose which local Ollama model to use for AI operations.'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="model-select">Model</Label>
                <Select value={model || ''} onValueChange={setModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {aiProvider === 'openai' ? (
                      availableModels.map((modelOption) => (
                        <SelectItem key={modelOption} value={modelOption}>
                          {modelOption}
                        </SelectItem>
                      ))
                    ) : (
                      ollamaModels && ollamaModels.length > 0 ? (
                        ollamaModels.map((modelOption) => (
                          <SelectItem key={modelOption} value={modelOption}>
                            {modelOption}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="__placeholder__" disabled>
                          {checkingOllama ? 'Loading models...' : ollamaConnected ? 'No models installed' : 'Connect to Ollama first'}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {aiProvider === 'openai' 
                    ? 'GPT-4 models are more powerful but cost more. GPT-3.5-turbo is faster and cheaper.'
                    : ollamaConnected
                      ? `${ollamaModels.length} local models available. No API costs.`
                      : 'Install models with: ollama pull llama2'
                  }
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Custom Prompt */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Custom AI Prompt</CardTitle>
              <CardDescription>
                Set a default prompt for the "Custom AI Prompt" template.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="custom-prompt">Default Prompt</Label>
                <Textarea
                  id="custom-prompt"
                  placeholder="Enter your default AI prompt..."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  rows={3}
                />
                <p className="text-sm text-muted-foreground">
                  This prompt will be used when you select the "Custom AI Prompt" template. 
                  Column variables will be appended automatically.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save Configuration
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
