import { Link } from 'react-router-dom';
import { useTheme } from 'next-themes';
import {
  IconoirProvider,
  Cube,
  Search,
  Mail,
  Group,
  Binocular,
  Terminal,
  Server,
  Database,
  Flash,
  Github,
  ArrowRight,
  ArrowUpRight,
  Check,
  Xmark,
  Refresh,
  SunLight,
  HalfMoon,
  ShieldCheck,
  Key,
  Laptop,
  Plus,
} from 'iconoir-react';

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

const MonoLabel = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <span className={`font-mono text-[11px] uppercase tracking-[0.24em] text-primary ${className}`}>
    {children}
  </span>
);

const StatusChip = ({ label, live = false }: { label: string; live?: boolean }) => (
  <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
    <span className={`inline-block h-1.5 w-1.5 rounded-full ${live ? 'bg-primary brick-pulse-dot' : 'bg-muted-foreground/50'}`} />
    {label}
  </span>
);

const ThemeButton = () => {
  const { theme, setTheme } = useTheme();
  const isDark = theme !== 'light';
  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
      aria-label="Toggle theme"
    >
      {isDark ? <SunLight className="text-[15px]" /> : <HalfMoon className="text-[15px]" />}
    </button>
  );
};

/* ------------------------------------------------------------------ */
/* Nav                                                                 */
/* ------------------------------------------------------------------ */

const Nav = () => (
  <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
    <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[0_0_24px_hsl(var(--primary)/0.35)]">
          <Cube className="text-[20px]" strokeWidth={1.8} />
        </div>
        <div className="leading-none">
          <div className="font-display text-xl font-black uppercase tracking-tight">Bricks</div>
          <div className="mt-1 hidden font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground sm:block">
            Clay alternative · zero credits
          </div>
        </div>
      </div>

      <nav className="hidden items-center gap-7 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground md:flex">
        <a href="#features" className="transition-colors hover:text-foreground">Features</a>
        <a href="#how" className="transition-colors hover:text-foreground">How it works</a>
        <a href="#compare" className="transition-colors hover:text-foreground">Compare</a>
      </nav>

      <div className="flex items-center gap-2">
        <a
          href="https://github.com/BraaMohammed/bricks"
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-9 items-center gap-2 rounded-md border border-border px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
        >
          <Github className="text-[15px]" />
          <span className="hidden lg:inline">Star</span>
        </a>
        <ThemeButton />
        <Link
          to="/app"
          className="flex h-9 items-center gap-2 rounded-md border border-primary bg-primary px-4 font-mono text-[10px] uppercase tracking-[0.14em] text-primary-foreground transition-colors hover:bg-primary-glow hover:border-primary-glow"
        >
          Launch app
          <ArrowRight className="text-[13px]" />
        </Link>
      </div>
    </div>
  </header>
);

/* ------------------------------------------------------------------ */
/* Hero + mock table visual                                            */
/* ------------------------------------------------------------------ */

const heroRows = [
  { name: 'Sarah Chen', company: 'Meridian Labs', email: 's.chen@meridianlabs.io', state: 'done' },
  { name: 'Marcus Webb', company: 'Fieldstone AI', email: 'marcus@fieldstone.ai', state: 'done' },
  { name: 'Tom Okafor', company: 'Brightline', email: '', state: 'run' },
  { name: 'Priya Nair', company: 'Cobalt Systems', email: '', state: 'wait' },
];

