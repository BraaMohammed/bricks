import { Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ColumnBadgesProps {
  headers: string[];
  onColumnClick: (columnName: string) => void;
  helpText?: string;
}

export const ColumnBadges = ({ headers, onColumnClick, helpText }: ColumnBadgesProps) => {
  return (
    <div>
      <h4 className="font-semibold mb-3 flex items-center gap-2">
        <Info className="h-4 w-4" />
        Available Columns
      </h4>
      <p className="text-sm text-muted-foreground mb-2">
        {helpText || 'Click on a column to insert it:'}
      </p>
      <div className="flex flex-wrap gap-1">
        {headers.map((header) => (
          <Badge 
            key={header} 
            variant="outline" 
            className="cursor-pointer hover:bg-muted"
            onClick={() => onColumnClick(header)}
          >
            {header}
          </Badge>
        ))}
      </div>
    </div>
  );
};
