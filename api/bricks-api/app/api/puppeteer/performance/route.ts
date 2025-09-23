import { NextRequest, NextResponse } from 'next/server';
import { performanceMonitor } from '../performance-monitor';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'stats';
    const timeWindow = parseInt(searchParams.get('timeWindow') || '3600000'); // 1 hour default

    switch (action) {
      case 'stats': {
        const stats = performanceMonitor.getStats();
        return NextResponse.json({
          success: true,
          stats,
          message: 'Performance statistics retrieved successfully'
        });
      }

      case 'trends': {
        const trends = performanceMonitor.getTrends(timeWindow);
        return NextResponse.json({
          success: true,
          trends,
          timeWindow,
          message: 'Performance trends retrieved successfully'
        });
      }

      case 'alerts': {
        const alerts = performanceMonitor.getAlerts(timeWindow);
        return NextResponse.json({
          success: true,
          alerts,
          timeWindow,
          message: 'Performance alerts retrieved successfully'
        });
      }

      case 'export': {
        const format = searchParams.get('format') as 'json' | 'csv' || 'json';
        const exportData = performanceMonitor.exportMetrics(format);
        
        if (format === 'csv') {
          return new NextResponse(exportData, {
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': 'attachment; filename=puppeteer-metrics.csv'
            }
          });
        }

        return NextResponse.json({
          success: true,
          data: exportData,
          message: 'Performance metrics exported successfully'
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Use: stats, trends, alerts, or export' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('💥 Performance monitor API error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        success: false, 
        error: `Performance monitoring error: ${errorMessage}`,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Reset metrics (for testing/admin)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const confirm = searchParams.get('confirm');
    
    if (confirm !== 'reset-all-metrics') {
      return NextResponse.json(
        { success: false, error: 'Missing confirmation parameter' },
        { status: 400 }
      );
    }

    performanceMonitor.reset();
    
    return NextResponse.json({
      success: true,
      message: 'Performance metrics reset successfully'
    });

  } catch (error) {
    console.error('💥 Performance reset error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to reset performance metrics' },
      { status: 500 }
    );
  }
}