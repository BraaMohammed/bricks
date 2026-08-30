import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { ArrowRight, Github, HalfMoon, SunLight } from 'iconoir-react';

export const BlogNav = () => {
  const { theme, setTheme } = useTheme();
  const isDark = theme !== 'light';

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="group flex items-center gap-1.5">
            <img
              src="/logo-1.png"
              alt="Bricks logo"
              className="h-8 w-8 shrink-0 object-contain transition-transform group-hover:scale-105"
            />
            <span className="font-display text-2xl font-black uppercase tracking-tight text-foreground">
              BRICKS
            </span>
            <span className="ml-2 hidden border-l border-border pl-3 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground sm:inline-block">
              Clay alternative · zero credits
            </span>
          </Link>
        </div>

        <nav className="hidden items-center gap-7 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground md:flex">
          <Link to="/" className="transition-colors hover:text-foreground">Home</Link>
          <Link to="/blog" className="transition-colors text-primary font-semibold">Blog</Link>
          <a href="/#features" className="transition-colors hover:text-foreground">Features</a>
          <a href="/#compare" className="transition-colors hover:text-foreground">Compare</a>
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
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
            aria-label="Toggle theme"
          >
            {isDark ? <SunLight className="text-[15px]" /> : <HalfMoon className="text-[15px]" />}
          </button>
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
};
