'use client'
import { useState, useEffect } from 'react';
import DashboardStats from '@/components/dashboard/DashboardStats';
import RecentPayments from '@/components/dashboard/RecentPayments';
import MaintenanceStatus from '@/components/dashboard/MaintenanceStatus';
import Breadcrumbs from '@/components/Breadcrumbs';
import { 
  AlertCircle, 
  RefreshCw, 
  TrendingUp, 
  Calendar,
  DollarSign,
  Users,
  AlertTriangle,
  Clock
} from 'lucide-react';

export default function EnhancedDashboardPage() {
  const [analytics, setAnalytics] = useState(null);
  const [basicStats, setBasicStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('current');
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async (period = 'current', isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Fetch both basic stats and detailed analytics
      const [statsRes, analyticsRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch(`/api/dashboard/analytics?period=${period}`)
      ]);

      let statsData = null;
      let analyticsData = null;

      if (statsRes.ok) {
        statsData = await statsRes.json();
      }

      if (analyticsRes.ok) {
        analyticsData = await analyticsRes.json();
      }

      setBasicStats(statsData);
      setAnalytics(analyticsData);
      setError('');
    } catch (err) {
      setError(err.message);
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(selectedPeriod);
  }, [selectedPeriod]);

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
  };

  const handleRefresh = () => {
    fetchAnalytics(selectedPeriod, true);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Enhanced Dashboard</h1>
          <p className="text-gray-600">Comprehensive property management analytics</p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Period Selector */}
          <select
            value={selectedPeriod}
            onChange={(e) => handlePeriodChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="current">This Month</option>
            <option value="last3months">Last 3 Months</option>
            <option value="last6months">Last 6 Months</option>
            <option value="year">This Year</option>
          </select>
          
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <Breadcrumbs />

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Analytics Warning</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Some analytics data may be incomplete. {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Basic Stats */}
      {basicStats && (
        <DashboardStats 
          properties={basicStats.properties}
          tenants={basicStats.tenants}
          rent={basicStats.rent}
          occupancy={basicStats.occupancy}
          overdueRentals={basicStats.overdueRentals}
          overdueAmount={basicStats.overdueAmount}
        />
      )}

      {/* Enhanced Analytics */}
      {analytics && (
        <>
          {/* Revenue Trends */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
              Revenue Trends
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  ZMW {analytics.summary?.thisMonthCollected?.toLocaleString() || '0'}
                </div>
                <div className="text-sm text-gray-500">This Month Collected</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  analytics.trends?.collectionTrend >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {analytics.trends?.collectionTrend > 0 ? '+' : ''}{analytics.trends?.collectionTrend || 0}%
                </div>
                <div className="text-sm text-gray-500">vs Last Month</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {analytics.summary?.collectionRate || 0}%
                </div>
                <div className="text-sm text-gray-500">Collection Rate</div>
              </div>
            </div>
            
            {/* Monthly Revenue Chart */}
            {analytics.trends?.monthlyRevenue && (
              <div className="mt-6">
                <h3 className="text-md font-medium mb-3">Monthly Revenue (Last 6 Months)</h3>
                <div className="space-y-2">
                  {analytics.trends.monthlyRevenue.map((month) => (
                    <div key={month.month} className="flex items-center justify-between py-2 border-b">
                      <span className="text-sm font-medium">{month.month}</span>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-600">
                          {month.paymentCount} payments
                        </span>
                        <span className="font-semibold">
                          ZMW {month.revenue.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Alerts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Overdue Rentals */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
                Overdue Rentals ({analytics.alerts?.overdueDetails?.length || 0})
              </h2>
              {analytics.alerts?.overdueDetails?.length > 0 ? (
                <div className="space-y-3">
                  {analytics.alerts.overdueDetails.slice(0, 5).map((overdue, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                      <div>
                        <p className="font-medium text-red-900">{overdue.tenantName}</p>
                        <p className="text-sm text-red-700">{overdue.propertyAddress}</p>
                        <p className="text-xs text-red-600">{overdue.daysOverdue} days overdue</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-red-900">
                          ZMW {overdue.amount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {analytics.alerts.overdueDetails.length > 5 && (
                    <p className="text-sm text-gray-500 text-center">
                      +{analytics.alerts.overdueDetails.length - 5} more overdue
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-green-600 text-center py-4">All rentals are current! 🎉</p>
              )}
            </div>

            {/* Expiring Leases */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-orange-600" />
                Expiring Leases (Next 90 Days)
              </h2>
              {analytics.alerts?.expiringLeases?.length > 0 ? (
                <div className="space-y-3">
                  {analytics.alerts.expiringLeases.slice(0, 5).map((lease, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                      <div>
                        <p className="font-medium text-orange-900">{lease.tenantName}</p>
                        <p className="text-sm text-orange-700">{lease.propertyAddress}</p>
                        <p className="text-xs text-orange-600">
                          Expires in {lease.daysUntilExpiry} days
                        </p>
                      </div>
                    </div>
                  ))}
                  {analytics.alerts.expiringLeases.length > 5 && (
                    <p className="text-sm text-gray-500 text-center">
                      +{analytics.alerts.expiringLeases.length - 5} more expiring
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-green-600 text-center py-4">No leases expiring soon</p>
              )}
            </div>
          </div>

          {/* Property Breakdown */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Property Analytics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Property Types */}
              <div>
                <h3 className="text-md font-medium mb-3">Property Types</h3>
                <div className="space-y-2">
                  {Object.entries(analytics.breakdowns?.propertyTypes || {}).map(([type, count]) => (
                    <div key={type} className="flex justify-between items-center">
                      <span className="text-sm">{type}</span>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <h3 className="text-md font-medium mb-3">Payment Methods</h3>
                <div className="space-y-2">
                  {Object.entries(analytics.breakdowns?.paymentMethods || {}).map(([method, count]) => (
                    <div key={method} className="flex justify-between items-center">
                      <span className="text-sm">
                        {method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <RecentPayments payments={analytics.recentPayments || []} />
            <MaintenanceStatus requests={analytics.recentMaintenance || []} />
          </div>
        </>
      )}

      {/* Last Updated */}
      {analytics?.meta?.lastUpdated && (
        <div className="text-center text-sm text-gray-500">
          Last updated: {new Date(analytics.meta.lastUpdated).toLocaleString()}
        </div>
      )}
    </div>
  );
}