const HeroTable = () => (
  <div className="brick-animate-in relative mx-auto mt-16 w-full max-w-3xl" style={{ animationDelay: '420ms' }}>
    {/* floating chips */}
    <div className="absolute -left-6 -top-5 z-10 hidden rotate-[-4deg] rounded-lg border border-border bg-card px-3 py-2 shadow-elegant md:block">
      <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.1em] text-muted-foreground">
        <Check className="text-[12px] text-success" /> hunter.verify — deliverable
      </div>
    </div>
    <div className="absolute -right-4 top-24 z-10 hidden rotate-[3deg] rounded-lg border border-primary/40 bg-card px-3 py-2 shadow-elegant md:block">
      <div className="font-mono text-[10px] tracking-[0.1em] text-muted-foreground">
        credits used: <span className="text-primary">$0.00</span>
      </div>
    </div>
    <div className="absolute -bottom-5 left-10 z-10 hidden rotate-[2deg] rounded-lg border border-border bg-card px-3 py-2 shadow-elegant md:block">
      <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.1em] text-muted-foreground">
        <ShieldCheck className="text-[12px] text-primary" /> 0 bytes left this machine
      </div>
    </div>

    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_30px_80px_-30px_hsl(var(--primary)/0.25)]">
      {/* window bar */}
      <div className="flex h-11 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-primary/70" />
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">leads_q3.csv</span>
        <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-primary">
          <Refresh className="animate-spin text-[11px]" /> enriching
        </span>
      </div>

      {/* mini grid */}
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            {['NAME', 'COMPANY', 'EMAIL'].map((h) => (
              <th key={h} className="border-r border-border/60 px-5 py-3 text-left last:border-r-0">
                <span className="flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  {h}
                  {h === 'EMAIL' && (
                    <span className="rounded border border-primary/40 bg-primary/10 px-1 py-px text-[9px] text-primary">f(x)</span>
                  )}
                </span>
              </th>
            ))}
            <th className="w-16 px-4 py-3 text-left">
              <Plus className="text-[12px] text-muted-foreground/60" />
            </th>
          </tr>
        </thead>
        <tbody>
          {heroRows.map((r) => (
            <tr key={r.name} className="border-b border-border/60 transition-colors last:border-b-0 hover:bg-accent/30">
              <td className="border-r border-border/60 px-5 py-3.5 text-sm">{r.name}</td>
              <td className="border-r border-border/60 px-5 py-3.5 text-sm text-muted-foreground">{r.company}</td>
              <td className="border-r border-border/60 px-5 py-3.5 last:border-r-0">
                {r.state === 'done' && (
                  <span className="flex items-center justify-between font-mono text-[11px] tracking-wide">
                    {r.email}
                    <Check className="text-[12px] text-success" />
                  </span>
                )}
                {r.state === 'run' && (
                  <span className="flex items-center gap-2 font-mono text-[11px] text-primary">
                    <Refresh className="animate-spin text-[12px]" /> probing…
                  </span>
                )}
                {r.state === 'wait' && <span className="font-mono text-[11px] text-muted-foreground/40">queued</span>}
              </td>
              <td className="px-4 py-3.5" />
            </tr>
          ))}
        </tbody>
      </table>

      {/* formula strip */}
      <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap border-t border-border bg-muted/20 px-4 py-2 font-mono text-[11px] text-muted-foreground">
        <span className="rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[9px] tracking-[0.1em] text-primary">f(x) EMAIL</span>
        <span>pattern(name, company)</span>
        <span className="text-primary">→</span>
        <span>hunter.verify</span>
        <span className="text-primary">→</span>
        <span className="text-foreground">deliverable only</span>
        <span className="brick-blink ml-1 text-primary">▮</span>
      </div>
    </div>
  </div>
);

