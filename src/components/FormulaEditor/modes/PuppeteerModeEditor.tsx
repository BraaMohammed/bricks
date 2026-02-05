import { Bot, Info, Sparkles, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ColumnBadges } from '@/components/FormulaEditor/ColumnBadges';

interface PuppeteerModeEditorProps {
  headers: string[];
  firstRow: Record<string, string> | null;
  // Puppeteer code and configuration
  code: string;
  onCodeChange: (value: string) => void;
  timeout: number;
  onTimeoutChange: (value: number) => void;
  headless: boolean;
  onHeadlessChange: (value: boolean) => void;
  // Execution state
  executionLog: string[];
  onClearLog: () => void;
  lastResult: { type: 'success' | 'error', message: string } | null;
  // Change handler
  onInputChange: () => void;
}

const CODE_TEMPLATES = [
  {
    name: 'Get Page Title (Ultra Simple Test)',
    description: 'Test with example.com - should return "Example Domain"',
    code: 'await page.goto(\'https://example.com\');\nreturn await page.title();'
  },
  {
    name: 'Extract Text Content',
    description: 'Extract text from specific elements',
    code: 'await page.goto(\'{URL}\');\nawait page.waitForSelector(\'h1\', { timeout: 10000 });\nreturn await page.$eval(\'h1\', el => el.textContent);'
  },
  {
    name: 'Take Screenshot',
    description: 'Capture page screenshot as base64',
    code: 'await page.goto(\'{URL}\');\nawait page.setViewport({ width: 1200, height: 800 });\nconst screenshot = await page.screenshot({ encoding: \'base64\' });\nreturn `data:image/png;base64,${screenshot}`;'
  },
  {
    name: 'Get All Links',
    description: 'Extract all links from a page',
    code: 'await page.goto(\'{URL}\');\nconst links = await page.$$eval(\'a\', anchors => \n  anchors.map(a => ({ text: a.textContent, href: a.href })).filter(link => link.href)\n);\nreturn JSON.stringify(links, null, 2);'
  },
  {
    name: 'Form Interaction',
    description: 'Fill and submit forms',
    code: 'await page.goto(\'{URL}\');\nawait page.waitForSelector(\'#search\', { timeout: 5000 });\nawait page.type(\'#search\', \'{Search Term}\');\nawait page.click(\'#submit\');\nawait page.waitForNavigation();\nreturn await page.url();'
  },
  {
    name: 'Wait for Element',
    description: 'Wait for dynamic content to load',
    code: 'await page.goto(\'{URL}\');\n// Wait for dynamic content\nawait page.waitForSelector(\'.dynamic-content\', { timeout: 15000 });\nconst content = await page.$eval(\'.dynamic-content\', el => el.textContent);\nreturn content;'
  }
];

