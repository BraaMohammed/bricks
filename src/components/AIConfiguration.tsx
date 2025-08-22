import { useState, useEffect } from 'react';
import { Settings, Key, KeyRound, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

export const AIConfiguration = () => {
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-3.5-turbo');
  const [customPrompt, setCustomPrompt] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [firecrawlKey, setFirecrawlKey] = useState('');
  const [hasFirecrawlKey, setHasFirecrawlKey] = useState(false);

  useEffect(() => {
    // Load saved settings
    const savedApiKey = localStorage.getItem('openai_api_key');
    const savedFirecrawlKey = localStorage.getItem('firecrawl_api_key');
    const savedModel = localStorage.getItem('ai_model');
    const savedPrompt = localStorage.getItem('custom_ai_prompt');

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
  }, []);

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

          {/* Model Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Model Selection</CardTitle>
              <CardDescription>
                Choose which OpenAI model to use for AI operations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="model-select">Model</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.map((modelOption) => (
                      <SelectItem key={modelOption} value={modelOption}>
                        {modelOption}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  GPT-4 models are more powerful but cost more. GPT-3.5-turbo is faster and cheaper.
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
