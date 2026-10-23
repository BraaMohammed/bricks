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
      <td className="px-3 py-2.5">
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
          className="h-8 border-border bg-background font-mono text-xs"
          aria-label={`Name of field ${field.name}`}
        />
      </td>
      <td className="px-3 py-2.5">
        <Input
          value={field.description}
          onChange={(e) => setOutputSchemaFieldDescription(field.name, e.target.value)}
          placeholder="What this field holds"
          className="h-8 border-border bg-background text-xs"
          aria-label={`Description of field ${field.name}`}
        />
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={isIdentity}
            onCheckedChange={() => toggleIdentityColumn(field.name)}
            aria-label={`Mark ${field.name} as an Identity Column`}
          />
          {isIdentity && (
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-primary">
              ID
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-2.5 text-right">
        <button
          type="button"
          onClick={() => removeOutputSchemaField(field.name)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
          aria-label={`Remove field ${field.name}`}
        >
          <Xmark className="text-[14px]" />
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

  if (!outputSchema) return null;

  const validationError = validateOutputSchema(outputSchema);
  const identityCount = outputSchema.identityColumns.length;

  return (
    <div className="brick-animate-in mt-8 overflow-hidden rounded-xl border border-primary/25 bg-card">
      <div className="border-b border-border p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-primary">
            {'// output schema — proposed by the orchestrator'}
          </p>
          <span className="rounded-md border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {outputSchema.fields.length} fields · {identityCount} identity
          </span>
        </div>
        <h3 className="mt-2 font-display text-xl font-bold uppercase tracking-tight">
          Output Schema
        </h3>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          The shape of every Record in your table. Edit fields, mark the Identity Columns the
          Table Builder deduplicates on, then approve to start the Deep Research Run.
        </p>
      </div>

      <div className="p-5">
        <div className="overflow-x-auto rounded-lg border border-border/70">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-muted/40 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <th className="w-[30%] px-3 py-2.5 font-medium">Field name</th>
                <th className="px-3 py-2.5 font-medium">Description</th>
                <th className="w-[130px] px-3 py-2.5 font-medium">Identity Column</th>
                <th className="w-12 px-3 py-2.5 font-medium" />
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
                    className="px-3 py-4 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
                  >
                    no fields yet — add one below
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={addOutputSchemaField}
            className="gap-2 rounded-md border-border font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:border-primary/60 hover:text-foreground"
          >
            <Plus className="text-[14px]" />
            Add field
          </Button>
          <p className="text-xs text-muted-foreground">
            Identity Columns identify a Record across Research Sources.
          </p>
        </div>

        <div className="mt-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {'// example (fake) rows — shape only, never real records'}
          </p>
          {outputSchema.sampleRows.length > 0 ? (
            <div className="mt-2 overflow-x-auto rounded-lg border border-border/70">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {outputSchema.fields.map((field) => (
                      <th
                        key={field.name}
                        className="whitespace-nowrap px-3 py-2 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
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
                    <tr
                      key={rowIndex}
                      className="border-b border-border/60 last:border-b-0"
                    >
                      {outputSchema.fields.map((field) => (
                        <td
                          key={field.name}
                          className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-muted-foreground"
                        >
                          {row[field.name] ?? '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-2 font-mono text-[11px] text-muted-foreground">
              The Orchestrator did not attach sample rows.
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Button
            onClick={onApproveAndStart}
            disabled={!!validationError}
            className="gap-2 rounded-md border border-primary bg-primary font-mono text-[10px] uppercase tracking-[0.14em] text-primary-foreground hover:border-primary-glow hover:bg-primary-glow"
          >
            <Sparks className="text-[14px]" />
            Approve &amp; start research
          </Button>
          <span className="text-xs leading-relaxed text-muted-foreground">
            or keep chatting below to refine the goal — the Orchestrator will re-propose the
            schema.
          </span>
        </div>

        {validationError && (
          <p className="mt-3 flex items-center gap-1.5 font-mono text-[10px] text-destructive">
            <WarningCircle className="text-[13px]" />
            {validationError}
          </p>
        )}
      </div>
    </div>
  );
};
