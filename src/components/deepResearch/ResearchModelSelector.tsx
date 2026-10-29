import { useMemo } from 'react';
import { Refresh } from 'iconoir-react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBackendStatus } from '@/hooks/useBackendStatus';
import { useOpenCodeGoModels } from '@/hooks/useOpenCodeGoModels';
import { useDeepResearchStore } from '@/stores/useDeepResearchStore';
import { waterfallModels, type ModelDefinition } from '@/lib/constants/aiModels';
import { isOpenCodeGoModel, stripOpenCodeGoPrefix } from '@/lib/providers/opencodeGo';

const GO_LABELS: Record<string, string> = {
  contributor: 'Trains on data',
  free: 'Free',
  'region-limited': 'Region-limited',
  preview: 'Preview',
};

const toFriendlyName = (id: string): string =>
  stripOpenCodeGoPrefix(id)
    .replace(/[-_.]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const GoLabels = ({ labels }: { labels?: string[] }) => {
  if (!labels || labels.length === 0) return null;
  return (
    <>
      {labels.map((label) => (
        <span
          key={label}
          className="rounded-full border border-border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground"
        >
          {GO_LABELS[label] ?? label}
        </span>
      ))}
    </>
  );
};

export const ResearchModelSelector = () => {
  const model = useDeepResearchStore((s) => s.model);
  const setModel = useDeepResearchStore((s) => s.setModel);
  const { models: backendModels } = useBackendStatus();
  const { models: goModels, configured, loading: goLoading } = useOpenCodeGoModels();

  const freeModels = useMemo<ModelDefinition[]>(() => {
    const source = backendModels.length > 0 ? backendModels : waterfallModels;
    const staticById = new Map(waterfallModels.map((entry) => [entry.id, entry]));
    return source
      .filter((entry) => !isOpenCodeGoModel(entry.id))
      .map((entry) => {
        const known = staticById.get(entry.id);
        return known ? { ...entry, name: known.name } : entry;
      });
  }, [backendModels]);

  const selectedInFree = freeModels.some((entry) => entry.id === model);
  const selectedInGo = goModels.some((entry) => entry.id === model);
  const missingSelected =
    !selectedInFree && !selectedInGo
      ? {
          id: model,
          name: toFriendlyName(model) || model,
          supportsThinking: false,
          cost: isOpenCodeGoModel(model) ? 'Go plan' : 'Free',
        }
      : null;
  const missingFree = missingSelected && !isOpenCodeGoModel(missingSelected.id) ? missingSelected : null;
  const missingGo = missingSelected && isOpenCodeGoModel(missingSelected.id) ? missingSelected : null;

  return (
    <div className="rounded-xl border border-border bg-card/60 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {'// research model'}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Runs the Orchestrator chat and every Search Sub-Agent in this Deep Research Run.
          </p>
        </div>

        <Select value={model} onValueChange={setModel}>
          <SelectTrigger
            id="research-model"
            className="h-9 w-full rounded-md border-border bg-background font-mono text-[11px] sm:w-[320px]"
          >
            <SelectValue placeholder="Select a research model" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel className="pl-2 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                Free — Bricks Gateway
              </SelectLabel>
              {missingFree && (
                <SelectItem value={missingFree.id}>
                  <span className="flex items-center gap-1.5">{missingFree.name}</span>
                </SelectItem>
              )}
              {freeModels.map((entry) => (
                <SelectItem key={entry.id} value={entry.id}>
                  <span className="flex items-center gap-1.5">{entry.name}</span>
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel className="pl-2 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                OpenCode Go — Paid
              </SelectLabel>
              {missingGo && (
                <SelectItem value={missingGo.id}>
                  <span className="flex flex-wrap items-center gap-1.5">{missingGo.name}</span>
                </SelectItem>
              )}
              {goModels.map((entry) => (
                <SelectItem key={entry.id} value={entry.id} disabled={configured === false}>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span>{entry.name}</span>
                    <GoLabels labels={entry.labels} />
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {goLoading && (
        <p className="mt-2 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
          <Refresh className="animate-spin text-[11px]" />
          Loading OpenCode Go models…
        </p>
      )}
      {!goLoading && configured === false && (
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          Set <code className="font-mono text-[10px]">OPENCODE_GO_API_KEY</code> on the backend to
          enable paid models.
        </p>
      )}
    </div>
  );
};
