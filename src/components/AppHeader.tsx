import { Zap, Github, Download, Trash2, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDataStore } from '@/stores/useDataStore';
import { AIConfiguration } from '@/components/AIConfiguration';
import { TablesManager } from '@/components/TablesManager';
import { toast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';

export const AppHeader = () => {
  const { headers, rows, clearData } = useDataStore();
  const [showPromo, setShowPromo] = useState(false);
  
  // Show promo occasionally (30% chance when component mounts)
  useEffect(() => {
    const shouldShow = Math.random() < 0.3;
    const hasSeenRecently = localStorage.getItem('brospect-promo-dismissed');
    const oneDayInMs = 24 * 60 * 60 * 1000;
    
    if (shouldShow && (!hasSeenRecently || Date.now() - parseInt(hasSeenRecently) > oneDayInMs)) {
      setShowPromo(true);
    }
  }, []);

  const dismissPromo = () => {
    setShowPromo(false);
    localStorage.setItem('brospect-promo-dismissed', Date.now().toString());
  };
  
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
    <>
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
      
      {showPromo && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 dark:from-blue-950/20 dark:to-indigo-950/20 dark:border-blue-800">
          <div className="container mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Need more Meetings?
                  </span>
                </div>
                <div className="hidden sm:block text-sm text-blue-700 dark:text-blue-200">
                  Flood your calendar on autopilot with LinkedIn video outreach that's impossible to ignore
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="bg-white/80 hover:bg-white border-blue-300 text-blue-700 hover:text-blue-800 text-xs"
                >
                  <a href="https://try.brospect.xyz" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Try Brospect
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={dismissPromo}
                  className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};