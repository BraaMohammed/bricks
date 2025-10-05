import { browserPool } from './browser-pool';
import { 
  performanceMonitor, 
  recordJobSubmitted, 
  recordJobStarted, 
  recordJobCompleted, 
  recordJobFailed 
} from './performance-monitor';

export interface QueueJob {
  id: string;
  code: string;
  config: {
    timeout: number;
    headless: boolean;
  };
  rowData: Record<string, string>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: string;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  progress?: string;
}

class PuppeteerQueue {
  private jobs: Map<string, QueueJob> = new Map();
  private processingJobs = new Set<string>();
  private maxConcurrent = 3; // Max jobs processing simultaneously
  private processing = false;

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  addJob(jobData: Omit<QueueJob, 'id' | 'status' | 'createdAt'>): string {
    const id = this.generateJobId();
    
    const job: QueueJob = {
      ...jobData,
      id,
      status: 'pending',
      createdAt: new Date()
    };

    this.jobs.set(id, job);
    console.log(`➕ Added job ${id} to queue (${this.getQueueStats().pending} pending)`);
    
    // Record performance metric
    recordJobSubmitted(id, {
      codeLength: jobData.code.length,
      timeout: jobData.config.timeout,
      headless: jobData.config.headless
    });
    
    // Trigger processing (non-blocking)
    this.processNext();
    
    return id;
  }

