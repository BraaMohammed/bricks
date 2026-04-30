import { useState } from 'react';
import { useDataStore } from '@/stores/useDataStore';
import { toast } from '@/hooks/use-toast';
import { runAIAgents } from '@/lib/aiAgents';
import { executeWithRateLimit, getRateLimitConfig } from '@/lib/utils/rateLimiter';
import { getFormulaProvider, getFormulaModel } from '@/lib/utils/formulaParser';
import { isAgentFormula, decodeAgentFormula } from '@/lib/agents/agentFormula';
import { runSearchAgent } from '@/lib/agents/executor';
import { isEmailFinderFormula, decodeEmailFinderFormula } from '@/lib/agents/emailFinderFormula';
import { runEmailFinderAgent } from '@/lib/agents/emailFinderExecutor';
import { cellHasError, DEFAULT_ERROR_KEYWORDS } from '@/lib/utils/errorDetector';

/**
 * Options that control which rows get processed during a column execution.
 */
export interface ExecutionOptions {
  /** 'all'          → process every row (default)
   *  'first-x'     → only the first `firstX` rows
   *  'range'       → rows fromRow..toRow (1-indexed, inclusive)
   *  'errors-only' → rows whose current cell content contains an error keyword
   *  'column-filter'→ rows where another column's value matches a condition
   */
  mode: 'all' | 'first-x' | 'range' | 'errors-only' | 'column-filter';
  /** Used when mode === 'first-x' */
  firstX?: number;
  /** Used when mode === 'range' (1-indexed) */
  fromRow?: number;
  /** Used when mode === 'range' (1-indexed, inclusive) */
  toRow?: number;
  /** Used when mode === 'errors-only'; defaults to DEFAULT_ERROR_KEYWORDS */
  errorKeywords?: string[];
  /** Used when mode === 'column-filter': which column to check */
  filterColumn?: string;
  /** Used when mode === 'column-filter': the value to match */
  filterValue?: string;
  /** Used when mode === 'column-filter': how to compare (default: 'equals') */
  filterMatchMode?: 'equals' | 'contains' | 'not-equals' | 'not-contains';
}

export interface UseFormulaExecutionReturn {
  executingColumn: string | null;
  executingCells: Set<string>;
  executeFormula: (column: string, options?: ExecutionOptions) => Promise<void>;
  executeCellFormula: (rowIndex: number, column: string) => Promise<void>;
  executionProgress: { completed: number; total: number } | null;
}

/**
 * Custom hook for managing formula execution on columns and individual cells
 * Handles parallel execution, error handling, and loading states
 */
