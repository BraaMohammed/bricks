import { useState } from 'react';
import {
  IconoirProvider,
  Database,
  Download,
  Trash,
  Plus,
  Play,
  Settings,
  Eye,
  Upload,
  SunLight,
  Github,
  Cpu,
  Check,
  Refresh,
  NavArrowDown,
  Terminal,
  Server,
  Flash,
  ShieldCheck,
} from 'iconoir-react';

/* ------------------------------------------------------------------ */
/* Mock data                                                           */
/* ------------------------------------------------------------------ */

type Column = {
  name: string;
  formula?: string;
  executing?: boolean;
  sorted?: boolean;
  mono?: boolean;
  width?: string;
};

const columns: Column[] = [
  { name: 'NAME', width: 'max-w-[190px]' },
  { name: 'COMPANY', width: 'max-w-[180px]' },
  { name: 'ROLE', width: 'max-w-[180px]' },
  { name: 'EMAIL', formula: 'findEmail', executing: true, mono: true, width: 'max-w-[250px]' },
  { name: 'FUNDING', formula: 'webSearch', mono: true, width: 'max-w-[190px]' },
  { name: 'ICEBREAKER', formula: 'dualAgent', width: 'max-w-[360px]' },
];

const rows = [
  ['Sarah Chen', 'Meridian Labs', 'VP Engineering', 's.chen@meridianlabs.io', 'SERIES B · $42M', 'Congrats on the Series B — scaling eng post-raise is exactly when tooling budgets open up…'],
  ['Marcus Webb', 'Fieldstone AI', 'Head of Sales', 'marcus@fieldstone.ai', 'SEED · $8.5M', 'Saw Fieldstone is hiring 3 AEs — usually means outbound needs to 2x yesterday…'],
  ['Priya Nair', 'Cobalt Systems', 'CTO', 'priya.nair@cobaltsys.com', 'SERIES A · $18M', 'Your talk on local-first infra at Config was the reason I reached out…'],
  ['Tom Okafor', 'Brightline', 'Growth Lead', '', '—', ''],
  ['Elena Ruiz', 'Northbeam Co', 'Ops Director', 'elena@northbeam.co', 'BOOTSTRAPPED', 'Northbeam staying lean while competitors burn — respect. Curious how you…'],
  ['David Kim', 'Alloy Works', 'Founder', 'david@alloyworks.io', 'PRE-SEED · $1.2M', 'Solo founder shipping v2 in 6 months is no joke — the changelog is wild…'],
  ['Ana Sousa', 'Vantage Grid', 'Product Lead', 'ana.sousa@vantagegrid.com', 'SERIES A · $15M', 'The grid-monitoring launch got picked up by 3 newsletters last week…'],
  ['James Park', 'Holloway AI', 'ML Lead', 'jpark@holloway.ai', 'SERIES C · $110M', 'Your team\'s eval harness writeup is the best thing I\'ve read this quarter…'],
];

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

const HeaderButton = ({
  icon: Icon,
  label,
  solid = false,
  danger = false,
}: {
  icon: React.ElementType;
  label?: string;
  solid?: boolean;
  danger?: boolean;
}) => (
  <button
    className={`
      group/btn flex h-9 items-center gap-2 rounded-md border px-3 font-mono text-[10px] uppercase tracking-[0.14em]
      transition-all duration-200
      ${solid
        ? 'border-primary bg-primary text-primary-foreground hover:bg-primary-glow hover:border-primary-glow'
        : 'border-border bg-transparent text-muted-foreground hover:border-primary/60 hover:text-foreground'}
      ${danger ? 'hover:!border-destructive hover:!text-destructive' : ''}
    `}
  >
    <Icon className="text-[15px]" />
    {label && <span className="hidden lg:inline">{label}</span>}
  </button>
);

