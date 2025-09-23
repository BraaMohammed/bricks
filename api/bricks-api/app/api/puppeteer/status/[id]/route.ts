import { NextRequest, NextResponse } from 'next/server';
import { puppeteerQueue } from '../../queue';

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  try {
    const jobId = resolvedParams?.id;
    
    // Enhanced validation
    if (!jobId || typeof jobId !== 'string') {
      return NextResponse.json(
        { error: 'Job ID is required and must be a string' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate job ID format (should be UUID-like)
    if (jobId.length > 100 || !/^[a-zA-Z0-9_-]+$/.test(jobId)) {
      return NextResponse.json(
        { error: 'Invalid job ID format' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`🔍 Checking status for job: ${jobId}`);

    const job = puppeteerQueue.getJob(jobId);
    
    if (!job) {
      console.log(`❌ Job not found: ${jobId}`);
      return NextResponse.json(
        { 
          error: 'Job not found',
          jobId: jobId,
          message: 'The requested job does not exist or has expired'
        },
        { status: 404, headers: corsHeaders }
      );
    }

    console.log(`📊 Job ${jobId} status: ${job.status}`);

    // Return comprehensive job status
    interface JobStatusResponse {
      id: string;
      status: string;
      progress?: string;
      createdAt: Date;
      startedAt?: Date;
      completedAt?: Date;
      processingTime?: number;
      queuePosition?: number;
      estimatedWaitTime?: number;
    }

    const response: JobStatusResponse = {
      id: job.id,
      status: job.status,
      progress: job.progress,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt
    };

    // Add timing information
    if (job.startedAt) {
      response.processingTime = job.completedAt ? 
        job.completedAt.getTime() - job.startedAt.getTime() :
        Date.now() - job.startedAt.getTime();
    }

    if (job.status === 'pending') {
      response.queuePosition = puppeteerQueue.getQueuePosition(jobId);
      response.estimatedWaitTime = puppeteerQueue.getQueueStats().estimatedWaitTime;
    }

    // Include result or error based on status
    if (job.status === 'completed') {
      return NextResponse.json({
        ...response,
        result: job.result,
        message: 'Job completed successfully'
      }, { headers: corsHeaders });
    } else if (job.status === 'failed') {
      return NextResponse.json({
        ...response,
        error: job.error,
        message: 'Job failed to complete'
      }, { headers: corsHeaders });
    } else {
      // Still pending or processing
      return NextResponse.json({
        ...response,
        message: job.status === 'processing' ? 'Job is being processed' : 'Job is in queue'
      }, { headers: corsHeaders });
    }

  } catch (error) {
    console.error('💥 Error fetching job status:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Log error details
    console.error('Status check error details:', {
      jobId: resolvedParams?.id,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: errorMessage,
        jobId: resolvedParams?.id,
        timestamp: new Date().toISOString()
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders
  });
}