import { useEffect, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSearchProviders } from '@/hooks/useSearchProviders';
import {
  useDeepResearchStore,
  type DeepResearchSearchProvider,
} from '@/stores/useDeepResearchStore';

const FALLBACK_PROVIDER_LABELS: Record<
  Exclude<DeepResearchSearchProvider, 'bricks'>,
  string
> = {
  exa: 'Exa',
  firecrawl: 'Firecrawl',
  parallel: 'Parallel',
};

const PROVIDER_ENV_KEYS: Record<
  Exclude<DeepResearchSearchProvider, 'bricks'>,
  string
> = {
  exa: 'EXA_API_KEY',
  firecrawl: 'FIRECRAWL_KEY',
  parallel: 'PARALLEL_API_KEY',
};

const triggerClass =
  'flex h-9 w-44 items-center justify-between gap-1.5 rounded-md border border-border bg-background px-3 font-mono text-[11px] outline-none transition-colors hover:border-primary/60 focus-visible:border-primary/60 data-[state=open]:border-primary/60';

const labelClass =
  'px-2 py-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground';

export const SearchProviderSelector = () => {
  const searchProvider = useDeepResearchStore((s) => s.searchProvider);
  const setSearchProvider = useDeepResearchStore((s) => s.setSearchProvider);
  const setProviderLevel = useDeepResearchStore((s) => s.setProviderLevel);
  const providerLevel = useDeepResearchStore((s) => s.providerLevel);
  const { providers, loaded } = useSearchProviders();
  const [open, setOpen] = useState(false);

  const selectedStatus =
    searchProvider !== 'bricks'
      ? providers.find((provider) => provider.id === searchProvider) ?? null
      : null;
  const selectedLabel =
    searchProvider === 'bricks'
      ? 'Bricks (local)'
      : selectedStatus?.label ?? FALLBACK_PROVIDER_LABELS[searchProvider];
  const selectedLevelId =
    searchProvider !== 'bricks' ? providerLevel[searchProvider] : undefined;
  const selectedLevel = selectedStatus?.levels.find(
    (level) => level.id === selectedLevelId
  );

  useEffect(() => {
    if (!loaded || searchProvider === 'bricks') return;
    if (providerLevel[searchProvider]) return;
    const status = providers.find((provider) => provider.id === searchProvider);
    if (!status || status.levels.length === 0) return;
    setProviderLevel(searchProvider, status.levels[0].id);
  }, [loaded, providers, searchProvider, providerLevel, setProviderLevel]);

  const selectProvider = (providerId: DeepResearchSearchProvider) => {
    setSearchProvider(providerId);
    if (providerId !== 'bricks' && !providerLevel[providerId]) {
      const status = providers.find((provider) => provider.id === providerId);
      if (status && status.levels.length > 0) {
        setProviderLevel(providerId, status.levels[0].id);
      }
    }
    setOpen(false);
  };

  const selectLevel = (
    providerId: Exclude<DeepResearchSearchProvider, 'bricks'>,
    levelId: string
  ) => {
    setSearchProvider(providerId);
    setProviderLevel(providerId, levelId);
    setOpen(false);
  };

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger id="search-provider" aria-label="Search provider" className={triggerClass}>
          <span className="block truncate">
            {selectedLabel}
            {selectedLevel && (
              <span className="text-muted-foreground"> · {selectedLevel.label}</span>
            )}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[210px] font-mono text-[11px]">
          <DropdownMenuLabel className={labelClass}>Search provider</DropdownMenuLabel>

          <DropdownMenuItem
            onSelect={() => selectProvider('bricks')}
            className="justify-between"
          >
            Bricks (local)
            {searchProvider === 'bricks' && <Check className="h-3.5 w-3.5 text-primary" />}
          </DropdownMenuItem>

          {!loaded && (
            <p className="px-2 py-1.5 font-mono text-[10px] text-muted-foreground/70">
              Loading search providers…
            </p>
          )}

          {providers.map((provider) => (
            <DropdownMenuSub key={provider.id}>
              <DropdownMenuSubTrigger
                disabled={!provider.configured}
                onClick={() => selectProvider(provider.id)}
                className="justify-between"
              >
                <span className="flex items-center gap-1.5">
                  {provider.label}
                  {!provider.configured && (
                    <span className="rounded-full border border-border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground">
                      No key
                    </span>
                  )}
                </span>
                {searchProvider === provider.id && (
                  <Check className="h-3.5 w-3.5 text-primary" />
                )}
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="min-w-[260px] font-mono text-[10px]">
                  <DropdownMenuLabel className={labelClass}>
                    Reasoning level — {provider.label}
                  </DropdownMenuLabel>
                  {provider.levels.map((level) => (
                    <DropdownMenuItem
                      key={level.id}
                      onSelect={() => selectLevel(provider.id, level.id)}
                      className="justify-between gap-3"
                    >
                      <span className="truncate">
                        {level.label} · {level.timeLabel} · {level.priceLabel}
                      </span>
                      {searchProvider === provider.id &&
                        providerLevel[provider.id] === level.id && (
                          <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                        )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {searchProvider !== 'bricks' && selectedStatus && !selectedStatus.configured && (
        <p className="w-44 font-mono text-[9px] leading-snug text-muted-foreground/70">
          Set <code className="font-mono">{PROVIDER_ENV_KEYS[searchProvider]}</code> in
          api/bricks-api/.env.local
        </p>
      )}
    </div>
  );
};
