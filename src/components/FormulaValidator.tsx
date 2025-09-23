import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface FormulaValidatorProps {
  formula: string;
  availableColumns: string[];
}

export const validateFormula = (formula: string, availableColumns: string[]): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!formula.trim()) {
    return { isValid: true, errors, warnings };
  }

  // Check for basic syntax issues
  try {
    new Function('row', formula);
  } catch (error) {
    errors.push(`Syntax error: ${error instanceof Error ? error.message : 'Invalid JavaScript'}`);
  }

  // Check for return statement
  if (!formula.includes('return') && !formula.includes('=>')) {
    warnings.push('Formula should include a return statement or use arrow function syntax');
  }

  // Check for referenced columns that don't exist
  const columnReferences = formula.match(/rows\[['"]([^'"]+)['"]\]/g);
  if (columnReferences) {
    const referencedColumns = columnReferences.map(ref => {
      const match = ref.match(/rows\[['"]([^'"]+)['"]\]/);
      return match ? match[1] : '';
    }).filter(col => col);
    
    const invalidColumns = referencedColumns.filter(col => !availableColumns.includes(col));
    
    if (invalidColumns.length > 0) {
      warnings.push(`Referenced columns don't exist: ${invalidColumns.join(', ')}`);
    }
  }

  // Check for old dot notation and suggest bracket notation
  const dotNotationReferences = formula.match(/rows\.(\w+)/g);
  if (dotNotationReferences) {
    warnings.push(`Use bracket notation instead of dot notation. Example: rows['Column Name'] instead of rows.columnName`);
  }

  // Check for potentially dangerous functions - DISABLED FOR PUPPETEER MODE
  // const dangerousPatterns = [
  //   'eval(',
  //   'Function(',
  //   'setTimeout(',
  //   'setInterval(',
  //   'document.',
  //   'window.',
  //   'localStorage.',
  //   'sessionStorage.'
  // ];

  // dangerousPatterns.forEach(pattern => {
  //   if (formula.includes(pattern)) {
  //     warnings.push(`Potentially unsafe: ${pattern} detected`);
  //   }
  // });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

export const FormulaValidator = ({ formula, availableColumns }: FormulaValidatorProps) => {
  const validation = validateFormula(formula, availableColumns);

  if (!formula.trim()) {
    return null;
  }

  return (
    <div className="space-y-2">
      {validation.isValid && validation.warnings.length === 0 && (
        <Alert className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-emerald-800 dark:text-emerald-200">
            Formula looks good!
          </AlertDescription>
        </Alert>
      )}

      {validation.errors.map((error, index) => (
        <Alert key={`error-${index}`} variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ))}

      {validation.warnings.map((warning, index) => (
        <Alert key={`warning-${index}`} className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
          <Info className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            {warning}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
};