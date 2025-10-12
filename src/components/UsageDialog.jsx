'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Activity, AlertTriangle, TrendingUp, Users, Clock, Calendar } from 'lucide-react';

export function UsageDialog({ open, onClose }) {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch usage stats
  const fetchUsage = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/usage');
      const data = await response.json();
      
      if (data.success) {
        setUsage(data.globalUsage);
        setError(null);
      } else {
        setError('Failed to load usage data');
      }
    } catch (err) {
      console.error('Error fetching usage:', err);
      setError('Failed to load usage data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount and when dialog opens
  useEffect(() => {
    if (open) {
      fetchUsage();
      // Auto-refresh every 5 seconds while dialog is open
      const interval = setInterval(fetchUsage, 5000);
      return () => clearInterval(interval);
    }
  }, [open]);

  // Get progress bar color based on percentage
  const getProgressColor = (percentage) => {
    if (percentage >= 95) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  // Get status badge
  const getStatusBadge = (status) => {
    if (status === 'critical') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <AlertTriangle className="h-3 w-3" />
          Critical
        </span>
      );
    }
    if (status === 'warning') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
          <AlertTriangle className="h-3 w-3" />
          Warning
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <Activity className="h-3 w-3" />
          Healthy
        </span>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Users className="h-5 w-5 text-emerald-600" />
            Bot Bu Global Usage
          </DialogTitle>
          <DialogDescription>
            Real-time API usage statistics for all users
          </DialogDescription>
        </DialogHeader>

        {loading && !usage ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : usage ? (
          <div className="space-y-6">
            {/* Status Badge */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">System Status</span>
              {getStatusBadge(usage.status)}
            </div>

            {/* Lifetime Stats Card */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Total Requests</p>
                  <p className="text-2xl font-bold text-emerald-700 mt-1">
                    {usage.totalRequests?.toLocaleString() || 0}
                  </p>
                  <p className="text-xs text-emerald-600 mt-1">
                    Since {usage.firstRequestDate ? new Date(usage.firstRequestDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <Activity className="h-10 w-10 text-emerald-400" />
              </div>
            </div>

            {/* Warning Alert */}
            {usage.warnings.dailyCritical && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Critical: Daily Limit Almost Reached!</AlertTitle>
                <AlertDescription>
                  Over 95% of daily requests used. Service may be limited soon.
                </AlertDescription>
              </Alert>
            )}

            {usage.warnings.dailyWarning && !usage.warnings.dailyCritical && (
              <Alert variant="warning">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Warning: High Daily Usage</AlertTitle>
                <AlertDescription>
                  Over 80% of daily requests used. Please use sparingly.
                </AlertDescription>
              </Alert>
            )}

            {/* Daily Usage */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-medium">Requests Today</span>
                </div>
                <span className="text-lg font-bold">
                  {usage.requestsToday.toLocaleString()} / {usage.dailyLimit.toLocaleString()}
                </span>
              </div>
              
              <Progress 
                value={usage.dailyPercentage} 
                className="h-3"
                style={{
                  '--progress-color': usage.dailyPercentage >= 95 ? '#ef4444' : 
                                     usage.dailyPercentage >= 80 ? '#eab308' : '#10b981'
                }}
              />
              
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{usage.dailyPercentage.toFixed(1)}% used</span>
                <span>{usage.dailyRemaining.toLocaleString()} remaining</span>
              </div>
            </div>

            {/* Minute Usage */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-medium">Requests This Minute</span>
                </div>
                <span className="text-lg font-bold">
                  {usage.requestsThisMinute.toLocaleString()} / {usage.minuteLimit.toLocaleString()}
                </span>
              </div>
              
              <Progress 
                value={usage.minutePercentage} 
                className="h-3"
              />
              
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{usage.minutePercentage.toFixed(1)}% used</span>
                <span>{usage.minuteRemaining.toLocaleString()} remaining</span>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-emerald-900">
                  <p className="font-medium mb-1">Shared Across All Users</p>
                  <p className="text-emerald-700">
                    These limits are global for the entire Bot Bu application. 
                    All judges and users share the same API quota.
                  </p>
                </div>
              </div>
            </div>

            {/* Auto-refresh indicator */}
            <div className="text-center text-xs text-gray-400">
              Auto-refreshing every 5 seconds...
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
