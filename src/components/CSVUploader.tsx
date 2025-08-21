import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
    <Card 
      {...getRootProps()} 
      className={`
        p-8 border-2 border-dashed cursor-pointer transition-all duration-200
        ${isDragActive 
          ? 'border-primary bg-primary/5 shadow-glow' 
          : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
        }
      `}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-4 text-center">
        <div className={`
          p-4 rounded-full transition-colors duration-200
          ${isDragActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
        `}>
          {isDragActive ? (
            <FileSpreadsheet className="h-8 w-8" />
          ) : (
            <Upload className="h-8 w-8" />
          )}
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">
            {isDragActive ? 'Drop your CSV file here' : 'Upload CSV Data'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isDragActive 
              ? 'Release to load your data' 
              : 'Drag & drop a CSV file here, or click to select'
            }
          </p>
        </div>
        
        {!isDragActive && (
          <Button variant="outline" className="mt-2">
            <Upload className="h-4 w-4 mr-2" />
            Choose File
          </Button>
        )}
      </div>
    </Card>
  );
};