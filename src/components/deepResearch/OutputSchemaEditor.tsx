import { useEffect, useState } from 'react';
import { Plus, Sparks, WarningCircle, Xmark } from 'iconoir-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  useDeepResearchStore,
  validateOutputSchema,
} from '@/stores/useDeepResearchStore';
import type { OutputSchemaField } from '@/lib/deepResearch/types';

interface SchemaFieldRowProps {
  field: OutputSchemaField;
  isIdentity: boolean;
}

const SchemaFieldRow = ({ field, isIdentity }: SchemaFieldRowProps) => {
  const renameOutputSchemaField = useDeepResearchStore((s) => s.renameOutputSchemaField);
  const setOutputSchemaFieldDescription = useDeepResearchStore(
    (s) => s.setOutputSchemaFieldDescription
  );
  const toggleIdentityColumn = useDeepResearchStore((s) => s.toggleIdentityColumn);
  const removeOutputSchemaField = useDeepResearchStore((s) => s.removeOutputSchemaField);
  const [nameDraft, setNameDraft] = useState(field.name);

  useEffect(() => {
    setNameDraft(field.name);
  }, [field.name]);

  const commitName = () => {
    if (nameDraft.trim() === field.name) {
      setNameDraft(field.name);
      return;
    }
    const appliedName = renameOutputSchemaField(field.name, nameDraft);
    setNameDraft(appliedName);
  };

  return (
    <tr className="border-b border-border/60 transition-colors last:border-b-0 hover:bg-accent/30">
      <td className="px-2 py-1.5">
        <Input
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.currentTarget.blur();
            }
            if (e.key === 'Escape') {
              setNameDraft(field.name);
              e.currentTarget.blur();
            }
          }}
          className="h-7 border-border bg-background font-mono text-[11px]"
          aria-label={`Name of field ${field.name}`}
        />
      </td>
      <td className="px-2 py-1.5">
        <Input
          value={field.description}
          onChange={(e) => setOutputSchemaFieldDescription(field.name, e.target.value)}
          placeholder="What this field holds"
          className="h-7 border-border bg-background text-[11px]"
          aria-label={`Description of field ${field.name}`}
        />
      </td>
      <td className="px-2 py-1.5">
        <div className="flex items-center gap-1.5">
          <Checkbox
            checked={isIdentity}
            onCheckedChange={() => toggleIdentityColumn(field.name)}
            aria-label={`Mark ${field.name} as part of the unique key`}
          />
          {isIdentity && (
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-primary">
              ID
            </span>
          )}
        </div>
      </td>
      <td className="px-2 py-1.5 text-right">
        <button
          type="button"
          onClick={() => removeOutputSchemaField(field.name)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
          aria-label={`Remove field ${field.name}`}
        >
          <Xmark className="text-[13px]" />
        </button>
      </td>
    </tr>
  );
};

interface OutputSchemaEditorProps {
  onApproveAndStart: () => void;
}

export const OutputSchemaEditor = ({ onApproveAndStart }: OutputSchemaEditorProps) => {
  const outputSchema = useDeepResearchStore((s) => s.outputSchema);
  const addOutputSchemaField = useDeepResearchStore((s) => s.addOutputSchemaField);
  const [showSamples, setShowSamples] = useState(false);

  if (!outputSchema) return null;

  const validationError = validateOutputSchema(outputSchema);
  const identityCount = outputSchema.identityColumns.length;

  return (
    <div className="brick-animate-in overflow-hidden rounded-xl border border-primary/25 bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-primary">
            Output Schema
          </p>
          <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
            {outputSchema.fields.length} fields · {identityCount} unique key
            {identityCount === 1 ? '' : 's'}
          </span>
        </div>
        {outputSchema.sampleRows.length > 0 && (
          <button
            type="button"
            onClick={() => setShowSamples((v) => !v)}
            className="shrink-0 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
          >
            Sample rows {showSamples ? '▾' : '▸'}
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-muted/40 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
              <th className="w-[30%] px-2 py-1.5 font-medium">Field name</th>
              <th className="px-2 py-1.5 font-medium">Description</th>
              <th className="w-[110px] px-2 py-1.5 font-medium">Unique key</th>
              <th className="w-10 px-2 py-1.5 font-medium" />
            </tr>
          </thead>
          <tbody>
            {outputSchema.fields.length > 0 ? (
              outputSchema.fields.map((field) => (
                <SchemaFieldRow
                  key={field.name}
                  field={field}
                  isIdentity={outputSchema.identityColumns.includes(field.name)}
                />
              ))
            ) : (
              <tr>
                <td
                  colSpan={4}
                  className="px-2 py-3 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
                >
                  no fields yet — add one below
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showSamples && outputSchema.sampleRows.length > 0 && (
        <div className="border-t border-border/60 px-2 py-2">
          <div className="overflow-x-auto rounded border border-border/70">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {outputSchema.fields.map((field) => (
                    <th
                      key={field.name}
                      className="whitespace-nowrap px-2 py-1.5 font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
                    >
                      {field.name}
                      {outputSchema.identityColumns.includes(field.name) && (
                        <span className="ml-1 text-primary">·ID</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {outputSchema.sampleRows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-border/60 last:border-b-0">
                    {outputSchema.fields.map((field) => (
                      <td
                        key={field.name}
                        className="whitespace-nowrap px-2 py-1 font-mono text-[10px] text-muted-foreground"
                      >
                        {row[field.name] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={addOutputSchemaField}
            className="h-8 gap-1.5 rounded-md border-border font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:border-primary/60 hover:text-foreground"
          >
            <Plus className="text-[13px]" />
            Add field
          </Button>
          <Button
            size="sm"
            onClick={onApproveAndStart}
            disabled={!!validationError}
            className="h-8 gap-1.5 rounded-md border border-primary bg-primary font-mono text-[10px] uppercase tracking-[0.14em] text-primary-foreground hover:border-primary-glow hover:bg-primary-glow"
          >
            <Sparks className="text-[13px]" />
            Approve &amp; start research
          </Button>
        </div>
        {validationError && (
          <p className="flex items-center gap-1.5 font-mono text-[10px] text-destructive">
            <WarningCircle className="text-[12px]" />
            {validationError}
          </p>
        )}
      </div>
    </div>
  );
};
