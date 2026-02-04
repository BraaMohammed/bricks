/**
 * ModelSuggestionCard Component
 * 
 * Displays a grid of suggested Ollama models to install.
 * Shows model name, description, installation command, and size.
 */

export interface SuggestedModel {
  name: string;
  description: string;
  command: string;
  size: string;
}

export interface ModelSuggestionCardProps {
  models: SuggestedModel[];
}

export const ModelSuggestionCard = ({
  models,
}: ModelSuggestionCardProps) => {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        No models installed. Here are some popular models you can install:
      </p>
      <div className="grid gap-2">
        {models.map((suggestedModel) => (
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
  );
};
