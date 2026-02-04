/**
 * CustomPromptSection Component
 * 
 * Provides a textarea input for setting a default custom AI prompt.
 * Used as a template when the user selects "Custom AI Prompt".
 */

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export interface CustomPromptSectionProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
}

export const CustomPromptSection = ({
  prompt,
  setPrompt,
}: CustomPromptSectionProps) => {
  return (
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
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
          />
          <p className="text-sm text-muted-foreground">
            This prompt will be used when you select the "Custom AI Prompt" template. 
            Column variables will be appended automatically.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
