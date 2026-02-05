import { Wand2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FormulaPreview } from '@/components/FormulaEditor/FormulaPreview';
import { ColumnBadges } from '@/components/FormulaEditor/ColumnBadges';

interface FirecrawlModeEditorProps {
  headers: string[];
  firstRow: Record<string, string> | null;
  url: string;
  onUrlChange: (url: string) => void;
  onInputChange: () => void;
}

export const FirecrawlModeEditor = ({
  headers,
  firstRow,
  url,
  onUrlChange,
  onInputChange
}: FirecrawlModeEditorProps) => {
  const handleColumnClick = (columnName: string) => {
    const insertion = `{${columnName}}`;
    const newUrl = url + insertion;
    onUrlChange(newUrl);
    onInputChange();
  };

  return (
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
        {/* Available columns */}
        <ColumnBadges
          headers={headers}
          onColumnClick={handleColumnClick}
          helpText={`Click on a column to add it to your URL. Use column data to build dynamic URLs. Example: https://company.com/profile/{Company}`}
        />

        {/* URL Template Input */}
        <div>
          <Label htmlFor="firecrawl-url" className="text-base font-semibold mb-3 block">
            Website URL Template
          </Label>
          <Input
            id="firecrawl-url"
            type="text"
            placeholder="https://example.com/{Company}"
            value={url}
            onChange={(e) => {
              onUrlChange(e.target.value);
              onInputChange();
            }}
            className="w-full"
          />
        </div>

        {/* Preview with actual data */}
        {url && firstRow && (
          <FormulaPreview
            mode="firecrawl"
            content={url}
            firstRow={firstRow}
            additionalInfo="This shows how the URL will look for the first row in your data"
          />
        )}
      </CardContent>
    </Card>
  );
};
