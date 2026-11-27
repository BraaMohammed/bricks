import { useEffect, useRef } from 'react';
import { CheckCircle, NavArrowRight, Terminal, WarningCircle } from 'iconoir-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ORCHESTRATOR_AGENT_ID,
  useDeepResearchStore,
  type AgentStatus,
  type TranscriptItem,
} from '@/stores/useDeepResearchStore';

const formatToolInput = (toolInput: unknown): { short: string; full: string } => {
  let full: string;
  if (typeof toolInput === 'string') {
    full = toolInput;
  } else {
    try {
      full = JSON.stringify(toolInput) ?? String(toolInput);
    } catch {
      full = String(toolInput);
    }
  }
  return { short: full.length > 160 ? `${full.slice(0, 160)}…` : full, full };
};

const StatusDot = ({ status }: { status: AgentStatus['status'] }) => {
  if (status === 'running') {
    return <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-primary" />;
  }
  if (status === 'finished') {
    return <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />;
  }
  return <span className="h-2 w-2 shrink-0 rounded-full bg-destructive" />;
};

const TranscriptItems = ({
  items,
  live,
  showCaret,
}: {
  items: TranscriptItem[];
  live: boolean;
  showCaret: boolean;
}) => (
  <div className="flex flex-col gap-2.5">
    {items.map((item, index) => {
      if (item.type === 'token') {
        const isLast = index === items.length - 1;
        return (
          <p
            key={index}
            className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-foreground/90"
          >
            {item.text}
            {live && showCaret && isLast && (
              <span className="brick-blink ml-0.5 text-primary">▋</span>
            )}
          </p>
        );
      }

      if (item.type === 'tool_call') {
        const input = formatToolInput(item.toolInput);
        return (
          <div key={index} className="flex flex-wrap gap-1.5">
            <span
              title={input.full}
              className="inline-flex max-w-full items-center gap-1.5 rounded border border-border bg-muted/40 px-2 py-1 font-mono text-[10px] text-muted-foreground"
            >
              <Terminal className="shrink-0 text-[11px] text-primary" />
              <span className="shrink-0 font-medium text-primary">{item.toolName}</span>
              <span className="truncate">{input.short}</span>
            </span>
          </div>
        );
      }

      return (
        <p
          key={index}
          className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70"
        >
          {item.text}
        </p>
      );
    })}
  </div>
);

const SubAgentBlock = ({
  agentId,
  status,
  items,
  live,
}: {
  agentId: string;
  status: AgentStatus;
  items: TranscriptItem[];
  live: boolean;
}) => (
  <Collapsible defaultOpen className="group overflow-hidden rounded-xl border border-border bg-card">
    <CollapsibleTrigger className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-accent/40">
      <StatusDot status={status.status} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-sm font-bold uppercase tracking-tight">
          {status.sourceName}
        </p>
        <p className="truncate font-mono text-[10px] text-muted-foreground">
          Search Sub-Agent · {agentId}
        </p>
      </div>
      {status.status === 'finished' && (
        <span className="hidden shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 font-mono text-[10px] tracking-[0.14em] text-muted-foreground sm:inline-flex">
          <CheckCircle className="text-[12px] text-emerald-500" />
          {status.recordsFound} record{status.recordsFound === 1 ? '' : 's'}
        </span>
      )}
      {status.status === 'failed' && (
        <WarningCircle className="shrink-0 text-[14px] text-destructive" />
      )}
      <NavArrowRight className="shrink-0 text-[14px] text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-90" />
    </CollapsibleTrigger>
    <CollapsibleContent className="px-4 py-3">
      {items.length > 0 ? (
        <div className="max-h-[300px] overflow-y-auto pr-1">
          <TranscriptItems items={items} live={live && status.status === 'running'} showCaret />
        </div>
      ) : (
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Waiting for the first token…
        </p>
      )}
      {status.status === 'failed' && status.error && (
        <p className="mt-2 font-mono text-[10px] text-destructive">{status.error}</p>
      )}
    </CollapsibleContent>
  </Collapsible>
);

export const AgentTranscript = () => {
  const transcript = useDeepResearchStore((s) => s.transcript);
  const agentStatuses = useDeepResearchStore((s) => s.agentStatuses);
  const live = useDeepResearchStore((s) => s.phase === 'researching');
  const orchestratorRef = useRef<HTMLDivElement | null>(null);

  const orchestratorItems = transcript.filter(
    (item) => item.agentId === ORCHESTRATOR_AGENT_ID
  );
  const subAgentIds = Object.keys(agentStatuses);

  useEffect(() => {
    const node = orchestratorRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [transcript]);

  return (
    <div className="flex flex-col gap-4">
      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">
              {'// orchestrator'}
            </p>
            <h3 className="mt-1 font-display text-sm font-bold uppercase tracking-tight">
              Orchestrator
            </h3>
          </div>
          {live && (
            <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              Live
            </span>
          )}
        </div>
        <div
          ref={orchestratorRef}
          className="max-h-[360px] overflow-y-auto px-4 py-3"
        >
          {orchestratorItems.length > 0 ? (
            <TranscriptItems items={orchestratorItems} live={live} showCaret />
          ) : (
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Waiting for the first Orchestrator message…
            </p>
          )}
        </div>
      </section>

      {subAgentIds.length > 0 && (
        <section className="flex flex-col gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">
            {'// search sub-agents'}
          </p>
          {subAgentIds.map((agentId) => (
            <SubAgentBlock
              key={agentId}
              agentId={agentId}
              status={agentStatuses[agentId]}
              items={transcript.filter((item) => item.agentId === agentId)}
              live={live}
            />
          ))}
        </section>
      )}
    </div>
  );
};
