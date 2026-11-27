import { CheckCircle, PageSearch } from 'iconoir-react';
import { cn } from '@/lib/utils';
import { useDeepResearchStore, type AgentStatus } from '@/stores/useDeepResearchStore';

const statusLabel = (status: AgentStatus['status']) => {
  if (status === 'finished') return 'done';
  if (status === 'failed') return 'failed';
  return 'searching';
};

export const SourceStatusCards = () => {
  const agentStatuses = useDeepResearchStore((s) => s.agentStatuses);
  const coverageReview = useDeepResearchStore((s) => s.coverageReview);
  const phase = useDeepResearchStore((s) => s.phase);

  const agents = Object.entries(agentStatuses);
  const finished = agents.filter(([, agent]) => agent.status === 'finished').length;
  const totalRecords = agents.reduce((sum, [, agent]) => sum + agent.recordsFound, 0);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-primary">
          {'// research sources'}
        </p>
        {agents.length > 0 && (
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {finished}/{agents.length} done · {totalRecords} records
          </p>
        )}
      </div>

      {agents.length === 0 ? (
        <p className="px-5 py-4 font-mono text-[11px] text-muted-foreground">
          waiting for the Orchestrator to assign Search Sub-Agents…
        </p>
      ) : (
        <div className="grid gap-px bg-border sm:grid-cols-2">
          {agents.map(([agentId, agent]) => (
            <div key={agentId} className="bg-card px-4 py-3.5">
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 truncate font-mono text-xs text-foreground">
                  {agent.sourceName}
                </p>
                <span
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em]',
                    agent.status === 'finished' &&
                      'border-primary/40 bg-primary/[0.08] text-primary',
                    agent.status === 'failed' &&
                      'border-destructive/40 bg-destructive/10 text-destructive',
                    agent.status === 'running' && 'border-primary/30 text-primary'
                  )}
                >
                  {agent.status === 'running' && (
                    <span className="h-1 w-1 animate-pulse rounded-full bg-primary" />
                  )}
                  {statusLabel(agent.status)}
                </span>
              </div>
              <p className="mt-1.5 font-mono text-[10px] tracking-[0.1em] text-muted-foreground">
                {agent.status === 'failed'
                  ? agent.error || 'search failed'
                  : agent.recordsFound > 0
                  ? `${agent.recordsFound} record${agent.recordsFound === 1 ? '' : 's'} found`
                  : agent.status === 'finished'
                  ? 'no records found'
                  : '—'}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-border px-5 py-3">
        {coverageReview ? (
          <div className="flex items-start gap-2">
            {coverageReview.decision.toLowerCase().includes('spin') ||
            coverageReview.decision.toLowerCase().includes('more') ? (
              <PageSearch className="mt-0.5 shrink-0 text-[13px] text-primary" />
            ) : (
              <CheckCircle className="mt-0.5 shrink-0 text-[13px] text-primary" />
            )}
            <p className="font-mono text-[10px] uppercase leading-relaxed tracking-[0.14em] text-muted-foreground">
              Coverage Reviewer · round{' '}
              {(Number.isFinite(coverageReview.reSpinNumber)
                ? coverageReview.reSpinNumber
                : 0) + 1}{' '}
              ·{' '}
              <span className="text-foreground/80">
                {coverageReview.decision.replace(/_/g, ' ')}
              </span>
              {coverageReview.reason ? ` — ${coverageReview.reason}` : ''}
            </p>
          </div>
        ) : (
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
            {phase === 'researching'
              ? 'Coverage Reviewer · waiting for the first search round'
              : 'Coverage Reviewer · no review yet'}
          </p>
        )}
      </div>
    </div>
  );
};
