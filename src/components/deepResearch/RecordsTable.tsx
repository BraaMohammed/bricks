import { useDeepResearchStore } from '@/stores/useDeepResearchStore';

export const RecordsTable = () => {
  const records = useDeepResearchStore((s) => s.records);
  const outputSchema = useDeepResearchStore((s) => s.outputSchema);
  const totalRecords = useDeepResearchStore((s) => s.totalRecords);
  const phase = useDeepResearchStore((s) => s.phase);

  const fieldNames = (outputSchema?.fields ?? [])
    .map((field) => field.name.trim())
    .filter((name) => name.length > 0);
  const identityColumns = new Set(outputSchema?.identityColumns ?? []);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-primary">
          {'// records'}
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {phase === 'researching' ? (
            <span className="animate-pulse">{records.length} streaming…</span>
          ) : (
            <>
              {records.length} row{records.length === 1 ? '' : 's'}
              {totalRecords !== null && records.length !== totalRecords && (
                <span className="text-muted-foreground/60">
                  {' '}
                  · {totalRecords} total
                </span>
              )}
            </>
          )}
        </p>
      </div>

      {fieldNames.length === 0 || records.length === 0 ? (
        <p className="px-5 py-4 font-mono text-[11px] text-muted-foreground">
          {phase === 'researching'
            ? 'waiting for the Table Builder to deliver records…'
            : phase === 'results_review'
            ? 'no records were produced by this Deep Research Run.'
            : phase === 'failed'
            ? 'no records were collected before the Deep Research Run failed.'
            : 'records will appear here as the Table Builder assembles them.'}
        </p>
      ) : (
        <>
          <div className="max-h-[46vh] overflow-auto">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-muted/95 backdrop-blur-sm font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  <th className="w-10 border-b border-border px-3 py-2.5 text-left font-medium text-muted-foreground/60">
                    #
                  </th>
                  {fieldNames.map((name) => (
                    <th
                      key={name}
                      className="whitespace-nowrap border-b border-border px-3 py-2.5 text-left font-medium"
                    >
                      {name}
                      {identityColumns.has(name) && (
                        <span className="ml-1 text-primary/70">(id)</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((record, index) => (
                  <tr
                    key={index}
                    className="border-b border-border/50 transition-colors last:border-b-0 hover:bg-accent/30"
                  >
                    <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground/50">
                      {String(index + 1).padStart(3, '0')}
                    </td>
                    {fieldNames.map((name) => (
                      <td
                        key={name}
                        className="max-w-[260px] truncate px-3 py-2 text-xs text-foreground"
                        title={record[name] ?? ''}
                      >
                        {record[name] ?? ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <span>
              {records.length} row{records.length === 1 ? '' : 's'} · {fieldNames.length}{' '}
              field{fieldNames.length === 1 ? '' : 's'}
            </span>
            <span className="hidden sm:inline">
              deduplicated on{' '}
              {identityColumns.size > 0
                ? `${identityColumns.size} Identity Column${identityColumns.size === 1 ? '' : 's'}`
                : 'full records'}
            </span>
          </div>
        </>
      )}
    </div>
  );
};