export const useFormulaExecution = (): UseFormulaExecutionReturn => {
  const { headers, rows, getFormula, updateCell, setLoading, executeFormulaOnCell } = useDataStore();
  const [executingColumn, setExecutingColumn] = useState<string | null>(null);
  const [executingCells, setExecutingCells] = useState<Set<string>>(new Set());
  const [executionProgress, setExecutionProgress] = useState<{ completed: number; total: number } | null>(null);

  /**
   * Execute formula on all rows in a column
   * Runs all rows in parallel with individual error handling per row
   */
  /**
   * Resolve which row indices to process based on the user's ExecutionOptions.
   * Returns an array of original row indices (into `rows`) to execute.
   */
  const resolveTargetIndices = (
    column: string,
    options: ExecutionOptions = { mode: 'all' },
  ): number[] => {
    const allIndices = rows.map((_, i) => i);

    switch (options.mode) {
      case 'first-x': {
        const limit = Math.max(1, options.firstX ?? 1);
        return allIndices.slice(0, limit);
      }

      case 'range': {
        // Convert 1-indexed user input → 0-indexed slice args
        const from = Math.max(1, options.fromRow ?? 1) - 1;
        const to = Math.min(rows.length, options.toRow ?? rows.length);
        return allIndices.slice(from, to);
      }

      case 'errors-only': {
        const keywords = options.errorKeywords ?? DEFAULT_ERROR_KEYWORDS;
        return allIndices.filter((i) =>
          cellHasError((rows[i] as Record<string, string>)[column], keywords),
        );
      }

      case 'column-filter': {
        const { filterColumn, filterValue = '', filterMatchMode = 'equals' } = options;
        if (!filterColumn) return allIndices; // no column chosen → run all

        const needle = filterValue.toLowerCase().trim();

        return allIndices.filter((i) => {
          const cellVal = ((rows[i] as Record<string, string>)[filterColumn] ?? '').toLowerCase().trim();
          switch (filterMatchMode) {
            case 'contains':     return cellVal.includes(needle);
            case 'not-equals':   return cellVal !== needle;
            case 'not-contains': return !cellVal.includes(needle);
            case 'equals':
            default:             return cellVal === needle;
          }
        });
      }

      case 'all':
      default:
        return allIndices;
    }
  };

  const executeFormula = async (column: string, options: ExecutionOptions = { mode: 'all' }) => {
    const formula = getFormula(column);

    if (!formula.trim()) {
      toast({
        title: "No Formula",
        description: `Column "${column}" doesn't have a formula defined.`,
        variant: "destructive",
      });
      return;
    }

    setExecutingColumn(column);
    setLoading(true);

    try {
      // Get the formula for this column
      const formula = getFormula(column);

      // ── Agent mode: natural-language research agent ──────────────────────
      if (isAgentFormula(formula)) {
        const agentConfig = decodeAgentFormula(formula);
        if (!agentConfig) {
          toast({ title: 'Invalid Agent Formula', variant: 'destructive' });
          return;
        }

        const providerRateConfig = getRateLimitConfig(agentConfig.provider, agentConfig.model);
        const agentRateConfig = {
          maxConcurrent: providerRateConfig.maxConcurrent,
          delayMs: providerRateConfig.delayMs,
          description: `Agent mode: ${providerRateConfig.description}`,
        };

        const targetIndices = resolveTargetIndices(column, options);
        console.log(`🎯 Agent mode: executing ${targetIndices.length} of ${rows.length} rows (mode: ${options.mode})`);

        const rowTasks = targetIndices.map((i) => async () => {
          const row = rows[i];
          try {
            const result = await runSearchAgent({
              instruction: agentConfig.instruction,
              rowData: row as Record<string, string>,
              provider: agentConfig.provider as 'openai' | 'gemini' | 'groq' | 'ollama',
              model: agentConfig.model,
              maxSteps: agentConfig.maxSteps,
              temperature: agentConfig.temperature,
              thinkingMode: agentConfig.thinkingMode,
            });

            if (result.error) {
              throw new Error(result.error);
            }

            updateCell(i, column, result.result);
            return { success: true, rowIndex: i };
          } catch (error) {
            updateCell(i, column, 'ERROR');
            console.error(`❌ Agent row ${i + 1} failed:`, error);
            return { success: false, rowIndex: i, error };
          }
        });

        const results = await executeWithRateLimit(rowTasks, {
          maxConcurrent: agentRateConfig.maxConcurrent,
          delayMs: agentRateConfig.delayMs,
          onProgress: (completed, total) => {
            setExecutionProgress({ completed, total });
          },
        });

        setExecutionProgress(null);
        const successCount = results.filter(r => r.success).length;
        const errorCount = results.filter(r => !r.success).length;
        toast({
          title: 'Agent Complete',
          description: `${successCount} rows researched${errorCount > 0 ? `, ${errorCount} errors` : ''}. ${agentRateConfig.description}`,
          variant: errorCount === 0 ? 'default' : 'destructive',
        });
        return;
      }

      // ── Email Finder mode: autonomous email discovery agent ───────────────
      if (isEmailFinderFormula(formula)) {
        const emailConfig = decodeEmailFinderFormula(formula);
        if (!emailConfig) {
          toast({ title: 'Invalid Email Finder Formula', variant: 'destructive' });
          return;
        }

        const providerRateConfig = getRateLimitConfig(emailConfig.provider, emailConfig.model);
        
        // Even if provider allows 10+, we hard-limit Email Finder to avoid burning validation credits 
        // across parallel rows (which causes 403/429 loops).
        const emailRateConfig = {
          maxConcurrent: Math.min(providerRateConfig.maxConcurrent, 2),
          delayMs: Math.max(providerRateConfig.delayMs, 2500),
          description: `Email Finder: Concurrency capped to protect validation APIs`,
        };

        const targetIndices = resolveTargetIndices(column, options);
        console.log(`🎯 Email Finder mode: executing ${targetIndices.length} of ${rows.length} rows (mode: ${options.mode})`);

        const rowTasks = targetIndices.map((i) => async () => {
          const row = rows[i];
          try {
            // Interpolate {ColumnName} placeholders in context with row data
            const interpolatedContext = emailConfig.context.replace(
              /\{([^}]+)\}/g,
              (_, col) => (row as Record<string, string>)[col] ?? `{${col}}`,
            );

            const result = await runEmailFinderAgent({
              context: interpolatedContext,
              provider: emailConfig.provider as 'openai' | 'gemini' | 'groq' | 'ollama',
              model: emailConfig.model,
              maxSteps: emailConfig.maxSteps,
              temperature: emailConfig.temperature,
            });

            if (result.error) {
              throw new Error(result.error);
            }

            updateCell(i, column, result.result);
            return { success: true, rowIndex: i };
          } catch (error) {
            updateCell(i, column, 'ERROR');
            console.error(`❌ Email Finder row ${i + 1} failed:`, error);
            return { success: false, rowIndex: i, error };
          }
        });

        const results = await executeWithRateLimit(rowTasks, {
          maxConcurrent: emailRateConfig.maxConcurrent,
          delayMs: emailRateConfig.delayMs,
          onProgress: (completed, total) => {
            setExecutionProgress({ completed, total });
          },
        });

        setExecutionProgress(null);
        const successCount = results.filter(r => r.success).length;
        const errorCount = results.filter(r => !r.success).length;
        toast({
          title: 'Email Finder Complete',
          description: `${successCount} emails found${errorCount > 0 ? `, ${errorCount} errors` : ''}. ${emailRateConfig.description}`,
          variant: errorCount === 0 ? 'default' : 'destructive',
        });
        return;
      }

      // Extract provider and model from formula metadata (embedded in comments)
      // Falls back to localStorage for backward compatibility with old formulas
      const aiProvider = getFormulaProvider(formula, localStorage.getItem('ai_provider') || 'openai');
      const aiModel = getFormulaModel(formula) || localStorage.getItem('ai_model') || '';

      console.log('🔍 DEBUG - Provider Detection:', {
        raw: aiProvider,
        model: aiModel,
        isGroq: aiProvider === 'groq',
        source: 'formula metadata'
      });

      const rateLimitConfig = getRateLimitConfig(aiProvider, aiModel);

      console.log(`🚦 Rate limiting: ${rateLimitConfig.description}`);
      console.log(`📊 Batch size: ${rateLimitConfig.maxConcurrent}, Delay: ${rateLimitConfig.delayMs}ms`);
      console.warn(`⚠️ CRITICAL: Starting execution of ${rows.length} rows with above config`);

      // Create array of promise-returning functions (not promises yet!)
      const targetIndices = resolveTargetIndices(column, options);
      console.log(`🎯 Regular AI mode: executing ${targetIndices.length} of ${rows.length} rows (mode: ${options.mode})`);

      const rowTasks = targetIndices.map((i) => async () => {
        const row = rows[i];
        try {
          console.log(`🚀 Starting row ${i + 1}/${rows.length} with individual timeout per API call`);

          // Create async function from formula string with proper column access syntax
          const asyncFunction = new Function('row', 'runAIAgents', `
            return (async () => {
              ${formula}
            })();
          `);

          const result = await asyncFunction(row, runAIAgents);
          const stringResult = result !== null && result !== undefined ? String(result) : '';

          updateCell(i, column, stringResult);
          console.log(`✅ Row ${i + 1} completed successfully`);
          return { success: true, rowIndex: i };
        } catch (error) {
          updateCell(i, column, 'ERROR');
          console.error(`❌ Row ${i + 1} failed:`, error);
          return { success: false, rowIndex: i, error };
        }
      });

      // Execute with rate limiting
      const results = await executeWithRateLimit(rowTasks, {
        maxConcurrent: rateLimitConfig.maxConcurrent,
        delayMs: rateLimitConfig.delayMs,
        onProgress: (completed, total) => {
          setExecutionProgress({ completed, total });
          console.log(`📊 Progress: ${completed}/${total} rows`);
        }
      });

      setExecutionProgress(null);

      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;

      toast({
        title: "Formula Executed",
        description: `${successCount} rows processed successfully${errorCount > 0 ? `, ${errorCount} errors` : ''}. Rate limited: ${rateLimitConfig.description}`,
        variant: errorCount === 0 ? "default" : "destructive",
      });
    } catch (error) {
      console.error('Error executing formula:', error);
      setExecutionProgress(null);
      toast({
        title: "Execution Error",
        description: "Failed to execute formula. Check your syntax.",
        variant: "destructive",
      });
    } finally {
      setExecutingColumn(null);
      setLoading(false);
    }
  };

  /**
   * Execute formula on a single cell
   * Handles agent mode formulas specially, falls back to store's executeFormulaOnCell for regular formulas
   */
  const executeCellFormula = async (rowIndex: number, column: string) => {
    const cellKey = `${rowIndex}-${column}`;
    setExecutingCells(prev => new Set(prev).add(cellKey));

    try {
      const formula = getFormula(column);
      const row = rows[rowIndex];

      // ── Agent mode: special handling for single cell ──────────────────────
      if (isAgentFormula(formula)) {
        const agentConfig = decodeAgentFormula(formula);
        if (!agentConfig) {
          throw new Error('Invalid agent formula');
        }

        const result = await runSearchAgent({
          instruction: agentConfig.instruction,
          rowData: row as Record<string, string>,
          provider: agentConfig.provider as 'openai' | 'gemini' | 'groq' | 'ollama',
          model: agentConfig.model,
          maxSteps: agentConfig.maxSteps,
          temperature: agentConfig.temperature,
          thinkingMode: agentConfig.thinkingMode,
        });

        if (result.error) {
          throw new Error(result.error);
        }

        console.log('📝 Updating cell:', { rowIndex, column, result: result.result, steps: result.steps });
        updateCell(rowIndex, column, result.result);
        toast({
          title: "Cell Updated",
          description: `Cell ${column} in row ${rowIndex + 1} has been updated.`,
        });
        return;
      }

      // ── Email Finder mode: single cell ───────────────────────────────────
      if (isEmailFinderFormula(formula)) {
        const emailConfig = decodeEmailFinderFormula(formula);
        if (!emailConfig) {
          throw new Error('Invalid email finder formula');
        }

        const interpolatedContext = emailConfig.context.replace(
          /\{([^}]+)\}/g,
          (_, col) => (row as Record<string, string>)[col] ?? `{${col}}`,
        );

        const result = await runEmailFinderAgent({
          context: interpolatedContext,
          provider: emailConfig.provider as 'openai' | 'gemini' | 'groq' | 'ollama',
          model: emailConfig.model,
          maxSteps: emailConfig.maxSteps,
          temperature: emailConfig.temperature,
        });

        if (result.error) {
          throw new Error(result.error);
        }

        updateCell(rowIndex, column, result.result);
        toast({
          title: 'Email Found',
          description: `Email for row ${rowIndex + 1}: ${result.result}`,
        });
        return;
      }

      // ── Regular formula: execute as JavaScript ─────────────────────────────
      await executeFormulaOnCell(rowIndex, column, { runAIAgents });
      toast({
        title: "Cell Updated",
        description: `Cell ${column} in row ${rowIndex + 1} has been updated.`,
      });
    } catch (error) {
      console.error('Error executing cell formula:', error);
      updateCell(rowIndex, column, 'ERROR');
      toast({
        title: "Execution Error",
        description: error instanceof Error ? error.message : "Failed to execute formula on this cell.",
        variant: "destructive",
      });
    } finally {
      setExecutingCells(prev => {
        const newSet = new Set(prev);
        newSet.delete(cellKey);
        return newSet;
      });
    }
  };

  return {
    executingColumn,
    executingCells,
    executeFormula,
    executeCellFormula,
    executionProgress,
  };
};
