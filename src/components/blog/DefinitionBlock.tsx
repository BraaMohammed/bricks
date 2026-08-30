import React from 'react';
import { Flash } from 'iconoir-react';

interface DefinitionBlockProps {
  term: string;
  definition: string;
  whyItMatters: string;
  contextDate: string;
}

export const DefinitionBlock: React.FC<DefinitionBlockProps> = ({
  term,
  definition,
  whyItMatters,
  contextDate,
}) => {
  return (
    <aside
      aria-label="Direct Definition"
      className="my-8 rounded-xl border border-primary/30 bg-primary/5 p-6 shadow-sm backdrop-blur-sm"
    >
      <div className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
        <Flash className="h-4 w-4 text-primary" />
        <span>Direct Definition</span>
        <span className="ml-auto text-[10px] text-muted-foreground">
          Verified Context: {contextDate}
        </span>
      </div>

      <div className="mt-3 space-y-2 text-foreground">
        <p className="text-base leading-relaxed font-medium md:text-lg">
          <strong className="text-primary underline decoration-primary/40 underline-offset-4">
            {term}
          </strong>{' '}
          {definition}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {whyItMatters}
        </p>
      </div>
    </aside>
  );
};
