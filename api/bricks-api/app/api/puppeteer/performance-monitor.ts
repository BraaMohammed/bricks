/**
 * Phase 4.2: Performance Monitoring System
 * Tracks and reports on Puppeteer mode performance metrics
 */

interface PerformanceMetric {
  timestamp: Date;
  type: 'job_submitted' | 'job_started' | 'job_completed' | 'job_failed' | 'browser_created' | 'browser_closed';
  jobId?: string;
  browserId?: string;
  duration?: number;
  memoryUsage?: number;
  errorType?: string;
  metadata?: Record<string, string | number | boolean>;
}

interface PerformanceStats {
  totalJobs: number;
  successfulJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
  averageQueueTime: number;
  averageMemoryUsage: number;
  successRate: number;
  peakConcurrency: number;
  totalBrowsersCreated: number;
  totalMemoryUsed: number;
  uptime: number;
  lastUpdated: Date;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 10000; // Keep last 10k metrics
  private startTime = new Date();

  // Record a performance metric
  recordMetric(metric: Omit<PerformanceMetric, 'timestamp'>) {
    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: new Date()
    };

    this.metrics.push(fullMetric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log important events
    if (metric.type === 'job_failed') {
      console.log(`⚠️ Performance Alert: Job ${metric.jobId} failed - ${metric.errorType}`);
    }

    if (metric.duration && metric.duration > 60000) { // 1 minute
      console.log(`⏰ Performance Alert: Job ${metric.jobId} took ${(metric.duration / 1000).toFixed(1)}s`);
    }

    if (metric.memoryUsage && metric.memoryUsage > 500) { // 500MB
      console.log(`💾 Performance Alert: High memory usage ${metric.memoryUsage}MB for ${metric.browserId || metric.jobId}`);
    }
  }

  // Get comprehensive performance statistics
  getStats(): PerformanceStats {
    const now = new Date();
    const recentMetrics = this.metrics.filter(m => 
      now.getTime() - m.timestamp.getTime() < 3600000 // Last hour
    );

    const jobSubmissions = recentMetrics.filter(m => m.type === 'job_submitted');
    const jobCompletions = recentMetrics.filter(m => m.type === 'job_completed');
    const jobFailures = recentMetrics.filter(m => m.type === 'job_failed');
    const browserCreations = recentMetrics.filter(m => m.type === 'browser_created');

    // Calculate processing times
    const processingTimes = jobCompletions
      .filter(m => m.duration)
      .map(m => m.duration!);

    const averageProcessingTime = processingTimes.length > 0 ?
      processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length :
      0;

    // Calculate queue times (from submission to start)
    const queueTimes: number[] = [];
    recentMetrics
      .filter(m => m.type === 'job_started')
      .forEach(startMetric => {
        const submitMetric = recentMetrics.find(m => 
          m.type === 'job_submitted' && 
          m.jobId === startMetric.jobId &&
          m.timestamp < startMetric.timestamp
        );
        if (submitMetric) {
          queueTimes.push(startMetric.timestamp.getTime() - submitMetric.timestamp.getTime());
        }
      });

    const averageQueueTime = queueTimes.length > 0 ?
      queueTimes.reduce((sum, time) => sum + time, 0) / queueTimes.length :
      0;

    // Memory usage
    const memoryMetrics = recentMetrics
      .filter(m => m.memoryUsage)
      .map(m => m.memoryUsage!);

    const averageMemoryUsage = memoryMetrics.length > 0 ?
      memoryMetrics.reduce((sum, mem) => sum + mem, 0) / memoryMetrics.length :
      0;

    // Success rate
    const totalJobs = jobSubmissions.length;
    const successfulJobs = jobCompletions.length;
    const failedJobs = jobFailures.length;
    const successRate = totalJobs > 0 ? (successfulJobs / totalJobs) * 100 : 100;

    // Peak concurrency (max processing jobs at any time)
    const peakConcurrency = this.calculatePeakConcurrency();

    return {
      totalJobs,
      successfulJobs,
      failedJobs,
      averageProcessingTime: Math.round(averageProcessingTime),
      averageQueueTime: Math.round(averageQueueTime),
      averageMemoryUsage: Math.round(averageMemoryUsage),
      successRate: Math.round(successRate * 100) / 100,
      peakConcurrency,
      totalBrowsersCreated: browserCreations.length,
      totalMemoryUsed: Math.round(memoryMetrics.reduce((sum, mem) => sum + mem, 0)),
      uptime: now.getTime() - this.startTime.getTime(),
      lastUpdated: now
    };
  }

  // Calculate peak concurrency by tracking concurrent jobs
  private calculatePeakConcurrency(): number {
    const events = this.metrics
      .filter(m => m.type === 'job_started' || m.type === 'job_completed' || m.type === 'job_failed')
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    let currentConcurrency = 0;
    let peakConcurrency = 0;

    events.forEach(event => {
      if (event.type === 'job_started') {
        currentConcurrency++;
        peakConcurrency = Math.max(peakConcurrency, currentConcurrency);
      } else {
        currentConcurrency = Math.max(0, currentConcurrency - 1);
      }
    });

    return peakConcurrency;
  }

