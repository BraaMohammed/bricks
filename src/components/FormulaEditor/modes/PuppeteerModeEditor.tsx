import { Binocular, InfoCircle, Sparks, Xmark } from 'iconoir-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { PuppeteerDocsDialog } from './PuppeteerDocsDialog';
import { PuppeteerTemplatesDialog } from './PuppeteerTemplatesDialog';

import { useDataStore } from '@/stores/useDataStore';
import { usePuppeteerStore } from '@/stores/editor/usePuppeteerStore';
import { useUIStore } from '@/stores/editor/useUIStore';

export const PuppeteerModeEditor = () => {
  const { headers, rows } = useDataStore();
  const firstRow = rows && rows.length > 0 ? rows[0] : null;

  const {
    puppeteerCode: code,
    setPuppeteerCode: onCodeChange,
    puppeteerTimeout: timeout,
    setPuppeteerTimeout: onTimeoutChange,
    puppeteerHeadless: headless,
    setPuppeteerHeadless: onHeadlessChange,
    puppeteerExecutionLog: executionLog,
    setPuppeteerExecutionLog: onClearLogRaw,
    puppeteerLastResult: lastResult
  } = usePuppeteerStore();

  const { setHasChanges } = useUIStore();

  const [docsDialogOpen, setDocsDialogOpen] = useState(false);
  const [templatesDialogOpen, setTemplatesDialogOpen] = useState(false);

  const handleInputChange = () => {
    setHasChanges(true);
  };

  const onClearLog = () => onClearLogRaw([]);

  const handleTemplateUse = (templateCode: string) => {
    onCodeChange(templateCode);
    handleInputChange();
    setTemplatesDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Binocular className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Puppeteer Browser Automation</h3>
          </div>
          <div className="flex items-center gap-2">
            <PuppeteerDocsDialog 
              open={docsDialogOpen} 
              onOpenChange={setDocsDialogOpen} 
            />
            <PuppeteerTemplatesDialog 
              open={templatesDialogOpen} 
              onOpenChange={setTemplatesDialogOpen}
              onTemplateUse={handleTemplateUse}
            />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Write Puppeteer code to automate browser interactions. Use <code className="bg-muted px-1 rounded text-xs">rowData.ColumnName</code> to access your data.
        </p>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5" />
            Queue-based
          </Badge>
          <Badge variant="outline" className="text-xs">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5" />
            Stealth enabled
          </Badge>
          <Badge variant="outline" className="text-xs">
            API: localhost:3000
          </Badge>
        </div>
      </div>
        
        {/* Puppeteer Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Execution Timeout (ms)
            </Label>
            <Input
              type="number"
              min="5000"
              max="60000"
              step="1000"
              value={timeout}
              onChange={(e) => {
                onTimeoutChange(parseInt(e.target.value));
                handleInputChange();
              }}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Timeout for Puppeteer execution (5-60 seconds)
            </p>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">
              Browser Mode
            </Label>
            <div className="flex items-center space-x-2">
              <Switch
                checked={headless}
                onCheckedChange={(checked) => {
                  onHeadlessChange(checked);
                  handleInputChange();
                }}
              />
              <Label className="text-sm">
                Headless Mode {headless ? '(Recommended)' : '(Debug)'}
              </Label>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Headless mode is faster and uses less resources
            </p>
          </div>
        </div>
      
        {/* Puppeteer Code Editor */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold">Puppeteer Code</h4>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1 text-xs">
                <Binocular className="h-3 w-3" />
                Server-side execution
              </Badge>
            </div>
          </div>
          <Textarea
            value={code}
            onChange={(e) => {
              onCodeChange(e.target.value);
              handleInputChange();
            }}
            placeholder="// Enter your Puppeteer automation code here
// Example: Get page title
const url = rowData.URL;  // Access column data via rowData object
await page.goto(url);
return await page.title();

// Available objects:
// - page: Puppeteer page instance
// - browser: Puppeteer browser instance  
// - rowData: Current row data (use: rowData.ColumnName or rowData['Column Name'])
// - console: For logging (console.log)

// IMPORTANT: Always use rowData.ColumnName, NOT {ColumnName} placeholders!
// Error handling is automatic - check browser console for detailed logs"
            className="font-mono text-sm"
            rows={12}
          />
        </div>

        {/* Last Execution Result */}
        {lastResult && (
          <Card className={`p-4 ${lastResult.type === 'success' ? 'bg-muted/50 border-border' : 'bg-destructive/10 border-destructive/30'}`}>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              {lastResult.type === 'success' ? (
                <>
                  <Sparks className="h-4 w-4 text-primary" />
                  <span>Last Execution Result</span>
                </>
              ) : (
                <>
                  <Xmark className="h-4 w-4 text-destructive" />
                  <span className="text-destructive">Execution Error</span>
                </>
              )}
            </h4>
            <div className={`p-3 rounded ${lastResult.type === 'success' ? 'bg-muted' : 'bg-destructive/20'}`}>
              <pre className={`text-xs whitespace-pre-wrap ${lastResult.type === 'success' ? 'text-foreground' : 'text-destructive'}`}>
                {lastResult.message}
              </pre>
            </div>
          </Card>
        )}

        {/* Execution Logs */}
        {executionLog.length > 0 && (
          <Card className="p-4 bg-muted/50 border-border">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <InfoCircle className="h-4 w-4" />
              <span>Execution Log</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onClearLog}
                className="ml-auto h-6 px-2 text-xs"
              >
                Clear
              </Button>
            </h4>
            <div className="bg-muted p-3 rounded max-h-40 overflow-y-auto">
              {executionLog.map((log, index) => (
                <div key={index} className="text-xs text-muted-foreground mb-1 font-mono">
                  {log}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Preview */}
        {code && firstRow && (
          <Card className="p-4 bg-muted/50">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Sparks className="h-4 w-4" />
              Execution Configuration
            </h4>
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Execution Mode:</span>
                  <Badge variant="outline" className="text-xs">
                    {headless ? 'Headless' : 'GUI Debug'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Timeout:</span>
                  <Badge variant="outline" className="text-xs">
                    {timeout}ms
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Queue Processing:</span>
                  <Badge variant="outline" className="text-xs">
                    Server-side
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Anti-Detection:</span>
                  <Badge variant="outline" className="text-xs">
                    Stealth enabled
                  </Badge>
                </div>
              </div>
              <div className="p-3 bg-muted/50 border border-border rounded">
                <p className="text-xs text-muted-foreground">
                  ✅ <strong>Ready to execute:</strong> Your code will be sent to the queue and processed on the server. 
                  Execution logs and results will appear above in real-time.
                </p>
              </div>
            </div>
          </Card>
        )}

    </div>
  );
};
