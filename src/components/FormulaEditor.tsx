import { useState, useEffect, useRef, useCallback } from 'react';
import { Code, Save, X, Info, Sparkles, Brain, Wand2, Trash2, Upload, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useDataStore } from '@/stores/useDataStore';
import { toast } from '@/hooks/use-toast';
import { SlashMenu } from './SlashMenu';
import { FormulaValidator, validateFormula } from './FormulaValidator';
import { Input } from '@/components/ui/input';
import Papa from 'papaparse';

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
  const [mode, setMode] = useState<'code' | 'ai' | 'firecrawl'>('code');
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

  const firstRow = rows && rows.length > 0 ? rows[0] : null;

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
      if (existingFormula.includes('localStorage.getItem(\'openai_api_key\')')) {
        setMode('ai');
        // Try to extract AI prompt and model from existing formula
        const promptMatch = existingFormula.match(/content:\s*["'`]([^"'`]+)["'`]/);
        const modelMatch = existingFormula.match(/model:\s*["'`]([^"'`]+)["'`]/);
        
        if (promptMatch) {
          setAiPrompt(promptMatch[1]);
        }
        if (modelMatch) {
          setAiModel(modelMatch[1]);
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
        finalFormula = generateAIFormula(aiPrompt, aiMessage, aiModel);
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
      
      setFormula(activeColumn, finalFormula);
      setHasChanges(false);
      toast({
        title: "Formula Saved",
        description: `${mode === 'ai' ? 'AI prompt' : mode === 'firecrawl' ? 'Firecrawl URL template' : 'Formula'} for "${activeColumn}" has been saved.`,
      });
      onOpenChange(false);
    }
  };

  const generateAIFormula = (prompt: string, message: string, model: string) => {
    // Replace {Column Name} references with actual row data access
    const processedPrompt = prompt.replace(/\{([^}]+)\}/g, (match, columnName) => {
      return `\${row["${columnName}"] || ""}`;
    });
    
    const fullPrompt = message ? `${processedPrompt}. Additional context: ${message}` : processedPrompt;
    
    return `// AI Generated Formula
const apiKey = localStorage.getItem('openai_api_key');

if (!apiKey) {
  return 'Please set your OpenAI API key in AI Settings';
}

const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${apiKey}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: '${model}',
    messages: [{
      role: 'user',
      content: \`${fullPrompt.replace(/`/g, '\\`')}\`
    }],
    max_tokens: 150
  })
});

const data = await response.json();

if (data.error) {
  return \`API Error: \${data.error.message}\`;
}

return data.choices[0].message.content;`;
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

try {
  const response = await fetch('https://api.firecrawl.dev/v2/scrape', {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${apiKey}\`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: url,
      formats: ['markdown']
    })
  });

  if (!response.ok) {
    return \`Firecrawl API error: \${response.status} - \${response.statusText}\`;
  }

  const data = await response.json();
  
  if (data.success && data.data && data.data.markdown) {
    return data.data.markdown;
  } else if (data.markdown) {
    return data.markdown;
  } else {
    return \`Unexpected response: \${JSON.stringify(data, null, 2)}\`;
  }
} catch (error) {
  return \`Error: \${error.message}\`;
}`;
  };

  const handleModeChange = (newMode: 'code' | 'ai' | 'firecrawl') => {
    setMode(newMode);
    setHasChanges(true);
    
    if (newMode === 'ai' && !aiPrompt) {
      setAiPrompt('Analyze this data and provide insights');
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
            <TabsList className="grid w-full grid-cols-3">
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
                  <Select value={aiModel} onValueChange={(value) => { setAiModel(value); handleAIInputChange(); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select AI model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4o-mini">GPT-4o Mini (Fast & Cheap)</SelectItem>
                      <SelectItem value="gpt-4o">GPT-4o (Most Capable)</SelectItem>
                      <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                      <SelectItem value="gpt-4">GPT-4</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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
                  (mode === 'firecrawl' && !firecrawlUrl.trim())
                }
              >
                <Save className="h-4 w-4 mr-2" />
                Save {mode === 'ai' ? 'AI Prompt' : mode === 'firecrawl' ? 'Firecrawl Template' : 'Formula'}
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