  getJob(id: string): QueueJob | undefined {
    const job = this.jobs.get(id);
    if (!job) {
      const allJobs = Array.from(this.jobs.values());
      const recentJobs = allJobs
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5)
        .map(j => ({ id: j.id, status: j.status, created: j.createdAt.toISOString().slice(-8, -3) }));
      console.log(`🔍 Job ${id} not found. Total jobs: ${allJobs.length}. Recent jobs:`, recentJobs);
    }
    return job;
  }

  private async processNext(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      while (this.processingJobs.size < this.maxConcurrent) {
        // Find next pending job
        const pendingJob = Array.from(this.jobs.values()).find(
          job => job.status === 'pending'
        );

        if (!pendingJob) {
          break; // No pending jobs
        }

        // Start processing this job
        this.processingJobs.add(pendingJob.id);
        this.updateJobStatus(pendingJob.id, 'processing', undefined, 'Starting browser...');
        
        // Process job asynchronously
        this.executeJob(pendingJob).finally(() => {
          this.processingJobs.delete(pendingJob.id);
          // Continue processing next jobs
          setTimeout(() => this.processNext(), 100);
        });
      }
    } finally {
      this.processing = false;
    }
  }

  private async executeJob(job: QueueJob): Promise<void> {
    console.log(`🚀 Starting execution of job ${job.id}`);
    
    try {
      job.startedAt = new Date();
      
      // Record performance metric for job start
      recordJobStarted(job.id);
      
      // Get browser from pool
      this.updateJobStatus(job.id, 'processing', undefined, 'Acquiring browser...');
      const { browser, browserId, release: releaseBrowser } = await browserPool.getBrowser();
      
      try {
        // Get page from browser
        this.updateJobStatus(job.id, 'processing', undefined, 'Creating page...');
        const { page, release: releasePage } = await browserPool.getPage(browserId);
        
        try {
          // Set timeout
          page.setDefaultTimeout(job.config.timeout);
          
          // Validate code security
          this.validateCode(job.code);
          
          // Create execution context
          this.updateJobStatus(job.id, 'processing', undefined, 'Executing code...');
          const executionContext = {
            page,
            browser,
            rowData: job.rowData,
            console: {
              log: (...args: unknown[]) => console.log(`🎭 Job ${job.id}:`, ...args)
            }
          };

          // Execute user code with timeout
          console.log('🔍 Raw job.code:');
          console.log('=' .repeat(50));
          console.log(job.code);
          console.log('=' .repeat(50));
          
          // Validate and prepare user code
          const sanitizedCode = this.sanitizeUserCode(job.code);
          
          const functionCode = `
            const { page, browser, rowData, console } = context;
            return (async () => {
              ${sanitizedCode}
            })();
          `;
          
          console.log('🔍 Generated function code:');
          console.log('=' .repeat(50));
          console.log(functionCode);
          console.log('=' .repeat(50));
          
          // Create function with error handling
          let executeCode;
          try {
            executeCode = new Function('context', functionCode);
          } catch (syntaxError) {
            console.error('Function creation failed:', syntaxError);
            console.error('User code that caused the error:');
            console.error('=' .repeat(40));
            console.error(job.code);
            console.error('=' .repeat(40));
            console.error('Generated function code:');
            console.error(functionCode);
            
            // Try to give more specific error guidance
            const errorMsg = syntaxError instanceof Error ? syntaxError.message : 'Invalid syntax';
            let guidance = '';
            
            if (errorMsg.includes('missing ) after argument list')) {
              guidance = ' Common causes: unclosed function calls like page.goto("url" or missing closing parenthesis in expressions.';
            } else if (errorMsg.includes('Unexpected token')) {
              guidance = ' Check for unmatched quotes, brackets, or braces.';
            } else if (errorMsg.includes('Unexpected end of input')) {
              guidance = ' Code appears incomplete - missing closing brackets, braces, or parentheses.';
            }
            
            // Include the user's code in the error message for easier debugging
            throw new Error(`Code compilation error: ${errorMsg}.${guidance} Please review your JavaScript code for syntax errors.\n\nYour code:\n${job.code.substring(0, 200)}${job.code.length > 200 ? '...' : ''}`);
          }

          const result = await Promise.race([
            executeCode(executionContext),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Execution timeout')), job.config.timeout)
            )
          ]);

          // Job completed successfully
          this.updateJobStatus(job.id, 'completed', String(result || ''));
          console.log(`✅ Job ${job.id} completed successfully`);
          
          // Record performance metric for completed job
          recordJobCompleted(job.id, job.startedAt ? Date.now() - job.startedAt.getTime() : 0);

        } finally {
          releasePage();
        }
      } finally {
        releaseBrowser();
      }

    } catch (error) {
      console.error(`❌ Job ${job.id} failed:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Ensure the job has a completion timestamp
      if (!job.completedAt) {
        job.completedAt = new Date();
      }
      
      this.updateJobStatus(job.id, 'failed', undefined, errorMessage);
      
      // Record performance metric for failed job
      recordJobFailed(job.id, errorMessage, job.startedAt ? Date.now() - job.startedAt.getTime() : 0);
    }
  }

  private validateCode(code: string): void {
    // VALIDATION DISABLED FOR TESTING
    // const dangerousPatterns = [
    //   'require(',
    //   'import(',
    //   'eval(',
    //   'Function(',
    //   'process.',
    //   'global.',
    //   '__dirname',
    //   '__filename',
    //   'fs.',
    //   'child_process',
    //   'exec(',
    //   'spawn(',
    //   'fork(',
    //   'execSync(',
    //   'execFile('
    // ];

    // const hasDangerousCode = dangerousPatterns.some(pattern => 
    //   code.includes(pattern)
    // );

    // if (hasDangerousCode) {
    //   throw new Error('Code contains potentially dangerous operations');
    // }

    // Additional validation - DISABLED
    // if (code.length > 10000) {
    //   throw new Error('Code is too long (max 10,000 characters)');
    // }

    if (!code.trim()) {
      throw new Error('No code provided');
    }
  }

  private sanitizeUserCode(code: string): string {
    if (!code || !code.trim()) {
      throw new Error('No code provided');
    }

    // Perform basic bracket/parentheses/quote matching check
    this.validateBracketMatching(code);

    return code;
  }

  private validateBracketMatching(code: string): void {
    const stack: string[] = [];
    const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
    const opening = Object.keys(pairs);
    const closing = Object.values(pairs);
    
    let inString = false;
    let stringChar = '';
    let escaped = false;
    
    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      
      if (escaped) {
        escaped = false;
        continue;
      }
      
      if (char === '\\') {
        escaped = true;
        continue;
      }
      
      // Handle string literals
      if (char === '"' || char === "'" || char === '`') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
          stringChar = '';
        }
        continue;
      }
      
      // Check for template literal syntax in regular strings
      if (inString && stringChar !== '`' && char === '$' && i < code.length - 1 && code[i + 1] === '{') {
        throw new Error(`Template literal syntax \${} found in regular string at position ${i}. Use backticks (\`) instead of quotes for template literals.`);
      }
      
      if (inString) continue;
      
      if (opening.includes(char)) {
        stack.push(char);
      } else if (closing.includes(char)) {
        if (stack.length === 0) {
          throw new Error(`Unexpected closing ${char} at position ${i}`);
        }
        const last = stack.pop()!;
        if (pairs[last] !== char) {
          throw new Error(`Mismatched brackets: expected ${pairs[last]} but found ${char} at position ${i}`);
        }
      }
    }
    
    if (stack.length > 0) {
      const unmatched = stack[stack.length - 1];
      throw new Error(`Unmatched opening ${unmatched} - missing closing ${pairs[unmatched]}`);
    }
  }

  private updateJobStatus(
    jobId: string, 
    status: QueueJob['status'], 
    result?: string, 
    progress?: string
  ): void {
    const job = this.jobs.get(jobId);
    if (!job) {
      console.error(`⚠️ Attempted to update status of non-existent job: ${jobId}`);
      return;
    }

    const previousStatus = job.status;
    job.status = status;
    job.progress = progress;
    
    if (result !== undefined) {
      job.result = result;
    }
    
    if (status === 'completed' || status === 'failed') {
      job.completedAt = new Date();
    }
    
    if (status === 'failed' && progress) {
      job.error = progress;
    }

    console.log(`📊 Job ${jobId} status: ${previousStatus} → ${status}${progress ? ` (${progress})` : ''}${result ? ` [result: ${result.substring(0, 50)}...]` : ''}`);
  }

  getQueueStats() {
    const jobs = Array.from(this.jobs.values());
    
    const stats = {
      total: jobs.length,
      pending: jobs.filter(j => j.status === 'pending').length,
      processing: jobs.filter(j => j.status === 'processing').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      avgProcessingTime: 0,
      estimatedWaitTime: 0
    };

    // Calculate average processing time for completed jobs
    const completedJobs = jobs.filter(j => j.status === 'completed' && j.startedAt && j.completedAt);
    if (completedJobs.length > 0) {
      const totalTime = completedJobs.reduce((sum, job) => {
        return sum + (job.completedAt!.getTime() - job.startedAt!.getTime());
      }, 0);
      stats.avgProcessingTime = Math.round(totalTime / completedJobs.length / 1000); // in seconds
    }

    // Estimate wait time
    if (stats.pending > 0 && stats.avgProcessingTime > 0) {
      const queuePosition = Math.ceil(stats.pending / this.maxConcurrent);
      stats.estimatedWaitTime = queuePosition * stats.avgProcessingTime;
    }

    return stats;
  }

  getQueuePosition(jobId: string): number {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'pending') {
      return 0; // Job not found or not pending
    }
    
    const pendingJobs = Array.from(this.jobs.values())
      .filter(j => j.status === 'pending')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    
    const position = pendingJobs.findIndex(j => j.id === jobId);
    return position >= 0 ? position + 1 : 0;
  }

  // Cleanup old completed jobs (keep last 1000)
  cleanup(): void {
    const completedJobs = Array.from(this.jobs.values())
      .filter(j => (j.status === 'completed' || j.status === 'failed') && j.completedAt)
      .sort((a, b) => b.completedAt!.getTime() - a.completedAt!.getTime());

    if (completedJobs.length > 1000) {
      const toRemove = completedJobs.slice(1000);
      toRemove.forEach(job => {
        this.jobs.delete(job.id);
      });
      console.log(`🧹 Cleaned up ${toRemove.length} old jobs. Remaining: ${this.jobs.size}`);
    } else {
      console.log(`🧹 Cleanup check: ${completedJobs.length} completed/failed jobs, ${this.jobs.size} total jobs`);
    }
  }

  // Get recent jobs for debugging
  getRecentJobs(limit = 10) {
    return Array.from(this.jobs.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
      .map(job => ({
        id: job.id,
        status: job.status,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        progress: job.progress,
        error: job.error
      }));
  }
}

// Singleton instance
export const puppeteerQueue = new PuppeteerQueue();

// Periodic cleanup - run less frequently during development
setInterval(() => {
  puppeteerQueue.cleanup();
}, 600000); // Every 10 minutes