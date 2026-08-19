import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { puppeteerQueue } = await import('../queue');
    const { browserPool } = await import('../browser-pool');
    const queueStats = puppeteerQueue.getQueueStats();
    const browserStats = browserPool.getStats();
    const recentJobs = puppeteerQueue.getRecentJobs(10);

    return NextResponse.json({
      queue: {
        ...queueStats,
        maxConcurrent: 3
      },
      browsers: browserStats,
      recentJobs,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching queue status:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}