import React from 'react';
import { ShieldCheck } from 'iconoir-react';

interface QuickSummaryBoxProps {
  takeaways: string[];
}

export const QuickSummaryBox: React.FC<QuickSummaryBoxProps> = ({ takeaways }) => {
  return (
    <div
      aria-label="Quick Takeaways Summary"
      className="my-8 rounded-xl border border-border bg-card p-6 shadow-sm"
    >
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
          Key Takeaways (Quick-Scan Summary)
        </h3>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Machine-Extractable
        </span>
      </div>

      <ul className="mt-4 space-y-3">
        {takeaways.map((item, idx) => (
          <li key={idx} className="flex items-start gap-3 text-sm text-foreground/90 leading-relaxed">
            <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-[10px] font-bold text-primary">
              {idx + 1}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
