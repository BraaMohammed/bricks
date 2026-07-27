import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { Upload, Table } from 'iconoir-react';
import { useDataStore } from '@/stores/useDataStore';
import { toast } from '@/hooks/use-toast';

interface CSVUploaderProps {
  onDataLoaded?: () => void;
}

export const CSVUploader = ({ onDataLoaded }: CSVUploaderProps) => {
  const { setData, clearData } = useDataStore();

  const processCSV = useCallback((file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          toast({
            title: "CSV Parse Error",
            description: "There were errors parsing your CSV file.",
            variant: "destructive",
          });
          return;
        }

        const headers = results.meta.fields || [];
        const rows = results.data as Record<string, string>[];

        if (headers.length === 0) {
          toast({
            title: "No Headers Found",
            description: "Your CSV file doesn't appear to have headers.",
            variant: "destructive",
          });
          return;
        }

        // Clear existing data first
        clearData();

        // Set new data
        setData(headers, rows);

        toast({
          title: "CSV Loaded Successfully",
          description: `Loaded ${rows.length} rows with ${headers.length} columns.`,
        });

        onDataLoaded?.();
      },
      error: (error) => {
        toast({
          title: "File Error",
          description: `Error reading file: ${error.message}`,
          variant: "destructive",
        });
      },
    });
  }, [setData, clearData, onDataLoaded]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      processCSV(file);
    }
  }, [processCSV]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
      'text/plain': ['.csv'],
    },
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={`
        group relative cursor-pointer rounded-xl border border-dashed bg-card/60 p-12 text-center
        transition-all duration-300
        ${isDragActive
          ? 'border-primary bg-primary/[0.06] shadow-glow'
          : 'border-border hover:border-primary/70 hover:bg-primary/[0.04]'
        }
      `}
    >
      <input {...getInputProps()} />
      <div
        className={`
          mx-auto flex h-14 w-14 items-center justify-center rounded-xl border transition-all duration-300
          ${isDragActive
            ? 'border-primary bg-primary text-primary-foreground scale-110'
            : 'border-primary/30 bg-primary/10 text-primary group-hover:-translate-y-1'
          }
        `}
      >
        {isDragActive ? (
          <Table className="text-[24px]" />
        ) : (
          <Upload className="text-[24px]" />
        )}
      </div>

      <h3 className="mt-6 font-display text-xl font-bold uppercase tracking-tight">
        {isDragActive ? 'Drop it. Build the grid.' : 'Drop your CSV'}
      </h3>
      <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {isDragActive
          ? 'release to load your data'
          : 'or click to browse — parsed locally, never uploaded'
        }
      </p>

      {!isDragActive && (
        <div className="mt-8 flex items-center justify-center">
          <span className="inline-flex h-10 items-center gap-2 rounded-md border border-primary bg-primary px-6 font-mono text-[10px] uppercase tracking-[0.16em] text-primary-foreground transition-colors group-hover:bg-primary-glow group-hover:border-primary-glow">
            <Upload className="text-[14px]" />
            Browse files
          </span>
        </div>
      )}
    </div>
  );
};
