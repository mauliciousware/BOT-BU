// ============================================================================
// GLOBAL USAGE STATS API ENDPOINT
// ============================================================================
// Returns real-time usage statistics for ALL users of Bot Bu
// This is shown in the sidebar profile section during demos

import { NextResponse } from 'next/server';
import { getUsageStats } from '@/lib/rateLimitTracker';

export async function GET() {
  try {
    const stats = getUsageStats();
    
    // Calculate warning thresholds
    const warnings = {
      dailyWarning: stats.percentages.daily > 80, // 80% threshold
      dailyCritical: stats.percentages.daily > 95, // 95% threshold
      minuteWarning: stats.percentages.minute > 80,
      minuteCritical: stats.percentages.minute > 95
    };

    return NextResponse.json({
      success: true,
      globalUsage: {
        // Today's usage
        requestsToday: stats.requestsToday,
        dailyLimit: stats.limits.daily,
        dailyRemaining: stats.remaining.daily,
        dailyPercentage: Math.round(stats.percentages.daily * 10) / 10,
        
        // This minute's usage
        requestsThisMinute: stats.requestsThisMinute,
        minuteLimit: stats.limits.minute,
        minuteRemaining: stats.remaining.minute,
        minutePercentage: Math.round(stats.percentages.minute * 10) / 10,
        
        // Warning indicators
        warnings: warnings,
        status: warnings.dailyCritical || warnings.minuteCritical ? 'critical' :
                warnings.dailyWarning || warnings.minuteWarning ? 'warning' : 'healthy'
      },
      message: 'These limits are shared across ALL users of Bot Bu',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching usage stats:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch usage statistics',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
