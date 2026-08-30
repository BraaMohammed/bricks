import React from 'react';
import { ComparisonRow } from '@/types/blog';

interface ComparisonTableProps {
  title: string;
  competitorName: string;
  rows: ComparisonRow[];
  verdict: string;
}

export const ComparisonTable: React.FC<ComparisonTableProps> = ({
  title,
  competitorName,
  rows,
  verdict,
}) => {
  return (
    <div className="my-10 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-muted/40 px-6 py-4">
        <h3 className="font-display text-base font-bold uppercase tracking-wide text-foreground">
          {title}
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              <th scope="col" className="px-6 py-3.5">
                Evaluation Criterion
              </th>
              <th scope="col" className="px-6 py-3.5 text-primary">
                Bricks (Local Architecture)
              </th>
              <th scope="col" className="px-6 py-3.5">
                {competitorName} (Cloud SaaS)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row, idx) => (
              <tr
                key={idx}
                className={`transition-colors hover:bg-muted/30 ${
                  row.highlight ? 'bg-primary/5 font-medium' : ''
                }`}
              >
                <td className="px-6 py-4 font-medium text-foreground">
                  {row.feature}
                </td>
                <td className="px-6 py-4 text-primary font-semibold">
                  {row.bricks}
                </td>
                <td className="px-6 py-4 text-muted-foreground">
                  {row.competitor}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {verdict && (
        <div className="border-t border-border bg-muted/10 px-6 py-4 text-xs leading-relaxed text-muted-foreground">
          <strong className="font-mono uppercase text-[10px] tracking-wider text-foreground">
            Architectural Verdict:{' '}
          </strong>
          {verdict}
        </div>
      )}
    </div>
  );
};
