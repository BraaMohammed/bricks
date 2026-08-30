import React from 'react';
import { CitationReference } from '@/types/blog';
import { ArrowUpRight, Book } from 'iconoir-react';

interface ReferencesSectionProps {
  citations: CitationReference[];
}

export const ReferencesSection: React.FC<ReferencesSectionProps> = ({ citations }) => {
  if (!citations || citations.length === 0) return null;

  return (
    <section
      id="references"
      aria-label="References and External Citations"
      className="my-12 rounded-xl border border-border bg-card/40 p-6 shadow-sm"
    >
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <Book className="h-4 w-4 text-primary" />
        <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
          References & Primary Sources
        </h3>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Verifiable Citations ({citations.length})
        </span>
      </div>

      <ol className="mt-4 space-y-3 font-mono text-xs">
        {citations.map((cite) => (
          <li key={cite.id} id={`ref-${cite.id}`} className="flex items-start gap-2.5 text-muted-foreground leading-relaxed">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10 font-bold text-primary text-[10px]">
              [{cite.id}]
            </span>
            <div className="flex-1">
              <a
                href={cite.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-1 font-semibold text-foreground hover:text-primary transition-colors"
              >
                <span>{cite.title}</span>
                <span className="text-[10px] text-muted-foreground font-normal">({cite.sourceName})</span>
                <ArrowUpRight className="h-3 w-3 text-primary opacity-70 group-hover:opacity-100" />
              </a>
              {cite.description && (
                <p className="mt-0.5 text-[11px] text-muted-foreground/80 font-sans">
                  {cite.description}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
};