  // Get performance trends over time
  getTrends(timeWindow: number = 3600000): Array<{
    timestamp: number;
    jobs: number;
    completions: number;
    failures: number;
    successRate: number;
    avgProcessingTime: number;
  }> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - timeWindow);
    
    const relevantMetrics = this.metrics.filter(m => m.timestamp >= windowStart);
    
    // Group by 5-minute intervals
    const intervals = new Map<string, PerformanceMetric[]>();
    
    relevantMetrics.forEach(metric => {
      const interval = Math.floor(metric.timestamp.getTime() / 300000) * 300000; // 5-min intervals
      const key = interval.toString();
      
      if (!intervals.has(key)) {
        intervals.set(key, []);
      }
      intervals.get(key)!.push(metric);
    });

    // Calculate stats for each interval
    const trends = Array.from(intervals.entries()).map(([timestamp, metrics]) => {
      const jobs = metrics.filter(m => m.type === 'job_submitted').length;
      const completions = metrics.filter(m => m.type === 'job_completed').length;
      const failures = metrics.filter(m => m.type === 'job_failed').length;
      
      const processingTimes = metrics
        .filter(m => m.type === 'job_completed' && m.duration)
        .map(m => m.duration!);
      
      const avgProcessingTime = processingTimes.length > 0 ?
        processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length :
        0;

      return {
        timestamp: parseInt(timestamp),
        jobs,
        completions,
        failures,
        successRate: jobs > 0 ? (completions / jobs) * 100 : 100,
        avgProcessingTime: Math.round(avgProcessingTime)
      };
    }).sort((a, b) => a.timestamp - b.timestamp);

    return trends;
  }

  // Get recent alerts and warnings
  getAlerts(timeWindow: number = 3600000): Array<{
    type: string;
    severity: string;
    message: string;
    timestamp: Date;
  }> {
    const now = new Date();
    const alerts: Array<{
      type: string;
      severity: string;
      message: string;
      timestamp: Date;
    }> = [];

    const recentMetrics = this.metrics.filter(m => 
      now.getTime() - m.timestamp.getTime() < timeWindow
    );

    // High failure rate alert
    const jobs = recentMetrics.filter(m => m.type === 'job_submitted').length;
    const failures = recentMetrics.filter(m => m.type === 'job_failed').length;
    
    if (jobs > 10 && (failures / jobs) > 0.2) { // More than 20% failure rate
      alerts.push({
        type: 'high_failure_rate',
        severity: 'warning',
        message: `High failure rate: ${((failures / jobs) * 100).toFixed(1)}% of jobs failing`,
        timestamp: now
      });
    }

    // Slow processing alert
    const completions = recentMetrics.filter(m => m.type === 'job_completed' && m.duration);
    const avgTime = completions.length > 0 ?
      completions.reduce((sum, m) => sum + m.duration!, 0) / completions.length :
      0;

    if (avgTime > 45000) { // More than 45 seconds average
      alerts.push({
        type: 'slow_processing',
        severity: 'warning',
        message: `Slow processing: Average ${(avgTime / 1000).toFixed(1)}s per job`,
        timestamp: now
      });
    }

    // High memory usage alert
    const memoryMetrics = recentMetrics.filter(m => m.memoryUsage && m.memoryUsage > 400);
    if (memoryMetrics.length > 0) {
      const maxMemory = Math.max(...memoryMetrics.map(m => m.memoryUsage!));
      alerts.push({
        type: 'high_memory_usage',
        severity: 'info',
        message: `High memory usage detected: ${maxMemory}MB`,
        timestamp: now
      });
    }

    return alerts;
  }

  // Export metrics for external analysis
  exportMetrics(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = ['timestamp', 'type', 'jobId', 'browserId', 'duration', 'memoryUsage', 'errorType'];
      const rows = this.metrics.map(m => [
        m.timestamp.toISOString(),
        m.type,
        m.jobId || '',
        m.browserId || '',
        m.duration?.toString() || '',
        m.memoryUsage?.toString() || '',
        m.errorType || ''
      ]);
      
      return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }

    return JSON.stringify({
      exportDate: new Date().toISOString(),
      metricsCount: this.metrics.length,
      metrics: this.metrics
    }, null, 2);
  }

  // Reset all metrics (for testing)
  reset() {
    this.metrics = [];
    this.startTime = new Date();
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Example usage functions for integration
export function recordJobSubmitted(jobId: string, metadata?: Record<string, string | number | boolean>) {
  performanceMonitor.recordMetric({
    type: 'job_submitted',
    jobId,
    metadata
  });
}

export function recordJobStarted(jobId: string, metadata?: Record<string, string | number | boolean>) {
  performanceMonitor.recordMetric({
    type: 'job_started',
    jobId,
    metadata
  });
}

export function recordJobCompleted(jobId: string, duration: number, memoryUsage?: number) {
  performanceMonitor.recordMetric({
    type: 'job_completed',
    jobId,
    duration,
    memoryUsage
  });
}

export function recordJobFailed(jobId: string, errorType: string, duration?: number) {
  performanceMonitor.recordMetric({
    type: 'job_failed',
    jobId,
    errorType,
    duration
  });
}

export function recordBrowserCreated(browserId: string, memoryUsage?: number) {
  performanceMonitor.recordMetric({
    type: 'browser_created',
    browserId,
    memoryUsage
  });
}

export function recordBrowserClosed(browserId: string, memoryUsage?: number) {
  performanceMonitor.recordMetric({
    type: 'browser_closed',
    browserId,
    memoryUsage
  });
}