import { useState, useEffect, useCallback } from 'react';
import { ENDPOINTS } from '../constants/Api';

/**
 * Hook to fetch global usage stats from the backend.
 * Mirrors UsageDialog.jsx fetch logic.
 */
export function useUsageStats(enabled = false) {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsage = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(ENDPOINTS.USAGE);
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
  }, []);

  useEffect(() => {
    if (enabled) {
      fetchUsage();
      const interval = setInterval(fetchUsage, 5000);
      return () => clearInterval(interval);
    }
  }, [enabled, fetchUsage]);

  return { usage, loading, error, refetch: fetchUsage };
}
