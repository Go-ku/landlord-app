// src/hooks/useDashboardAnalytics.js
import { useState, useEffect, useCallback } from 'react';

export function useDashboardAnalytics(initialPeriod = 'current') {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState(initialPeriod);

  const fetchAnalytics = useCallback(async (selectedPeriod = period, forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      const url = forceRefresh 
        ? `/api/dashboard/analytics?period=${selectedPeriod}&refresh=true`
        : `/api/dashboard/analytics?period=${selectedPeriod}`;

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  const changePeriod = useCallback((newPeriod) => {
    setPeriod(newPeriod);
  }, []);

  const refresh = useCallback(() => {
    fetchAnalytics(period, true);
  }, [fetchAnalytics, period]);

  useEffect(() => {
    fetchAnalytics(period);
  }, [period, fetchAnalytics]);

  return {
    analytics,
    loading,
    error,
    period,
    changePeriod,
    refresh,
    // Computed values for easy access
    summary: analytics?.summary,
    trends: analytics?.trends,
    breakdowns: analytics?.breakdowns,
    alerts: analytics?.alerts,
    overdueCount: analytics?.alerts?.overdueDetails?.length || 0,
    expiringLeasesCount: analytics?.alerts?.expiringLeases?.length || 0
  };
}

// Usage example:
// const { analytics, loading, changePeriod, refresh } = useDashboardAnalytics();