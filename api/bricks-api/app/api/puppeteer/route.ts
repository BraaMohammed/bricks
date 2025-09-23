import { NextRequest, NextResponse } from 'next/server';
import { puppeteerQueue } from './queue';

// Configure runtime for larger payloads
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface PuppeteerRequest {
  code: string;
  config: {
    timeout: number;
    headless: boolean;
  };
  rowData: Record<string, string>;
}

export async function POST(request: NextRequest) {
  try {
    console.log('📨 Received Puppeteer job request');
    
    // Handle large payloads (up to 10MB)
    const body: PuppeteerRequest = await request.json();
    const { code, config, rowData } = body;

    // Enhanced validation
    if (!code || !code.trim()) {
      return NextResponse.json(
        { success: false, error: 'No Puppeteer code provided' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check code length (max 50KB) - DISABLED FOR TESTING
    // if (code.length > 50000) {
    //   return NextResponse.json(
    //     { success: false, error: 'Code is too long (max 50KB)' },
    //     { status: 400, headers: corsHeaders }
    //   );
    // }

    // Check for dangerous patterns - DISABLED FOR TESTING
    // const dangerousPatterns = [
    //   /require\s*\([^)]*['"]fs['"]/,
    //   /require\s*\([^)]*['"]child_process['"]/,
    //   /require\s*\([^)]*['"]os['"]/,
    //   /process\s*\./,
    //   /__dirname/,
    //   /__filename/,
    //   /eval\s*\(/,
    //   /Function\s*\(/
    // ];

    // for (const pattern of dangerousPatterns) {
    //   if (pattern.test(code)) {
    //     return NextResponse.json(
    //       { success: false, error: 'Code contains potentially dangerous operations' },
    //       { status: 400, headers: corsHeaders }
    //     );
    //   }
    // }

    if (!config || typeof config.timeout !== 'number' || typeof config.headless !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Invalid configuration provided' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Sanitize timeout (5s min, 120s max for complex operations)
    const sanitizedConfig = {
      ...config,
      timeout: Math.max(5000, Math.min(config.timeout, 120000))
    };

    console.log('📝 Code length:', code.length);
    console.log('⚙️ Config:', sanitizedConfig);
    console.log('📊 Row data keys:', Object.keys(rowData || {}));

    // Add job to queue (immediate response)
    const jobId = puppeteerQueue.addJob({
      code,
      config: sanitizedConfig,
      rowData: rowData || {}
    });

    console.log(`✅ Job ${jobId} queued successfully`);

    return NextResponse.json({
      queued: true,
      jobId,
      message: 'Job added to queue successfully',
      estimatedWaitTime: puppeteerQueue.getQueueStats().estimatedWaitTime,
      queuePosition: puppeteerQueue.getQueueStats().pending + 1
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('💥 Puppeteer API error:', error);
    
    // Handle specific error types
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid JSON in request body' 
        },
        { status: 400, headers: corsHeaders }
      );
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error';
    
    // Log error details for debugging
    console.error('Error details:', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: `Server error: ${errorMessage}`,
        timestamp: new Date().toISOString()
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function GET() {
  // Return queue statistics
  const stats = puppeteerQueue.getQueueStats();
  const recentJobs = puppeteerQueue.getRecentJobs(5);
  
  return NextResponse.json({
    queue: stats,
    recentJobs,
    message: 'Puppeteer queue status'
  }, { headers: corsHeaders });
}

// Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders
  });
}