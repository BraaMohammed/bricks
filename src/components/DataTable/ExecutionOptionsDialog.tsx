import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Play, X, AlertTriangle, Hash, ArrowRight, Filter } from 'lucide-react';
import { DEFAULT_ERROR_KEYWORDS } from '@/lib/utils/errorDetector';
import type { ExecutionOptions } from '@/hooks/useFormulaExecution';

interface ExecutionOptionsDialogProps {
  open: boolean;
  column: string;
  totalRows: number;
  /** All column headers available in the table (used for column-filter mode) */
  headers: string[];
  onClose: () => void;
  onConfirm: (options: ExecutionOptions) => void;
}

type RunMode = 'all' | 'first-x' | 'range' | 'errors-only' | 'column-filter';
type FilterMatchMode = 'equals' | 'contains' | 'not-equals' | 'not-contains';

const MODE_LABELS: Record<RunMode, string> = {
  all: 'All Rows',
  'first-x': 'First X Rows',
  range: 'Row Range (X → Y)',
  'errors-only': 'Errors Only',
  'column-filter': 'Column Filter',
};

const MODE_ICONS: Record<RunMode, React.ReactNode> = {
  all: <Play className="h-4 w-4" />,
  'first-x': <Hash className="h-4 w-4" />,
  range: <ArrowRight className="h-4 w-4" />,
  'errors-only': <AlertTriangle className="h-4 w-4" />,
  'column-filter': <Filter className="h-4 w-4" />,
};

const MATCH_MODE_LABELS: Record<FilterMatchMode, string> = {
  equals: 'equals (exact)',
  contains: 'contains',
  'not-equals': 'does not equal',
  'not-contains': 'does not contain',
};

