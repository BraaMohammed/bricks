import { CodeBrackets } from 'iconoir-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface PuppeteerTemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplateUse: (code: string) => void;
}

export const CODE_TEMPLATES = [
  {
    name: 'Get Page Title (Ultra Simple Test)',
    description: 'Test with example.com - should return "Example Domain"',
    code: 'await page.goto(\'https://example.com\');\nreturn await page.title();'
  },
  {
    name: 'Extract Text Content',
    description: 'Extract text from specific elements',
    code: 'const url = rowData.URL;\nawait page.goto(url);\nconst opts = { timeout: 10000 };\nawait page.waitForSelector(\'h1\', opts);\nreturn await page.$eval(\'h1\', el => el.textContent);'
  },
  {
    name: 'Take Screenshot',
    description: 'Capture page screenshot as base64',
    code: 'const url = rowData.URL;\nawait page.goto(url);\nconst viewport = { width: 1200, height: 800 };\nawait page.setViewport(viewport);\nconst opts = { encoding: \'base64\' };\nconst screenshot = await page.screenshot(opts);\nreturn `data:image/png;base64,${screenshot}`;'
  },
  {
    name: 'Get All Links',
    description: 'Extract all links from a page',
    code: 'const url = rowData.URL;\nawait page.goto(url);\nconst links = await page.$$eval(\'a\', anchors => \n  anchors.map(a => (anchors.map(a => { return { text: a.textContent, href: a.href }; })).filter(link => link.href)\n);\nreturn JSON.stringify(links, null, 2);'
  },
  {
    name: 'Form Interaction',
    description: 'Fill and submit forms',
    code: 'const url = rowData.URL;\nconst searchTerm = rowData.SearchTerm;\nawait page.goto(url);\nconst opts = { timeout: 5000 };\nawait page.waitForSelector(\'#search\', opts);\nawait page.type(\'#search\', searchTerm);\nawait page.click(\'#submit\');\nawait page.waitForNavigation();\nreturn await page.url();'
  },
  {
    name: 'Wait for Element',
    description: 'Wait for dynamic content to load',
    code: 'const url = rowData.URL;\nawait page.goto(url);\n// Wait for dynamic content\nconst opts = { timeout: 15000 };\nawait page.waitForSelector(\'.dynamic-content\', opts);\nconst content = await page.$eval(\'.dynamic-content\', el => el.textContent);\nreturn content;'
  }
];

export const PuppeteerTemplatesDialog = ({ 
  open, 
  onOpenChange, 
  onTemplateUse 
}: PuppeteerTemplatesDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CodeBrackets className="h-4 w-4 mr-2" />
          Templates
        </Button>
      </DialogTrigger>
      <DialogContent className=" min-w-fit max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Code Templates</DialogTitle>
          <DialogDescription>
            Ready-to-use Puppeteer code snippets for common tasks
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-4">
          {CODE_TEMPLATES.map((template, index) => (
            <Card key={index} className="p-4 hover:bg-muted/50 transition-colors">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{template.name}</p>
                      <Badge variant="secondary" className="text-xs">
                        {template.description}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onTemplateUse(template.code)}
                  >
                    Use Template
                  </Button>
                </div>
                <code className="text-xs text-muted-foreground bg-muted px-3 py-2 rounded block overflow-x-auto font-mono whitespace-pre">
                  {template.code}
                </code>
              </div>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