const Hero = () => (
  <section className="relative overflow-hidden px-6 pb-28 pt-24">
    <div className="brick-grid-bg pointer-events-none absolute inset-0" />
    <div className="relative mx-auto max-w-[1440px] text-center">
      <p className="brick-animate-in" style={{ animationDelay: '40ms' }}>
        <MonoLabel>{'// free & open-source clay alternative'}</MonoLabel>
      </p>

      <h1
        className="brick-animate-in mx-auto mt-6 font-display text-[clamp(3rem,8vw,7rem)] font-black uppercase leading-[0.92] tracking-tight"
        style={{ animationDelay: '120ms' }}
      >
        Enrich data on
        <br />
        <span className="text-primary">your own</span> machine.
      </h1>

      <p
        className="brick-animate-in mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-muted-foreground"
        style={{ animationDelay: '200ms' }}
      >
        Most enrichment platforms charge $200–400/month, then again per credit — and take your
        whole lead list to their cloud. Bricks runs the same workflows locally: your keys,
        wholesale prices, or free local models.
      </p>

      <div
        className="brick-animate-in mt-10 flex flex-wrap items-center justify-center gap-3"
        style={{ animationDelay: '280ms' }}
      >
        <Link
          to="/app"
          className="flex h-12 items-center gap-2 rounded-md border border-primary bg-primary px-8 font-mono text-[11px] uppercase tracking-[0.16em] text-primary-foreground transition-all hover:bg-primary-glow hover:border-primary-glow hover:shadow-glow"
        >
          Launch app
          <ArrowRight className="text-[14px]" />
        </Link>
        <a
          href="https://github.com/BraaMohammed/bricks"
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-12 items-center gap-2 rounded-md border border-border px-8 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
        >
          <Github className="text-[15px]" />
          Star on GitHub
        </a>
      </div>

      <div
        className="brick-animate-in mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2"
        style={{ animationDelay: '340ms' }}
      >
        <StatusChip label="No signup" live />
        <StatusChip label="No credit system" live />
        <StatusChip label="Data never leaves your machine" live />
      </div>

      <HeroTable />
    </div>
  </section>
);

/* ------------------------------------------------------------------ */
/* Stack strip                                                         */
/* ------------------------------------------------------------------ */

const StackStrip = () => (
  <section className="border-y border-border bg-muted/20">
    <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-center gap-x-10 gap-y-3 px-6 py-5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
      {['Groq', 'OpenAI', 'Gemini', 'Ollama', 'Hunter', 'MillionVerifier', 'Serper', 'Tavily', 'Puppeteer', 'Firecrawl'].map((name) => (
        <span key={name} className="transition-colors hover:text-primary">{name}</span>
      ))}
    </div>
  </section>
);

/* ------------------------------------------------------------------ */
/* Features                                                            */
/* ------------------------------------------------------------------ */

const features = [
  {
    icon: Search,
    title: 'Autonomous research agent',
    desc: 'Give a column an instruction — "find this company\'s latest funding round and who led it." The agent writes queries, reads pages, and keeps digging until the cell has a concrete answer.',
    tag: 'web agent',
  },
  {
    icon: Mail,
    title: 'AI email finder',
    desc: 'Generates likely email patterns from lead data, then validates each through a cascade of verifiers — Hunter → MillionVerifier → QuickEmailVerification. Only confirmed, deliverable emails land in your grid.',
    tag: '2–3k free / month',
  },
  {
    icon: Group,
    title: 'Dual-agent outreach',
    desc: 'A writer agent drafts; a prospect agent role-plays the lead and critiques. They loop until the message survives the persona — outreach pressure-tested before it hits your clipboard.',
    tag: 'writer ⇄ prospect',
  },
  {
    icon: Binocular,
    title: 'Stealth browser engine',
    desc: 'A local Puppeteer pool with stealth plugins, smart queueing and tracker blocking handles sites that block scraper APIs. Your machine, your IP — no scraping subscription.',
    tag: 'puppeteer pool',
  },
  {
    icon: Terminal,
    title: 'Programmable columns',
    desc: 'Every column runs a formula: raw JavaScript, direct AI prompts, search agents, email finding, Puppeteer scripts or Firecrawl. Click a header, write the logic, run the column.',
    tag: 'f(x)',
  },
  {
    icon: Server,
    title: 'Ollama compatible',
    desc: 'Plug in DeepSeek, Qwen or Llama running locally and AI columns cost literally $0. Six free-tier search services stack with automatic failover when one runs dry.',
    tag: '$0 inference',
  },
];

