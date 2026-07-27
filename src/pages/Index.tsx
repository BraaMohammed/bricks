import { useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { CSVUploader } from '@/components/CSVUploader';
import { DataTable } from '@/components/DataTable';
import { FormulaEditor } from '@/components/FormulaEditor';
import { useDataStore } from '@/stores/useDataStore';
import { IconoirProvider, Database, Terminal, Flash } from 'iconoir-react';

const steps = [
  { n: '01', icon: Database, title: 'Upload CSV', desc: 'Drag in your lead list. Headers become programmable columns instantly.' },
  { n: '02', icon: Terminal, title: 'Program columns', desc: 'JavaScript, AI prompts, search agents or the email finder — per column.' },
  { n: '03', icon: Flash, title: 'Execute & export', desc: 'Watch cells fill in real time. Export when the grid is solid.' },
];

const Index = () => {
  const { headers, setActiveColumn, activeColumn } = useDataStore();
  const [formulaEditorOpen, setFormulaEditorOpen] = useState(false);

  const handleEditFormula = (column: string) => {
    setActiveColumn(column);
    setFormulaEditorOpen(true);
  };

  const handleFormulaEditorClose = (open: boolean) => {
    setFormulaEditorOpen(open);
    if (!open) {
      setActiveColumn(null);
    }
  };

  return (
    <IconoirProvider iconProps={{ width: '1em', height: '1em', strokeWidth: 1.5 }}>
      <div className="min-h-screen bg-background text-foreground">
        <div className="brick-noise" />
        <AppHeader />

        <main className="relative">
          <div className="brick-grid-bg pointer-events-none absolute inset-0" />

          <div className="relative mx-auto max-w-[1600px] px-6 pb-16">
            {headers.length === 0 ? (
              /* ================= Empty state ================= */
              <div className="mx-auto max-w-4xl pt-20">
                <p
                  className="brick-animate-in text-center font-mono text-[11px] uppercase tracking-[0.24em] text-primary"
                  style={{ animationDelay: '40ms' }}
                >
                  {'// data enrichment — no cloud required'}
                </p>

                <h1
                  className="brick-animate-in mt-6 text-center font-display text-[clamp(2.75rem,6vw,5rem)] font-black uppercase leading-[0.92] tracking-tight"
                  style={{ animationDelay: '120ms' }}
                >
                  Enrich data on
                  <br />
                  <span className="text-primary">your own</span> machine.
                </h1>

                <p
                  className="brick-animate-in mx-auto mt-6 max-w-xl text-center text-lg leading-relaxed text-muted-foreground"
                  style={{ animationDelay: '200ms' }}
                >
                  Upload a CSV and use formulas, AI agents and web research
                  to enrich, transform, and enhance your data.
                </p>

                <div className="brick-animate-in mt-12" style={{ animationDelay: '280ms' }}>
                  <CSVUploader />
                </div>

                {/* Steps */}
                <div
                  className="brick-animate-in mt-14 grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3"
                  style={{ animationDelay: '360ms' }}
                >
                  {steps.map((step) => (
                    <div
                      key={step.n}
                      className="group relative bg-card p-7 transition-colors duration-300 hover:bg-accent/50"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm text-primary/80">{step.n}</span>
                        <step.icon className="text-[18px] text-muted-foreground transition-colors group-hover:text-primary" />
                      </div>
                      <h4 className="mt-5 font-display text-base font-bold uppercase tracking-tight">
                        {step.title}
                      </h4>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
                      <span className="absolute bottom-0 left-0 h-0.5 w-0 bg-primary transition-all duration-300 group-hover:w-full" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* ================= Data state ================= */
              <div className="pt-8">
                <div className="brick-animate-in flex items-end justify-between" style={{ animationDelay: '40ms' }}>
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-primary">{'// data overview'}</p>
                    <h2 className="mt-2 font-display text-3xl font-black uppercase tracking-tight">
                      Your grid
                      <span className="ml-3 align-middle font-mono text-[11px] font-normal tracking-[0.14em] text-muted-foreground">
                        Click a column's settings icon to program it, then run it
                      </span>
                    </h2>
                  </div>
                </div>

                <div className="brick-animate-in mt-6" style={{ animationDelay: '140ms' }}>
                  <DataTable onEditFormula={handleEditFormula} />
                </div>
              </div>
            )}
          </div>
        </main>

        <FormulaEditor
          open={formulaEditorOpen}
          onOpenChange={handleFormulaEditorClose}
        />
      </div>
    </IconoirProvider>
  );
};

export default Index;
