import { Zap, Github, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDataStore } from '@/stores/useDataStore';
import { AIConfiguration } from '@/components/AIConfiguration';
import { TablesManager } from '@/components/TablesManager';
import { toast } from '@/hooks/use-toast';

export const AppHeader = () => {
  const { headers, rows, clearData } = useDataStore();
  
  const exportCSV = () => {
    if (headers.length === 0 || rows.length === 0) {
      toast({
        title: "No Data to Export",
        description: "Please load some data first.",
        variant: "destructive",
      });
      return;
    }

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        headers.map(header => {
          const value = row[header] || '';
          // Escape values that contain commas, quotes, or newlines
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'vibe-sheet-export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export Complete",
      description: "CSV file has been downloaded.",
    });
  };

  const handleClearData = () => {
    if (window.confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      clearData();
      toast({
        title: "Data Cleared",
        description: "All data and formulas have been cleared.",
      });
    }
  };

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center gap-2">
                <div className="p-2 rounded-lg text-primary">
                <img
                  src="/logo.png"
                  alt="Logo"
                  className="h-6 w-24"
                  style={{
                  filter: 'drop-shadow(0 0 12px #ffff) drop-shadow(0 0 16px #ffffff)',
                  }}
                />
                </div>
              <div>
                <p className="text-xs text-muted-foreground">Free Lite-Weight Clay Alternative</p>
              </div>
            </div>
            
            {headers.length > 0 && (
              <div className="flex items-center gap-2 ml-4">
                <Badge variant="secondary" className="text-xs">
                  {headers.length} columns
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {rows.length} rows
                </Badge>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <TablesManager />
            <AIConfiguration />
            {headers.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportCSV}
                  className="hidden sm:flex"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearData}
                  className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
                >
                  <Trash2 className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Clear</span>
                </Button>
              </>
            )}
         
          </div>
        </div>
      </div>
    </header>
  );
};