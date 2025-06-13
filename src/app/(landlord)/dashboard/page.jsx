'use client'
import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardStats from '@/components/dashboard/DashboardStats';
import RecentPayments from '@/components/dashboard/RecentPayments';
import MaintenanceStatus from '@/components/dashboard/MaintenanceStatus';
import Breadcrumbs from '@/components/Breadcrumbs';
import { 
  AlertCircle, 
  RefreshCw, 
  Plus,
  Home,
  Users,
  Wrench,
  CreditCard,
  EyeIcon
} from 'lucide-react';

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState({
    payments: [],
    maintenance: [],
    stats: {
      properties: 0,
      tenants: 0,
      rent: 0,
      occupancy: 0,
      overdueRentals: 0,
      overdueAmount: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      console.log('Fetching dashboard data...');
      
      // Fetch all data in parallel with better error handling
      const [paymentsRes, statsRes] = await Promise.allSettled([
        fetch('/api/payments?limit=5').then(res => {
          console.log('Payments API response status:', res.status);
          return res;
        }),
        fetch('/api/dashboard/stats').then(res => {
          console.log('Stats API response status:', res.status);
          return res;
        })
      ]);

      // Process payments data
      let paymentsData = [];
      if (paymentsRes.status === 'fulfilled' && paymentsRes.value?.ok) {
        try {
          const result = await paymentsRes.value.json();
          console.log('Payments data received:', result);
          // Handle different response formats
          if (Array.isArray(result)) {
            paymentsData = result;
          } else if (result.payments) {
            paymentsData = result.payments;
          } else if (result.data) {
            paymentsData = result.data;
          } else {
            paymentsData = [];
          }
        } catch (jsonError) {
          console.error('Error parsing payments JSON:', jsonError);
          paymentsData = [];
        }
      } else {
        console.warn('Payments API failed:', paymentsRes.reason || 'Unknown error');
      }

      // Process stats data
      let statsData = {
        properties: 0,
        tenants: 0,
        rent: 0,
        occupancy: 0,
        overdueRentals: 0,
        overdueAmount: 0
      };
      
      if (statsRes.status === 'fulfilled' && statsRes.value?.ok) {
        try {
          const result = await statsRes.value.json();
          console.log('Stats data received:', result);
          statsData = { ...statsData, ...result };
        } catch (jsonError) {
          console.error('Error parsing stats JSON:', jsonError);
          await calculateFallbackStats(statsData);
        }
      } else {
        console.warn('Stats API failed, calculating fallback stats...');
        await calculateFallbackStats(statsData);
      }

      // For now, set empty maintenance until you have the API
      const maintenanceData = [];

      setDashboardData({
        payments: Array.isArray(paymentsData) ? paymentsData : [],
        maintenance: Array.isArray(maintenanceData) ? maintenanceData : [],
        stats: statsData
      });

      setError('');
      console.log('Dashboard data updated successfully');
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message);
      
      // Set fallback data on error
      setDashboardData(prev => ({
        ...prev,
        stats: {
          properties: 0,
          tenants: 0,
          rent: 0,
          occupancy: 0,
          overdueRentals: 0,
          overdueAmount: 0
        }
      }));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateFallbackStats = async (statsData) => {
    try {
      console.log('Calculating fallback stats...');
      
      // Try to get basic counts from individual endpoints
      const [propertiesRes, leasesRes] = await Promise.allSettled([
        fetch('/api/properties'),
        fetch('/api/leases?status=active')
      ]);

      // Get properties count
      if (propertiesRes.status === 'fulfilled' && propertiesRes.value?.ok) {
        try {
          const propertiesResult = await propertiesRes.value.json();
          console.log('Properties fallback data:', propertiesResult);
          
          if (propertiesResult.pagination?.totalCount) {
            statsData.properties = propertiesResult.pagination.totalCount;
          } else if (propertiesResult.totalCount) {
            statsData.properties = propertiesResult.totalCount;
          } else if (Array.isArray(propertiesResult)) {
            statsData.properties = propertiesResult.length;
          } else if (propertiesResult.data && Array.isArray(propertiesResult.data)) {
            statsData.properties = propertiesResult.data.length;
          }
        } catch (error) {
          console.error('Error parsing properties fallback data:', error);
        }
      }

      // Get tenants count and calculate other stats from leases
      if (leasesRes.status === 'fulfilled' && leasesRes.value?.ok) {
        try {
          const leasesResult = await leasesRes.value.json();
          console.log('Leases fallback data:', leasesResult);
          
          let leases = [];
          if (Array.isArray(leasesResult)) {
            leases = leasesResult;
          } else if (leasesResult.leases && Array.isArray(leasesResult.leases)) {
            leases = leasesResult.leases;
          } else if (leasesResult.data && Array.isArray(leasesResult.data)) {
            leases = leasesResult.data;
          }
          
          if (leases.length > 0) {
            // Active tenants = active leases
            statsData.tenants = leases.length;
            
            // Calculate total monthly rent
            statsData.rent = leases.reduce((sum, lease) => {
              return sum + (lease.monthlyRent || 0);
            }, 0);
            
            // Calculate occupancy rate
            if (statsData.properties > 0) {
              statsData.occupancy = Math.round((leases.length / statsData.properties) * 100);
            }
            
            // Calculate overdue rentals
            const currentDate = new Date();
            const overdueLeases = leases.filter(lease => {
              const balanceDue = lease.balanceDue || 0;
              const nextPaymentDue = lease.nextPaymentDue ? new Date(lease.nextPaymentDue) : null;
              return balanceDue > 0 && nextPaymentDue && nextPaymentDue < currentDate;
            });
            
            statsData.overdueRentals = overdueLeases.length;
            statsData.overdueAmount = overdueLeases.reduce((sum, lease) => {
              return sum + (lease.balanceDue || 0);
            }, 0);
          }
        } catch (error) {
          console.error('Error parsing leases fallback data:', error);
        }
      }
      
      console.log('Fallback stats calculated:', statsData);
    } catch (fallbackError) {
      console.error('Error calculating fallback stats:', fallbackError);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefresh = () => {
    fetchDashboardData(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto p-4">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          </div>
          <Breadcrumbs />
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading dashboard data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className='mr-2'>
            <h1 className="text-lg md:text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 hidden md:block">Welcome back! Here's your property overview.</p>
          </div>
          <div className="flex items-center space-x-2 md:space-x-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center px-3 py-2 md:border md:border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`w-4 h-4 md:mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              <p className='hidden md:block'>{refreshing ? 'Refreshing...' : 'Refresh'}</p>
            </button>
            <Link
              href="/dashboard/analytics"
              className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <EyeIcon className={`w-4 h-4 md:mr-2`}></EyeIcon>
              <span className='hidden md:block'>View Analytics</span>
            </Link>
          </div>
        </div>
        
        <Breadcrumbs />
        
        {/* Error Display */}
        {error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800">
                  Dashboard Data Warning
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Some dashboard data may be incomplete or unavailable. The system is displaying available information.
                </p>
                {process.env.NODE_ENV === 'development' && (
                  <details className="mt-2">
                    <summary className="text-xs text-yellow-600 cursor-pointer hover:text-yellow-800">
                      Technical Details (Dev Mode)
                    </summary>
                    <p className="text-xs text-yellow-600 mt-1 font-mono bg-yellow-100 p-2 rounded">
                      {error}
                    </p>
                  </details>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Dashboard Stats */}
        <div className="mb-8">
          <DashboardStats 
            properties={dashboardData.stats.properties}
            tenants={dashboardData.stats.tenants}
            rent={dashboardData.stats.rent}
            occupancy={dashboardData.stats.occupancy}
            overdueRentals={dashboardData.stats.overdueRentals}
            overdueAmount={dashboardData.stats.overdueAmount}
          />
        </div>
        
        {/* Dashboard Widgets */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
          <RecentPayments payments={dashboardData.payments} />
          <MaintenanceStatus requests={dashboardData.maintenance} />
        </div>
        
        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Plus className="w-5 h-5 mr-2 text-blue-600" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/payments/record"
              className="flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors group"
            >
              <CreditCard className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
              Record Payment
            </Link>
            <Link
              href="/properties/add"
              className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors group"
            >
              <Home className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
              Add Property
            </Link>
            <Link
              href="/tenants/add"
              className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors group"
            >
              <Users className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
              Add Tenant
            </Link>
            <Link
              href="/maintenance/new"
              className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors group"
            >
              <Wrench className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
              Log Maintenance
            </Link>
          </div>
        </div>

        {/* Data Summary Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          Last updated: {new Date().toLocaleString()}
          {dashboardData.payments.length > 0 && (
            <span className="ml-4">
              • {dashboardData.payments.length} recent payments displayed
            </span>
          )}
        </div>
      </div>
    </div>
  );
}