export const PuppeteerModeEditor = ({
  headers,
  firstRow,
  code,
  onCodeChange,
  timeout,
  onTimeoutChange,
  headless,
  onHeadlessChange,
  executionLog,
  onClearLog,
  lastResult,
  onInputChange
}: PuppeteerModeEditorProps) => {
  const handleColumnClick = (columnName: string) => {
    const insertion = `{${columnName}}`;
    onCodeChange(code + (code ? ' ' : '') + insertion);
    onInputChange();
  };

  const handleTemplateUse = (templateCode: string) => {
    onCodeChange(templateCode);
    onInputChange();
  };

  return (
    <div className="space-y-6">
      
      {/* Header Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Puppeteer Browser Automation</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Write Puppeteer code to automate browser interactions. Code runs on the server with stealth plugin for anti-detection.
        </p>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            API: localhost:3000
          </Badge>
          <Badge variant="outline" className="text-xs">
            Queue-based processing
          </Badge>
          <Badge variant="outline" className="text-xs">
            Enhanced logging
          </Badge>
        </div>
      </div>
        
        {/* System Status Check */}
        <Card className="p-4 bg-blue-50/50 border-blue-200">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-blue-600" />
              <h4 className="font-semibold text-blue-800">Puppeteer API Status</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                <span className="text-blue-700">Server: localhost:3000</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-blue-700">Queue: Ready</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-blue-700">Browser Pool: Active</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-blue-700">Stealth Mode: Enabled</span>
              </div>
            </div>
            <div className="text-xs text-blue-600 bg-blue-100 p-2 rounded">
              💡 <strong>Ultra Simple Test:</strong> Try this code: <code className="bg-white px-1 rounded">await page.goto('https://example.com'); return await page.title();</code>
            </div>
            <div className="text-xs text-green-600 bg-green-100 p-2 rounded">
              ✅ <strong>CORS Fixed:</strong> API now supports cross-origin requests from port 8080 to port 3000
            </div>
            <div className="text-xs text-green-600 bg-green-100 p-2 rounded">
              🔍 <strong>Debug Tip:</strong> Open browser console (F12) to see detailed execution logs and error details
            </div>
          </div>
        </Card>
        
        {/* Available columns */}
        <ColumnBadges
          headers={headers}
          onColumnClick={handleColumnClick}
          helpText="Click on a column to add it to your code. The data will be available in your Puppeteer script:"
        />

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
                onInputChange();
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
                  onInputChange();
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
                <Bot className="h-3 w-3" />
                Server-side execution
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1 text-xs">
                <Info className="h-3 w-3" />
                Enhanced logging
              </Badge>
            </div>
          </div>
          <Textarea
            value={code}
            onChange={(e) => {
              onCodeChange(e.target.value);
              onInputChange();
            }}
            placeholder="// Enter your Puppeteer automation code here
// Example: Get page title
await page.goto('{URL}');
return await page.title();

// Available objects:
// - page: Puppeteer page instance
// - browser: Puppeteer browser instance  
// - rowData: Current row data
// - console: For logging (console.log)

// Error handling is automatic - check browser console for detailed logs
// Queue position and timing information will be displayed automatically"
            className="font-mono text-sm"
            rows={12}
          />
        </div>

        {/* Code Templates */}
        <div>
          <h4 className="font-semibold mb-3">Code Templates</h4>
          <div className="grid gap-2">
            {CODE_TEMPLATES.map((template, index) => (
              <Card key={index} className="p-3 hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm">{template.name}</p>
                      <Badge variant="secondary" className="text-xs">
                        {template.description}
                      </Badge>
                    </div>
                    <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded block overflow-x-auto">
                      {template.code.length > 100 
                        ? template.code.substring(0, 100) + '...' 
                        : template.code}
                    </code>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTemplateUse(template.code)}
                  >
                    Use
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Last Execution Result */}
        {lastResult && (
          <Card className={`p-4 ${lastResult.type === 'success' ? 'bg-green-50/50 border-green-200' : 'bg-red-50/50 border-red-200'}`}>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              {lastResult.type === 'success' ? (
                <>
                  <Sparkles className="h-4 w-4 text-green-600" />
                  <span className="text-green-800">Last Execution Result</span>
                </>
              ) : (
                <>
                  <X className="h-4 w-4 text-red-600" />
                  <span className="text-red-800">Execution Error</span>
                </>
              )}
            </h4>
            <div className={`p-3 rounded ${lastResult.type === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
              <pre className={`text-xs whitespace-pre-wrap ${lastResult.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                {lastResult.message}
              </pre>
            </div>
          </Card>
        )}

        {/* Execution Logs */}
        {executionLog.length > 0 && (
          <Card className="p-4 bg-gray-50/50 border-gray-200">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Info className="h-4 w-4 text-gray-600" />
              <span className="text-gray-800">Execution Log</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onClearLog}
                className="ml-auto h-6 px-2 text-xs"
              >
                Clear
              </Button>
            </h4>
            <div className="bg-gray-100 p-3 rounded max-h-40 overflow-y-auto">
              {executionLog.map((log, index) => (
                <div key={index} className="text-xs text-gray-700 mb-1 font-mono">
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
              <Sparkles className="h-4 w-4" />
              Preview with First Row Data
            </h4>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Code with actual data from the first row:</p>
                <code className="text-xs bg-background px-2 py-1 rounded block overflow-x-auto mt-1">
                  {code.replace(/\{([^}]+)\}/g, (match, columnName) => {
                    const value = firstRow[columnName.trim()];
                    return value || `[${columnName.trim()} not found]`;
                  })}
                </code>
              </div>
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
              <div className="p-3 bg-green-50 border border-green-200 rounded">
                <p className="text-xs text-green-700">
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
