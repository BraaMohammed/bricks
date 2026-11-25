import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDeepResearchStore } from '@/stores/useDeepResearchStore';

const MAX_SEARCHES_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];

export const MaxSearchesSelector = () => {
  const maxSearches = useDeepResearchStore((s) => s.maxSearches);
  const setMaxSearches = useDeepResearchStore((s) => s.setMaxSearches);

  return (
    <Select
      value={String(maxSearches)}
      onValueChange={(value) => setMaxSearches(Number.parseInt(value, 10))}
    >
      <SelectTrigger
        id="max-searches"
        aria-label="Max searches"
        className="h-9 w-[110px] shrink-0 rounded-md border-border bg-background font-mono text-[11px]"
      >
        <SelectValue>
          <span className="block truncate">{`≤ ${maxSearches} searches`}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel className="pl-2 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
            Max searches
          </SelectLabel>
          {MAX_SEARCHES_OPTIONS.map((count) => (
            <SelectItem key={count} value={String(count)}>
              <span className="font-mono text-[11px]">{count}</span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};
