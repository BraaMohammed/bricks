import { Flash, Github, Download, Trash, Xmark, ArrowUpRight, Cube } from 'iconoir-react';
import { Button } from '@/components/ui/button';
import { useDataStore } from '@/stores/useDataStore';
import { AIConfiguration } from '@/components/AIConfiguration';
import { TablesManager } from '@/components/TablesManager';
import { ThemeToggle } from '@/components/ThemeToggle';
import { toast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

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

    const csvContent = [
      headers.join(','),
      ...rows.map(row =>
        headers.map(header => {
          const value = row[header] || '';
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'bricks-export.csv');
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
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[0_0_24px_hsl(var(--primary)/0.35)]">
                  <Cube className="text-[20px]" strokeWidth={1.8} />
                </div>
                <div className="leading-none">
                  <div className="font-display text-xl font-black uppercase tracking-tight">Bricks</div>
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                    Clay alternative · zero credits
                  </p>
                </div>
              </Link>

              {headers.length > 0 && (
                <div className="ml-6 hidden items-center gap-2 md:flex">
                  <span className="rounded-md border border-border px-2 py-1 font-mono text-[10px] tracking-[0.14em] text-muted-foreground">
                    {rows.length} ROWS
                  </span>
                  <span className="rounded-md border border-border px-2 py-1 font-mono text-[10px] tracking-[0.14em] text-muted-foreground">
                    {headers.length} COLS
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <TablesManager />
              <AIConfiguration />
              {headers.length > 0 && (
                <>
                  <Button
                    size="sm"
                    onClick={exportCSV}
                    className="hidden h-9 gap-2 rounded-md border border-primary bg-primary font-mono text-[10px] uppercase tracking-[0.14em] text-primary-foreground hover:bg-primary-glow hover:border-primary-glow sm:flex"
                  >
                    <Download className="text-[14px]" />
                    Export
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearData}
                    className="h-9 gap-2 rounded-md border-border font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:border-destructive hover:bg-transparent hover:text-destructive"
                  >
                    <Trash className="text-[14px]" />
                    <span className="hidden sm:inline">Clear</span>
                  </Button>
                </>
              )}
              <a
                href="https://github.com/BraaMohammed/bricks"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
                aria-label="GitHub repository"
              >
                <Github className="text-[15px]" />
              </a>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {showPromo && (
        <div className="border-b border-primary/20 bg-primary/[0.06]">
          <div className="mx-auto px-6 py-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Flash className="text-[14px] text-primary" />
                  <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-foreground">
                    Need more meetings?
                  </span>
                </div>
                <div className="hidden text-sm text-muted-foreground sm:block">
                  Flood your calendar on autopilot with LinkedIn video outreach that is impossible to ignore
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  asChild
                  className="h-7 gap-1.5 rounded-md border border-primary bg-primary font-mono text-[10px] uppercase tracking-[0.12em] text-primary-foreground hover:bg-primary-glow"
                >
                  <a href="https://try.brospect.xyz" target="_blank" rel="noopener noreferrer">
                    <ArrowUpRight className="text-[12px]" />
                    Try Brospect
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={dismissPromo}
                  className="h-7 w-7 p-0 text-muted-foreground hover:bg-primary/10 hover:text-foreground"
                >
                  <Xmark className="text-[13px]" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
