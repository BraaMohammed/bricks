import { useState, useEffect, useRef } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Sparkles, MessageSquare, Brain, Zap } from 'lucide-react';
import { useDataStore } from '@/stores/useDataStore';

interface SlashMenuProps {
  isVisible: boolean;
  position: { top: number; left: number };
  onSelect: (template: string) => void;
  onClose: () => void;
  availableColumns: string[];
}

const AI_TEMPLATES = [
  {
    id: 'personalized-message',
    icon: MessageSquare,
    title: 'Personalized Message',
    description: 'Generate a personalized message',
    template: `// Generate personalized message
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('openai_api_key'),
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: localStorage.getItem('ai_model') || 'gpt-3.5-turbo',
    messages: [{
      role: 'user',
      content: \`Generate a personalized message for \${row["name"] || "the customer"}. Their info: \${row["leadInfo"] || row["info"] || "limited information available"}\`
    }],
    max_tokens: 150
  })
});
const data = await response.json();
return data.choices[0].message.content;`
  },
  {
    id: 'email-subject',
    icon: Sparkles,
    title: 'Email Subject Line',
    description: 'Generate compelling email subject',
    template: `// Generate email subject line
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('openai_api_key'),
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: localStorage.getItem('ai_model') || 'gpt-3.5-turbo',
    messages: [{
      role: 'user',
      content: \`Create an engaging email subject line for \${row["name"] || "the customer"}. Context: \${row["company"] || row["business"] || 'their business'}\`
    }],
    max_tokens: 50
  })
});
const data = await response.json();
return data.choices[0].message.content;`
  },
  {
    id: 'sentiment-analysis',
    icon: Brain,
    title: 'Sentiment Analysis',
    description: 'Analyze text sentiment',
    template: `// Analyze sentiment
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('openai_api_key'),
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: localStorage.getItem('ai_model') || 'gpt-3.5-turbo',
    messages: [{
      role: 'user',
      content: \`Analyze the sentiment of this text and return only: positive, negative, or neutral. Text: \${row["feedback"] || row["message"] || row["text"] || "No text provided"}\`
    }],
    max_tokens: 10
  })
});
const data = await response.json();
return data.choices[0].message.content.toLowerCase();`
  },
  {
    id: 'custom-prompt',
    icon: Zap,
    title: 'Custom AI Prompt',
    description: 'Custom prompt template',
    template: `// Custom AI prompt
const customPrompt = localStorage.getItem('custom_ai_prompt') || 'Analyze this data: ';
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('openai_api_key'),
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: localStorage.getItem('ai_model') || 'gpt-3.5-turbo',
    messages: [{
      role: 'user',
      content: customPrompt + \` \${Object.values(row).join(', ')}\`
    }],
    max_tokens: 100
  })
});
const data = await response.json();
return data.choices[0].message.content;`
  }
];

export const SlashMenu = ({ isVisible, position, onSelect, onClose, availableColumns }: SlashMenuProps) => {
  const [search, setSearch] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { rows } = useDataStore();

  // Get sample data from first row for preview
  const firstRow = rows.length > 0 ? rows[0] : {};

  // Generate preview message for selected template
  const generatePreview = (template: any) => {
    if (!template || !firstRow || Object.keys(firstRow).length === 0) {
      return "No data available for preview";
    }

    switch (template.id) {
      case 'personalized-message':
        return `Generate a personalized message for ${firstRow["name"] || firstRow[Object.keys(firstRow)[0]] || "John Doe"}. Their info: ${firstRow["leadInfo"] || firstRow["info"] || firstRow[Object.keys(firstRow)[1]] || "Software Engineer at TechCorp"}`;
      
      case 'email-subject':
        return `Create an engaging email subject line for ${firstRow["name"] || firstRow[Object.keys(firstRow)[0]] || "John Doe"}. Context: ${firstRow["company"] || firstRow["business"] || firstRow[Object.keys(firstRow)[1]] || "their business"}`;
      
      case 'sentiment-analysis':
        return `Analyze the sentiment of this text and return only: positive, negative, or neutral. Text: ${firstRow["feedback"] || firstRow["message"] || firstRow["text"] || firstRow[Object.keys(firstRow)[0]] || "Great product, really helpful!"}`;
      
      case 'custom-prompt':
        return `Analyze this data: ${Object.values(firstRow).slice(0, 3).join(', ')}`;
      
      default:
        return "Preview will show actual row data when available";
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isVisible, onClose]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const filteredTemplates = AI_TEMPLATES.filter(template =>
    template.title.toLowerCase().includes(search.toLowerCase()) ||
    template.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-96 bg-popover border border-border rounded-lg shadow-lg"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <Command className="bg-transparent">
        <div className="border-b border-border px-3 py-2">
          <input
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Search AI templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        <CommandList className="max-h-80">
          <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
            No templates found
          </CommandEmpty>
          <CommandGroup>
            {filteredTemplates.map((template) => {
              const Icon = template.icon;
              const isSelected = selectedTemplate === template.id;
              return (
                <CommandItem
                  key={template.id}
                  onSelect={() => {
                    if (isSelected) {
                      onSelect(template.template);
                      onClose();
                    } else {
                      setSelectedTemplate(template.id);
                    }
                  }}
                  className="flex flex-col items-start gap-2 p-3 cursor-pointer"
                >
                  <div className="flex items-start gap-3 w-full">
                    <Icon className="h-4 w-4 mt-0.5 text-primary" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{template.title}</div>
                      <div className="text-xs text-muted-foreground">{template.description}</div>
                    </div>
                  </div>
                  
                  {isSelected && (
                    <div className="w-full pl-7 space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">Preview with your data:</div>
                      <div className="text-xs bg-muted/50 p-2 rounded border italic">
                        {generatePreview(template)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Click again to insert template
                      </div>
                    </div>
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
};