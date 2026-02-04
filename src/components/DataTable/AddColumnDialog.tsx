import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface AddColumnDialogProps {
  open: boolean;
  columnName: string;
  onClose: () => void;
  onColumnNameChange: (name: string) => void;
  onAddColumn: () => void;
}

/**
 * AddColumnDialog component for adding new columns
 * Includes input field with validation and enter key submission
 */
export const AddColumnDialog = ({
  open,
  columnName,
  onClose,
  onColumnNameChange,
  onAddColumn,
}: AddColumnDialogProps) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onAddColumn();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Column</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Enter column name..."
            value={columnName}
            onChange={(e) => onColumnNameChange(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onAddColumn}>
              Add Column
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
