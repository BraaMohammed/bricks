import { useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { CSVUploader } from '@/components/CSVUploader';
import { DataTable } from '@/components/DataTable';
import { FormulaEditor } from '@/components/FormulaEditor';
import { useDataStore } from '@/stores/useDataStore';

const Index = () => {
  const { headers, setActiveColumn, activeColumn } = useDataStore();
  const [formulaEditorOpen, setFormulaEditorOpen] = useState(false);

  const handleEditFormula = (column: string) => {
    setActiveColumn(column);
    setFormulaEditorOpen(true);
  };

  const handleFormulaEditorClose = (open: boolean) => {
    setFormulaEditorOpen(open);
    if (!open) {
      setActiveColumn(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <AppHeader />
      
      <main className="container mx-auto px-6 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {headers.length === 0 ? (
            <div className="max-w-2xl mx-auto space-y-8">
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-bold tracking-tight">
                  Transform Your Data with Code
                </h2>
                <p className="text-lg text-muted-foreground">
                  Upload a CSV file and use JavaScript formulas to enrich, transform, and enhance your data.
                </p>
              </div>
              
              <CSVUploader />
              
              <div className="text-center space-y-4">
                <h3 className="text-xl font-semibold">How it works</h3>
                <div className="grid md:grid-cols-3 gap-6 text-sm">
                  <div className="space-y-2">
                    <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-bold mx-auto">
                      1
                    </div>
                    <p className="font-medium">Upload CSV</p>
                    <p className="text-muted-foreground">Drag and drop your CSV file to get started</p>
                  </div>
                  <div className="space-y-2">
                    <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-bold mx-auto">
                      2
                    </div>
                    <p className="font-medium">Write Formulas</p>
                    <p className="text-muted-foreground">Add JavaScript formulas to transform columns</p>
                  </div>
                  <div className="space-y-2">
                    <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-bold mx-auto">
                      3
                    </div>
                    <p className="font-medium">Execute & Export</p>
                    <p className="text-muted-foreground">Run formulas and export enriched data</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Data Overview</h2>
                  <p className="text-muted-foreground">
                    Click the settings icon on any column to add formulas, then run them to enrich your data.
                  </p>
                </div>
              </div>
              
              <DataTable onEditFormula={handleEditFormula} />
            </div>
          )}
        </div>
      </main>

      <FormulaEditor 
        open={formulaEditorOpen}
        onOpenChange={handleFormulaEditorClose}
      />
    </div>
  );
};

export default Index;