const Features = () => (
  <section id="features" className="px-6 py-28">
    <div className="mx-auto max-w-[1440px]">
      <MonoLabel>{'// what it does'}</MonoLabel>
      <h2 className="mt-4 max-w-2xl font-display text-4xl font-black uppercase leading-[0.95] tracking-tight md:text-5xl">
        A full enrichment stack, <span className="text-primary">on-device.</span>
      </h2>

      <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <div
            key={f.title}
            className="group relative bg-card p-8 transition-colors duration-300 hover:bg-accent/40"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary transition-transform duration-300 group-hover:-translate-y-1">
                <f.icon className="text-[20px]" />
              </div>
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground/70">
                {f.tag}
              </span>
            </div>
            <h3 className="mt-6 font-display text-lg font-bold uppercase tracking-tight">{f.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            <span className="absolute bottom-0 left-0 h-0.5 w-0 bg-primary transition-all duration-300 group-hover:w-full" />
            <span className="absolute right-6 top-8 font-mono text-[10px] text-muted-foreground/40">
              {String(i + 1).padStart(2, '0')}
            </span>
          </div>
        ))}
      </div>
    </div>
  </section>
);

/* ------------------------------------------------------------------ */
/* How it works                                                        */
/* ------------------------------------------------------------------ */

