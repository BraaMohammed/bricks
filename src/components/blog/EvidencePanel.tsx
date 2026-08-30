import React from 'react';
import { Database, ArrowUpRight } from 'iconoir-react';
import { EvidenceBlock } from '@/types/blog';

interface EvidencePanelProps {
  evidence: EvidenceBlock;
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({ evidence }) => {
  return (
    <aside
      id={evidence.id}
      aria-label={`Evidence: ${evidence.title}`}
      className="my-8 rounded-xl border border-border/80 bg-muted/30 p-6 shadow-sm"
    >
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        <Database className="h-4 w-4 text-primary" />
        <h4 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
          Evidence Panel: {evidence.title}
        </h4>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {evidence.dateCollected}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
        <div className="sm:col-span-2 rounded-lg bg-card/60 p-3 border border-border/40">
          <dt className="font-mono uppercase tracking-wider text-[10px] text-muted-foreground">
            Verifiable Claim
          </dt>
          <dd className="mt-1 text-sm font-semibold text-foreground">
            {evidence.claim}
          </dd>
        </div>

        <div className="rounded-lg bg-card/60 p-3 border border-border/40">
          <dt className="font-mono uppercase tracking-wider text-[10px] text-muted-foreground">
            Methodology & Test Environment
          </dt>
          <dd className="mt-1 text-foreground/80 leading-relaxed">
            {evidence.methodology}
          </dd>
        </div>

        <div className="rounded-lg bg-card/60 p-3 border border-border/40">
          <dt className="font-mono uppercase tracking-wider text-[10px] text-muted-foreground">
            Data Source
          </dt>
          <dd className="mt-1 flex items-center gap-1.5 font-medium text-foreground">
            {evidence.sourceUrl ? (
              <a
                href={evidence.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-1 text-primary hover:underline"
              >
                <span>{evidence.sourceName}</span>
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
            ) : (
              <span>{evidence.sourceName}</span>
            )}
          </dd>
        </div>

        <div className="sm:col-span-2 rounded-lg bg-card/60 p-3 border border-border/40">
          <dt className="font-mono uppercase tracking-wider text-[10px] text-muted-foreground">
            Known Limitations & Caveats
          </dt>
          <dd className="mt-1 text-muted-foreground leading-relaxed">
            {evidence.limitations}
          </dd>
        </div>
      </dl>
    </aside>
  );
};
