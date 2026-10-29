import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ChatLines,
  IconoirProvider,
  Refresh,
  Rocket,
  WarningCircle,
  Xmark,
} from 'iconoir-react';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { ClarifyChat } from '@/components/deepResearch/ClarifyChat';
import { ResearchModelSelector } from '@/components/deepResearch/ResearchModelSelector';
import { AgentTranscript } from '@/components/deepResearch/AgentTranscript';
import { SourceStatusCards } from '@/components/deepResearch/SourceStatusCards';
import { RecordsTable } from '@/components/deepResearch/RecordsTable';
import { OutputSchemaEditor } from '@/components/deepResearch/OutputSchemaEditor';
import { useDeepResearchSSE } from '@/hooks/useDeepResearchSSE';
import { useDeepResearchStore } from '@/stores/useDeepResearchStore';
import { useDataStore } from '@/stores/useDataStore';
import { toast } from '@/hooks/use-toast';

const DeepResearch = () => {
  const navigate = useNavigate();
  const { startRun, stopRun } = useDeepResearchSSE();
  const phase = useDeepResearchStore((s) => s.phase);
  const records = useDeepResearchStore((s) => s.records);
  const totalRecords = useDeepResearchStore((s) => s.totalRecords);
  const error = useDeepResearchStore((s) => s.error);
  const runId = useDeepResearchStore((s) => s.runId);
  const outputSchema = useDeepResearchStore((s) => s.outputSchema);
  const messages = useDeepResearchStore((s) => s.messages);
  const isSendingChat = useDeepResearchStore((s) => s.isSendingChat);
  const approveOutputSchema = useDeepResearchStore((s) => s.approveOutputSchema);
  const pushToEnrichment = useDeepResearchStore((s) => s.pushToEnrichment);
  const resetRun = useDeepResearchStore((s) => s.resetRun);
  const continueChatting = useDeepResearchStore((s) => s.continueChatting);
  const reviewResults = useDeepResearchStore((s) => s.reviewResults);
  const gridHeaders = useDataStore((s) => s.headers);

  const showClarify = phase === 'idle' || phase === 'clarifying' || phase === 'schema_review';
  const doneCount = totalRecords !== null ? totalRecords : records.length;

  const handleApproveAndStart = () => {
    if (!approveOutputSchema()) return;
    void startRun();
  };

  const handleRetry = () => {
    void startRun();
  };

  const handlePushToEnrichment = () => {
    if (!pushToEnrichment()) return;
    toast({
      title: 'Records pushed to enrichment',
      description: `${records.length} Record${records.length === 1 ? '' : 's'} loaded into the grid.`,
    });
    navigate('/app');
  };

  return (
    <IconoirProvider iconProps={{ width: '1em', height: '1em', strokeWidth: 1.5 }}>
      <div className="min-h-screen bg-background text-foreground">
        <div className="brick-noise" />
        <AppHeader />

        <main className="relative">
          <div className="brick-grid-bg pointer-events-none absolute inset-0" />

          <div className="relative mx-auto max-w-[1600px] px-6 pb-20">
            {showClarify ? (
              <>
                <div className="mx-auto max-w-4xl pt-14">
                  <div className="brick-animate-in flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-primary">
                        {'// ai deep researcher'}
                      </p>
                      <h1 className="mt-4 font-display text-[clamp(2.4rem,5vw,4rem)] font-black uppercase leading-[0.94] tracking-tight">
                        Research <span className="text-primary">anything</span>.
                        <br />
                        Get a table.
                      </h1>
                      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                        Find companies, people, job posts — whatever you describe. The
                        Orchestrator clarifies the goal, proposes an editable Output Schema,
                        then Search Sub-Agents research the web and fill your grid.
                      </p>
                    </div>
                    {messages.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetRun}
                        disabled={isSendingChat}
                        className="mt-1 shrink-0 rounded-md font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-destructive"
                      >
                        Start over
                      </Button>
                    )}
                  </div>

                  {gridHeaders.length > 0 && (
                    <p className="mt-5 rounded-lg border border-warning/30 bg-warning/[0.06] px-3 py-2 font-mono text-[10px] uppercase leading-relaxed tracking-[0.14em] text-muted-foreground">
                      heads up — pushing research results replaces the {gridHeaders.length}-field
                      grid currently loaded in this browser
                    </p>
                  )}

                  {records.length > 0 && outputSchema && (
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        {doneCount} Record{doneCount === 1 ? '' : 's'}{' '}
                        {doneCount === 1 ? 'is' : 'are'} waiting from this Deep Research Run
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={reviewResults}
                        className="h-8 gap-2 rounded-md border-border font-mono text-[10px] uppercase tracking-[0.14em]"
                      >
                        Back to results
                        <ArrowRight className="text-[13px]" />
                      </Button>
                    </div>
                  )}

                  <div className="mt-8">
                    <ResearchModelSelector />
                  </div>
                </div>

                <ClarifyChat />

                {outputSchema && (
                  <div className="mx-auto max-w-4xl">
                    <OutputSchemaEditor onApproveAndStart={handleApproveAndStart} />
                  </div>
                )}
              </>
            ) : (
              <div className="pt-8">
                <div className="brick-animate-in flex items-end justify-between gap-4">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-primary">
                      {'// deep research run'}
                    </p>
                    <h2 className="mt-2 font-display text-3xl font-black uppercase tracking-tight">
                      {phase === 'researching'
                        ? 'Researching…'
                        : phase === 'failed'
                        ? 'Run failed'
                        : 'Results'}
                      {runId && (
                        <span className="ml-3 align-middle font-mono text-[11px] font-normal tracking-[0.14em] text-muted-foreground">
                          run {runId.slice(0, 8)}
                        </span>
                      )}
                    </h2>
                  </div>

                  {phase === 'researching' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={stopRun}
                      className="h-9 gap-2 rounded-md border-border font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:border-destructive hover:bg-transparent hover:text-destructive"
                    >
                      <Xmark className="text-[14px]" />
                      Stop
                    </Button>
                  )}
                </div>

                <div className="brick-animate-in mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
                  <AgentTranscript />

                  <div className="space-y-6">
                    <SourceStatusCards />
                    <RecordsTable />
                  </div>
                </div>

                {phase === 'failed' && (
                  <div className="brick-animate-in mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-destructive/40 bg-destructive/[0.06] px-5 py-4">
                    <div className="flex items-center gap-3">
                      <WarningCircle className="shrink-0 text-[18px] text-destructive" />
                      <div>
                        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-destructive">
                          Deep Research Run failed
                        </p>
                        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{error}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {outputSchema && records.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePushToEnrichment}
                          className="h-9 gap-2 rounded-md border-border font-mono text-[10px] uppercase tracking-[0.14em]"
                        >
                          <Rocket className="text-[14px]" />
                          Push {records.length} anyway
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={handleRetry}
                        className="h-9 gap-2 rounded-md border border-primary bg-primary font-mono text-[10px] uppercase tracking-[0.14em] text-primary-foreground hover:border-primary-glow hover:bg-primary-glow"
                      >
                        <Refresh className="text-[14px]" />
                        Retry run
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetRun}
                        className="h-9 rounded-md font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
                      >
                        Start over
                      </Button>
                    </div>
                  </div>
                )}

                {phase === 'results_review' && (
                  <div className="brick-animate-in mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary/30 bg-primary/[0.04] px-5 py-4">
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-primary">
                        {doneCount} Record{doneCount === 1 ? '' : 's'} collected
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Review the table, then push it into the grid to enrich it.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="lg"
                        disabled={records.length === 0}
                        onClick={handlePushToEnrichment}
                        className="h-11 gap-2 rounded-md border border-primary bg-primary font-mono text-[11px] uppercase tracking-[0.16em] text-primary-foreground hover:border-primary-glow hover:bg-primary-glow"
                      >
                        <ArrowRight className="text-[15px]" />
                        Push to enrichment
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={continueChatting}
                        className="h-11 gap-2 rounded-md border-border font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:border-primary/60 hover:text-foreground"
                      >
                        <ChatLines className="text-[15px]" />
                        Continue chatting
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetRun}
                        className="h-9 rounded-md font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
                      >
                        Start over
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </IconoirProvider>
  );
};

export default DeepResearch;