const HowItWorks = () => (
  <section id="how" className="border-y border-border bg-muted/10 px-6 py-28">
    <div className="mx-auto max-w-[1440px]">
      <MonoLabel>{'// how it works'}</MonoLabel>
      <h2 className="mt-4 font-display text-4xl font-black uppercase leading-[0.95] tracking-tight md:text-5xl">
        Three steps. <span className="text-primary">Zero cloud.</span>
      </h2>

      <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3">
        {[
          { n: '01', icon: Database, title: 'Upload CSV', desc: 'Drag in your lead list. Headers become programmable columns instantly — parsed locally, never uploaded.' },
          { n: '02', icon: Terminal, title: 'Program columns', desc: 'JavaScript, AI prompts, search agents or the email finder. Each column gets its own logic and its own model.' },
          { n: '03', icon: Flash, title: 'Execute & export', desc: 'Watch cells fill in real time as agents work through the rows. Export when the grid is solid.' },
        ].map((step) => (
          <div key={step.n} className="group relative bg-card p-8 transition-colors duration-300 hover:bg-accent/40">
            <div className="flex items-center justify-between">
              <span className="font-display text-5xl font-black text-primary/25 transition-colors group-hover:text-primary/50">{step.n}</span>
              <step.icon className="text-[22px] text-muted-foreground transition-colors group-hover:text-primary" />
            </div>
            <h3 className="mt-6 font-display text-lg font-bold uppercase tracking-tight">{step.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
            <span className="absolute bottom-0 left-0 h-0.5 w-0 bg-primary transition-all duration-300 group-hover:w-full" />
          </div>
        ))}
      </div>
    </div>
  </section>
);

/* ------------------------------------------------------------------ */
/* Cost comparison                                                     */
/* ------------------------------------------------------------------ */

const Compare = () => (
  <section id="compare" className="px-6 py-28">
    <div className="mx-auto max-w-[1440px]">
      <MonoLabel>{'// the math'}</MonoLabel>
      <h2 className="mt-4 font-display text-4xl font-black uppercase leading-[0.95] tracking-tight md:text-5xl">
        Stop renting <span className="text-primary">your own data.</span>
      </h2>

      <div className="mt-14 grid gap-6 lg:grid-cols-2">
        {/* them */}
        <div className="rounded-xl border border-border bg-card p-8">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Them</span>
            <Xmark className="text-[16px] text-destructive" />
          </div>
          <div className="mt-6 font-display text-5xl font-black tracking-tight text-muted-foreground md:text-6xl">
            $200–400
            <span className="ml-2 align-middle font-mono text-xs font-normal tracking-[0.14em] text-muted-foreground/70">/ MO BASE</span>
          </div>
          <ul className="mt-8 space-y-4">
            {[
              'Base fee before you enrich a single row',
              'Per-credit markup on every enrichment run',
              'Your entire lead list uploaded to their cloud',
              'Row caps, seat limits, overage fees',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                <Xmark className="mt-0.5 shrink-0 text-[13px] text-destructive/70" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* bricks */}
        <div className="relative overflow-hidden rounded-xl border border-primary/40 bg-card p-8 shadow-elegant">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Bricks</span>
            <Check className="text-[16px] text-success" />
          </div>
          <div className="mt-6 font-display text-5xl font-black tracking-tight text-primary md:text-6xl">
            $0.00
            <span className="ml-2 align-middle font-mono text-xs font-normal tracking-[0.14em] text-muted-foreground">/ MO BASE</span>
          </div>
          <ul className="mt-8 space-y-4">
            {[
              'Free and open source — no base fee, ever',
              'Your own API keys at wholesale provider prices',
              'Data never leaves your machine — local models optional',
              'No row caps. No seats. No credits. No lock-in.',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-foreground/90">
                <Check className="mt-0.5 shrink-0 text-[13px] text-success" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* byok strip */}
      <div className="mt-6 grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3">
        {[
          { icon: Key, k: 'BRING YOUR OWN KEYS', v: 'Groq · OpenAI · Gemini' },
          { icon: Laptop, k: 'OR RUN LOCAL', v: 'Ollama · DeepSeek · Qwen · Llama' },
          { icon: ShieldCheck, k: 'NOTHING PHONES HOME', v: 'No analytics. No telemetry.' },
        ].map((s) => (
          <div key={s.k} className="flex items-center gap-4 bg-card p-6">
            <s.icon className="shrink-0 text-[20px] text-primary" />
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{s.k}</div>
              <div className="mt-1 text-sm font-medium">{s.v}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

/* ------------------------------------------------------------------ */
/* CTA + footer                                                        */
/* ------------------------------------------------------------------ */

const Cta = () => (
  <section className="relative overflow-hidden border-t border-border px-6 py-32">
    <div className="brick-grid-bg pointer-events-none absolute inset-0 rotate-180" />
    <div className="relative mx-auto max-w-[1440px] text-center">
      <h2 className="font-display text-[clamp(2.5rem,6vw,5rem)] font-black uppercase leading-[0.92] tracking-tight">
        Your data. Your machine.
        <br />
        <span className="text-primary">Your keys.</span>
      </h2>
      <p className="mx-auto mt-6 max-w-xl text-muted-foreground">
        Upload a CSV and run your first enrichment in under a minute.
        The frontend is hosted — the engine stays on your machine.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/app"
          className="flex h-12 items-center gap-2 rounded-md border border-primary bg-primary px-8 font-mono text-[11px] uppercase tracking-[0.16em] text-primary-foreground transition-all hover:bg-primary-glow hover:border-primary-glow hover:shadow-glow"
        >
          Launch app
          <ArrowRight className="text-[14px]" />
        </Link>
        <a
          href="https://github.com/BraaMohammed/bricks"
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-12 items-center gap-2 rounded-md border border-border px-8 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
        >
          Read the docs
          <ArrowUpRight className="text-[13px]" />
        </a>
      </div>
    </div>
  </section>
);

const Footer = () => (
  <footer className="border-t border-border">
    <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-4 px-6 py-8 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground md:flex-row">
      <div className="flex items-center gap-3">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground">
          <Cube className="text-[13px]" />
        </div>
        <span>Bricks — free lite-weight clay alternative</span>
      </div>
      <div className="flex items-center gap-6">
        <a href="https://github.com/BraaMohammed/bricks" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-foreground">GitHub</a>
        <a href="#features" className="transition-colors hover:text-foreground">Features</a>
        <Link to="/app" className="transition-colors hover:text-foreground">App</Link>
      </div>
      <span>
        Credits used: <span className="text-primary">$0.00</span> <span className="brick-blink ml-2 text-primary">▮</span>
      </span>
    </div>
  </footer>
);

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const Landing = () => (
  <div className="min-h-screen bg-background text-foreground antialiased">
    <IconoirProvider iconProps={{ width: '1em', height: '1em', strokeWidth: 1.5 }}>
      <div className="brick-noise" />
      <Nav />
      <Hero />
      <StackStrip />
      <Features />
      <HowItWorks />
      <Compare />
      <Cta />
      <Footer />
    </IconoirProvider>
  </div>
);

export default Landing;