const StatusChip = ({ label, live = false }: { label: string; live?: boolean }) => (
  <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
    <span
      className={`inline-block h-1.5 w-1.5 rounded-full ${live ? 'bg-primary brick-pulse-dot' : 'bg-muted-foreground/50'}`}
    />
    {label}
  </span>
);

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const DesignPreview = () => {
  const [view, setView] = useState<'data' | 'empty'>('data');

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <IconoirProvider iconProps={{ width: '1em', height: '1em', strokeWidth: 1.5 }}>
        <div className="brick-noise" />

        {/* ===== Top utility strip ===== */}
        <div className="flex h-8 items-center justify-between border-b border-border px-4 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="text-primary">BRICKS</span>
            <span className="hidden sm:inline">LOCAL BUILD 0.9.2</span>
          </div>

          {/* preview view toggle */}
          <div className="flex items-center rounded-md border border-border p-0.5">
            {(['data', 'empty'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded px-3 py-0.5 uppercase tracking-[0.14em] transition-colors ${
                  view === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          <div className="hidden items-center gap-4 md:flex">
            <StatusChip label="API :3000" live />
            <StatusChip label="Ollama" live />
            <StatusChip label="Cloud: off" />
          </div>
        </div>

        {/* ===== Header ===== */}
        <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <img src="/logo-1.png" alt="Bricks logo" className="h-8 w-8 shrink-0 object-contain" />
                <span className="font-display text-2xl font-black uppercase tracking-tight text-foreground">
                  BRICKS
                </span>
                <span className="ml-2 hidden border-l border-border pl-3 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground sm:inline-block">
                  Clay alternative · zero credits
                </span>
              </div>

              {view === 'data' && (
                <div className="ml-6 hidden items-center gap-2 md:flex">
                  <span className="rounded-md border border-border px-2 py-1 font-mono text-[10px] tracking-[0.14em] text-muted-foreground">
                    247 ROWS
                  </span>
                  <span className="rounded-md border border-border px-2 py-1 font-mono text-[10px] tracking-[0.14em] text-muted-foreground">
                    6 COLS
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <HeaderButton icon={Database} label="Tables" />
              <HeaderButton icon={Cpu} label="AI Config" />
              {view === 'data' && (
                <>
                  <HeaderButton icon={Download} label="Export" solid />
                  <HeaderButton icon={Trash} danger />
                </>
              )}
              <HeaderButton icon={SunLight} />
              <HeaderButton icon={Github} />
            </div>
          </div>
        </header>

        {/* ===== Main ===== */}
        <main className="relative">
          <div className="brick-grid-bg pointer-events-none absolute inset-0" />

          <div className="relative mx-auto max-w-[1440px] px-6 pb-24">
            {view === 'empty' ? <EmptyView /> : <DataView />}
          </div>
        </main>

        {/* ===== Bottom status bar ===== */}
        <footer className="fixed bottom-0 left-0 right-0 z-40 flex h-8 items-center justify-between border-t border-border bg-background/90 px-4 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground backdrop-blur-md">
          <div className="flex items-center gap-5">
            <StatusChip label="Local mode" live />
            <span className="hidden sm:inline">Search stack: 6 providers</span>
            <span className="hidden md:inline">Puppeteer pool: idle</span>
          </div>
          <div className="flex items-center gap-5">
            <span>
              Credits used: <span className="text-primary">$0.00</span>
            </span>
            <span className="hidden sm:inline">Your keys · your machine</span>
            <span className="brick-blink text-primary">▮</span>
          </div>
        </footer>
      </IconoirProvider>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Empty state / hero                                                  */
/* ------------------------------------------------------------------ */

const EmptyView = () => (
  <div className="pt-20">
    <p
      className="brick-animate-in font-mono text-[11px] uppercase tracking-[0.24em] text-primary"
      style={{ animationDelay: '40ms' }}
    >
      {'// data enrichment — no cloud required'}
    </p>

    <h1
      className="brick-animate-in mt-6 font-display text-[clamp(3rem,7.5vw,6rem)] font-black uppercase leading-[0.92] tracking-tight"
      style={{ animationDelay: '120ms' }}
    >
      Enrich data on
      <br />
      <span className="text-primary">your own</span> machine.
    </h1>

    <p
      className="brick-animate-in mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground"
      style={{ animationDelay: '200ms' }}
    >
      No subscriptions. No credit systems. No lead lists leaving your computer.
      Web scraping, AI agents and outreach — powered by your own keys, or free local models.
    </p>

    {/* Dropzone */}
    <div
      className="brick-animate-in group relative mt-14 cursor-pointer rounded-xl border border-dashed border-border bg-card/60 p-12 text-center transition-all duration-300 hover:border-primary/70 hover:bg-primary/[0.04]"
      style={{ animationDelay: '280ms' }}
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary transition-transform duration-300 group-hover:-translate-y-1">
        <Upload className="text-[24px]" />
      </div>
      <h3 className="mt-6 font-display text-xl font-bold uppercase tracking-tight">
        Drop your CSV
      </h3>
      <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        or click to browse — parsed locally, never uploaded
      </p>
      <div className="mt-8 flex items-center justify-center gap-3">
        <button className="h-10 rounded-md border border-primary bg-primary px-6 font-mono text-[10px] uppercase tracking-[0.16em] text-primary-foreground transition-colors hover:bg-primary-glow hover:border-primary-glow">
          Browse files
        </button>
        <button className="h-10 rounded-md border border-border px-6 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground">
          Load sample data
        </button>
      </div>
    </div>

    {/* Steps */}
    <div className="mt-16 grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3">
      {[
        { n: '01', icon: Database, title: 'Upload CSV', desc: 'Drag in your lead list. Headers become programmable columns instantly.' },
        { n: '02', icon: Terminal, title: 'Program columns', desc: 'JavaScript, AI prompts, search agents or the email finder — per column.' },
        { n: '03', icon: Flash, title: 'Execute & export', desc: 'Watch cells fill in real time. Export when the grid is solid.' },
      ].map((step, i) => (
        <div
          key={step.n}
          className="brick-animate-in group relative bg-card p-7 transition-colors duration-300 hover:bg-accent/50"
          style={{ animationDelay: `${360 + i * 90}ms` }}
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
);

/* ------------------------------------------------------------------ */
/* Data table state                                                    */
/* ------------------------------------------------------------------ */

const DataView = () => (
  <div className="pt-10">
    {/* Section heading */}
    <div className="brick-animate-in flex items-end justify-between" style={{ animationDelay: '40ms' }}>
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-primary">{'// table 01'}</p>
        <h2 className="mt-2 font-display text-3xl font-black uppercase tracking-tight">
          Leads_Q3.csv
          <span className="ml-3 align-middle font-mono text-[11px] font-normal tracking-[0.14em] text-muted-foreground">
            247 ROWS × 6 COLUMNS
          </span>
        </h2>
      </div>
      <button className="hidden items-center gap-2 rounded-md border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground sm:flex">
        <Server className="text-[14px]" />
        Execution log
      </button>
    </div>

    {/* Table panel */}
    <div
      className="brick-animate-in relative mt-6 overflow-hidden rounded-xl border border-border bg-card"
      style={{ animationDelay: '140ms' }}
    >
      {/* Toolbar */}
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Enriching: <span className="text-primary">email</span>
          </span>
          <div className="hidden w-52 sm:block">
            <div className="h-1.5 w-full rounded-full bg-muted">
              <div className="brick-progress-fill h-full rounded-full" style={{ width: '14%' }} />
            </div>
          </div>
          <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground">34/247</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex h-8 items-center gap-2 rounded-md border border-border px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground">
            <Upload className="text-[13px]" />
            <span className="hidden sm:inline">Upload</span>
          </button>
          <button className="flex h-8 items-center gap-2 rounded-md border border-primary bg-primary px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-primary-foreground transition-colors hover:bg-primary-glow">
            <Plus className="text-[13px]" />
            <span className="hidden sm:inline">Add column</span>
          </button>
        </div>
      </div>

      {/* Formula strip */}
      <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap border-b border-border/60 bg-muted/20 px-4 py-2 font-mono text-[11px] text-muted-foreground">
        <span className="rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[9px] tracking-[0.1em] text-primary">f(x) EMAIL</span>
        <span>pattern(name, company)</span>
        <span className="text-primary">→</span>
        <span>hunter.verify</span>
        <span className="text-primary">→</span>
        <span>millionverifier</span>
        <span className="text-primary">→</span>
        <span className="text-foreground">deliverable only</span>
        <span className="brick-blink ml-1 text-primary">▮</span>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="w-12 border-r border-border/60 px-3 py-3 text-left font-mono text-[10px] font-medium tracking-[0.14em] text-muted-foreground/60">
                #
              </th>
              {columns.map((col) => (
                <th
                  key={col.name}
                  className="group relative border-r border-border/60 px-5 py-3 text-left last:border-r-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      {col.name}
                    </span>
                    {col.sorted && <NavArrowDown className="text-[12px] text-primary" />}
                    {col.formula && (
                      <span className="rounded border border-primary/40 bg-primary/10 px-1 py-px font-mono text-[9px] text-primary">
                        f(x)
                      </span>
                    )}

                    <span className="ml-auto flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                      {col.executing ? (
                        <Refresh className="animate-spin text-[12px] text-primary" />
                      ) : (
                        col.formula && (
                          <button className="text-muted-foreground transition-colors hover:text-primary">
                            <Play className="text-[12px]" />
                          </button>
                        )
                      )}
                      <button className="text-muted-foreground transition-colors hover:text-foreground">
                        <Settings className="text-[12px]" />
                      </button>
                    </span>
                  </div>
                  {col.executing && (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 brick-progress-fill" />
                  )}
                </th>
              ))}
              <th className="w-32 cursor-pointer px-4 py-3 text-left">
                <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60 transition-colors hover:text-primary">
                  <Plus className="text-[12px]" /> New col
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr
                key={ri}
                className="group border-b border-border/60 transition-colors last:border-b-0 hover:bg-accent/30"
              >
                <td className="border-r border-border/60 px-3 py-3 font-mono text-[10px] text-muted-foreground/50">
                  {String(ri + 1).padStart(3, '0')}
                </td>
                {row.map((cell, ci) => {
                  const col = columns[ci];
                  const isEmpty = !cell;
                  return (
                    <td key={ci} className="group/cell border-r border-border/60 px-5 py-3 last:border-r-0">
                      <div className="flex items-center justify-between gap-2">
                        {isEmpty && col.executing ? (
                          <span className="flex items-center gap-2 font-mono text-[11px] text-primary">
                            <Refresh className="animate-spin text-[12px]" />
                            probing…
                          </span>
                        ) : isEmpty ? (
                          <span className="font-mono text-[11px] text-muted-foreground/40">—</span>
                        ) : (
                          <span
                            className={`truncate ${col.width} ${
                              col.mono
                                ? 'font-mono text-[11px] tracking-wide text-foreground/90'
                                : 'text-sm'
                            } ${ci >= 4 ? 'text-muted-foreground' : ''}`}
                            title={cell}
                          >
                            {cell}
                          </span>
                        )}
                        {col.name === 'EMAIL' && cell && (
                          <Check className="shrink-0 text-[12px] text-success" />
                        )}
                        {!col.formula && (
                          <button className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/cell:opacity-100">
                            <Eye className="text-[12px]" />
                          </button>
                        )}
                      </div>
                    </td>
                  );
                })}
                <td className="px-4 py-3" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Table footer */}
      <div className="flex items-center justify-between border-t border-border px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        <span>
          Showing 008 / 247 — <span className="text-primary">3 columns programmed</span>
        </span>
        <span className="hidden items-center gap-2 sm:flex">
          <ShieldCheck className="text-[13px]" />
          0 bytes left this machine
        </span>
      </div>
    </div>

    {/* Under-table detail cards */}
    <div className="mt-6 grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3">
      {[
        { k: 'EMAIL FINDER', v: '2,847', s: 'verified this month · $0 spend' },
        { k: 'AGENT RUNS', v: '1,203', s: 'writer ⇄ prospect loops closed' },
        { k: 'CLOUD CALLS', v: '0', s: 'everything executed locally' },
      ].map((stat, i) => (
        <div
          key={stat.k}
          className="brick-animate-in bg-card p-5"
          style={{ animationDelay: `${260 + i * 80}ms` }}
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{stat.k}</div>
          <div className="mt-2 font-display text-3xl font-black tracking-tight text-foreground">
            {stat.v}
          </div>
          <div className="mt-1 font-mono text-[10px] tracking-[0.1em] text-primary/80">{stat.s}</div>
        </div>
      ))}
    </div>
  </div>
);

export default DesignPreview;