export const ExecutionOptionsDialog = ({
  open,
  column,
  totalRows,
  headers,
  onClose,
  onConfirm,
}: ExecutionOptionsDialogProps) => {
  const [mode, setMode] = useState<RunMode>('all');

  // first-x
  const [firstX, setFirstX] = useState<string>('10');

  // range
  const [fromRow, setFromRow] = useState<string>('1');
  const [toRow, setToRow] = useState<string>(String(totalRows));

  // errors-only
  const [keywords, setKeywords] = useState<string[]>([...DEFAULT_ERROR_KEYWORDS]);
  const [newKeyword, setNewKeyword] = useState('');

  // column-filter — other columns (exclude the column being executed)
  const otherColumns = headers.filter((h) => h !== column);
  const [filterColumn, setFilterColumn] = useState<string>(otherColumns[0] ?? '');
  const [filterValue, setFilterValue] = useState<string>('');
  const [filterMatchMode, setFilterMatchMode] = useState<FilterMatchMode>('equals');

  // ── keyword helpers ────────────────────────────────────────────────────────
  const addKeyword = () => {
    const trimmed = newKeyword.trim().toLowerCase();
    if (trimmed && !keywords.includes(trimmed)) setKeywords((p) => [...p, trimmed]);
    setNewKeyword('');
  };
  const removeKeyword = (kw: string) => setKeywords((p) => p.filter((k) => k !== kw));

  // ── confirm ────────────────────────────────────────────────────────────────
  const handleConfirm = () => {
    const options: ExecutionOptions = { mode };

    if (mode === 'first-x') {
      const x = parseInt(firstX, 10);
      options.firstX = Number.isNaN(x) || x < 1 ? 1 : Math.min(x, totalRows);
    }
    if (mode === 'range') {
      const from = parseInt(fromRow, 10);
      const to = parseInt(toRow, 10);
      options.fromRow = Number.isNaN(from) || from < 1 ? 1 : from;
      options.toRow = Number.isNaN(to) || to > totalRows ? totalRows : to;
    }
    if (mode === 'errors-only') {
      options.errorKeywords = keywords;
    }
    if (mode === 'column-filter') {
      options.filterColumn = filterColumn;
      options.filterValue = filterValue;
      options.filterMatchMode = filterMatchMode;
    }

    onConfirm(options);
    onClose();
  };

  // ── summary ────────────────────────────────────────────────────────────────
  const getSummary = (): string => {
    if (mode === 'all') return `All ${totalRows} rows`;
    if (mode === 'first-x') {
      const x = Math.min(parseInt(firstX, 10) || 1, totalRows);
      return `First ${x} rows (rows 1–${x})`;
    }
    if (mode === 'range') {
      const from = parseInt(fromRow, 10) || 1;
      const to = Math.min(parseInt(toRow, 10) || totalRows, totalRows);
      return `Rows ${from}–${to} (${Math.max(0, to - from + 1)} rows)`;
    }
    if (mode === 'errors-only') {
      return `Cells whose content contains any of the ${keywords.length} error keywords`;
    }
    if (mode === 'column-filter') {
      if (!filterColumn) return 'Select a column to filter by';
      const matchLabel = MATCH_MODE_LABELS[filterMatchMode];
      return `Rows where "${filterColumn}" ${matchLabel} "${filterValue || '…'}"`;
    }
    return '';
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-4 w-4 text-primary" />
            Execute Formula
          </DialogTitle>
          <DialogDescription>
            Column: <span className="font-mono font-medium text-foreground">{column}</span> ·{' '}
            {totalRows} rows total
          </DialogDescription>
        </DialogHeader>

        {/* ── Mode selector ── */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Run mode</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(Object.keys(MODE_LABELS) as RunMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                  mode === m
                    ? 'border-primary bg-primary/10 text-primary shadow-sm'
                    : 'border-border bg-muted/30 text-muted-foreground hover:border-border/80 hover:bg-muted/60 hover:text-foreground'
                }`}
              >
                {MODE_ICONS[m]}
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        {/* ── Mode-specific inputs ── */}

        {mode === 'first-x' && (
          <div className="space-y-2">
            <Label htmlFor="first-x-input">Number of rows (from the top)</Label>
            <Input
              id="first-x-input"
              type="number"
              min={1}
              max={totalRows}
              value={firstX}
              onChange={(e) => setFirstX(e.target.value)}
              placeholder={`1 – ${totalRows}`}
            />
          </div>
        )}

        {mode === 'range' && (
          <div className="flex items-center gap-3">
            <div className="flex-1 space-y-2">
              <Label htmlFor="from-row-input">From row</Label>
              <Input
                id="from-row-input"
                type="number"
                min={1}
                max={totalRows}
                value={fromRow}
                onChange={(e) => setFromRow(e.target.value)}
                placeholder="1"
              />
            </div>
            <ArrowRight className="mt-6 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="flex-1 space-y-2">
              <Label htmlFor="to-row-input">To row</Label>
              <Input
                id="to-row-input"
                type="number"
                min={1}
                max={totalRows}
                value={toRow}
                onChange={(e) => setToRow(e.target.value)}
                placeholder={String(totalRows)}
              />
            </div>
          </div>
        )}

        {mode === 'errors-only' && (
          <div className="space-y-3">
            <Label>Error keywords (substring match, case-insensitive)</Label>
            <p className="text-xs text-muted-foreground">
              A cell is flagged if its content <strong>contains</strong> any of these words — even
              surrounded by other text. Empty cells are always included.
            </p>
            <div className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-muted/20 p-2 min-h-[60px]">
              {keywords.map((kw) => (
                <Badge key={kw} variant="secondary" className="flex items-center gap-1 pl-2 pr-1 py-0.5">
                  {kw}
                  <button
                    onClick={() => removeKeyword(kw)}
                    className="ml-0.5 rounded hover:text-destructive transition-colors"
                    aria-label={`Remove "${kw}"`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                placeholder="Add keyword…"
                className="h-8 text-sm"
              />
              <Button size="sm" variant="outline" onClick={addKeyword} disabled={!newKeyword.trim()}>
                Add
              </Button>
            </div>
          </div>
        )}

        {mode === 'column-filter' && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Only run this formula for rows where another column matches a specific value.{' '}
              <span className="text-foreground font-medium">
                Example: only rows where "AI Qualified" equals "yes"
              </span>
            </p>

            {/* Column selector */}
            <div className="space-y-2">
              <Label>Filter column</Label>
              {otherColumns.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  No other columns available. Add more columns first.
                </p>
              ) : (
                <Select
                  value={filterColumn}
                  onValueChange={setFilterColumn}
                >
                  <SelectTrigger id="filter-column-select">
                    <SelectValue placeholder="Select a column…" />
                  </SelectTrigger>
                  <SelectContent>
                    {otherColumns.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Match mode */}
            <div className="space-y-2">
              <Label>Match mode</Label>
              <Select
                value={filterMatchMode}
                onValueChange={(v) => setFilterMatchMode(v as FilterMatchMode)}
              >
                <SelectTrigger id="filter-match-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(MATCH_MODE_LABELS) as [FilterMatchMode, string][]).map(
                    ([val, label]) => (
                      <SelectItem key={val} value={val}>
                        {label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Value input */}
            <div className="space-y-2">
              <Label htmlFor="filter-value-input">
                Value to match{' '}
                <span className="text-muted-foreground font-normal">(case-insensitive)</span>
              </Label>
              <Input
                id="filter-value-input"
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                placeholder={`e.g. yes`}
              />
            </div>
          </div>
        )}

        {/* ── Summary ── */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Will run: </span>
          {getSummary()}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className="gap-2"
            disabled={mode === 'column-filter' && !filterColumn}
          >
            <Play className="h-4 w-4" />
            Execute
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
