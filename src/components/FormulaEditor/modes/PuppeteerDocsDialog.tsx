import { Binocular, OpenBook } from 'iconoir-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface PuppeteerDocsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PuppeteerDocsDialog = ({ open, onOpenChange }: PuppeteerDocsDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <OpenBook className="h-4 w-4 mr-2" />
          Documentation
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Puppeteer Mode Documentation</DialogTitle>
          <DialogDescription>
            Learn how to use Puppeteer browser automation in your formulas
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* System Status */}
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Binocular className="h-4 w-4" />
              System Status
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                <span>Server: localhost:3000</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>Queue: Ready</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>Browser Pool: Active</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>Stealth Mode: Enabled</span>
              </div>
            </div>
          </div>

          {/* Quick Start */}
          <div className="bg-muted/50 p-4 rounded-lg border border-border">
            <h4 className="font-semibold mb-2 flex items-center gap-1">💡 Quick Start</h4>
            <p className="text-sm text-muted-foreground mb-2">Try this ultra simple test:</p>
            <code className="text-xs bg-muted px-2 py-1 rounded block font-mono">
              await page.goto('https://example.com');<br />
              return await page.title();
            </code>
            <p className="text-xs text-muted-foreground mt-2">Should return: "Example Domain"</p>
          </div>

          {/* Accessing Data */}
          <div className="bg-muted/50 p-4 rounded-lg border border-border">
            <h4 className="font-semibold mb-2 flex items-center gap-1">✅ Accessing Column Data</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Use the <code className="bg-muted px-1 rounded font-mono">rowData</code> object to access your column values:
            </p>
            <code className="text-xs bg-muted px-2 py-1 rounded block font-mono">
              const url = rowData.URL;<br />
              const name = rowData['Column Name'];
            </code>
          </div>

          {/* Important Notes */}
          <div className="bg-muted/50 p-4 rounded-lg border border-border">
            <h4 className="font-semibold mb-2 flex items-center gap-1">⚠️ Important Notes</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Always use <code className="bg-muted px-1 rounded">rowData.ColumnName</code>, NOT <code className="bg-muted px-1 rounded">{'{ColumnName}'}</code></li>
              <li>For columns with spaces: <code className="bg-muted px-1 rounded">rowData['Column Name']</code></li>
              <li>JavaScript object literals like <code className="bg-muted px-1 rounded">{'{ timeout: 15000 }'}</code> work perfectly</li>
            </ul>
          </div>

          {/* Debug Tips */}
          <div className="bg-muted/50 p-4 rounded-lg border border-border">
            <h4 className="font-semibold mb-2 flex items-center gap-1">🔍 Debug Tips</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Open browser console (F12) for detailed logs</li>
              <li>Check execution logs below the code editor</li>
              <li>CORS is configured for localhost:8080 → localhost:3000</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
