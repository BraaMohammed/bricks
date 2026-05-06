import { Code2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface CodeDocsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CodeDocsDialog = ({ open, onOpenChange }: CodeDocsDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <BookOpen className="h-4 w-4 mr-2" />
          Documentation
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Code Mode Documentation</DialogTitle>
          <DialogDescription>
            Learn how to use custom JavaScript to process your data
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Quick Start */}
          <div className="bg-muted/50 p-4 rounded-lg border border-border">
            <h4 className="font-semibold mb-2 flex items-center gap-1">
              <Code2 className="h-4 w-4 text-primary" />
              Quick Start
            </h4>
            <p className="text-sm text-muted-foreground mb-2">
              Write an async JavaScript function body that returns a value for the cell. Try this simple test:
            </p>
            <code className="text-xs bg-muted px-2 py-2 rounded block font-mono">
              return "Hello World";
            </code>
            <p className="text-xs text-muted-foreground mt-2">
              Should return: "Hello World" in every cell of this column.
            </p>
          </div>

          {/* Accessing Data */}
          <div className="bg-muted/50 p-4 rounded-lg border border-border">
            <h4 className="font-semibold mb-2 flex items-center gap-1">✅ Accessing Column Data</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Use the <code className="bg-muted px-1 rounded font-mono">row</code> object to access values from other columns in the same row:
            </p>
            <code className="text-xs bg-muted px-2 py-2 rounded block font-mono">
              // For simple column names<br />
              const firstName = row.FirstName;<br /><br />
              // For column names with spaces<br />
              const fullName = row['First Name'] + ' ' + row['Last Name'];<br /><br />
              return fullName;
            </code>
          </div>

          {/* Conditional Logic */}
          <div className="bg-muted/50 p-4 rounded-lg border border-border">
            <h4 className="font-semibold mb-2 flex items-center gap-1">🔀 Conditional Logic</h4>
            <p className="text-sm text-muted-foreground mb-2">
              You can use standard JavaScript if statements and logic:
            </p>
            <code className="text-xs bg-muted px-2 py-2 rounded block font-mono">
              if (!row['Email']) {'{'}<br />
              &nbsp;&nbsp;return 'No Email Provided';<br />
              {'}'}<br />
              return row['Email'].toLowerCase();
            </code>
          </div>
          {/* Advanced: Async/Await & APIs */}
          <div className="bg-muted/50 p-4 rounded-lg border border-border">
            <h4 className="font-semibold mb-2 flex items-center gap-1">🌐 Advanced: Async/Await & External APIs</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Because your code runs inside an <code className="bg-muted px-1 rounded">async</code> block, you can use top-level <code className="bg-muted px-1 rounded">await</code> directly. 
              <br/><br/>
              <strong>Common Pitfall:</strong> If you define your own <code className="bg-muted px-1 rounded">async function</code> inside the code, make sure you actually <code className="bg-muted px-1 rounded">await</code> its result before returning or using <code className="bg-muted px-1 rounded">JSON.stringify()</code>, otherwise you'll return an empty object or a Promise!
            </p>
            <code className="text-xs bg-muted px-2 py-2 rounded block font-mono whitespace-pre overflow-x-auto">
{`// Example: Fetching user data from an API
const username = row['Username']?.trim();
if (!username) return "No username";

// Define a helper async function
async function fetchUser(user) {
  const res = await fetch(\`https://api.github.com/users/\${user}\`);
  if (!res.ok) throw new Error("API failed");
  return await res.json();
}

try {
  // ⚠️ CRITICAL: You must await your async function!
  const data = await fetchUser(username);
  
  // Now we can safely stringify the actual data, not a Promise
  return JSON.stringify({
    name: data.name,
    company: data.company
  }, null, 2);
} catch (error) {
  return "Error: " + error.message;
}`}
            </code>
          </div>

          {/* Important Notes */}
          <div className="bg-muted/50 p-4 rounded-lg border border-border">
            <h4 className="font-semibold mb-2 flex items-center gap-1">⚠️ Important Notes</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Always use <code className="bg-muted px-1 rounded">row['Column Name']</code>, NOT <code className="bg-muted px-1 rounded">{'{ColumnName}'}</code></li>
              <li>Your code is wrapped in an <code className="bg-muted px-1 rounded">async () =&gt; {'{ ... }'}</code> block</li>
              <li>You must explicitly <code className="bg-muted px-1 rounded">return</code> a value to populate the cell</li>
              <li>You can use <code className="bg-muted px-1 rounded">await</code> if you need to call external APIs</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
