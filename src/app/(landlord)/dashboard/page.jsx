// app/dashboard/page.tsx (Server Component)
import Link from 'next/link';
import DashboardStats from '@/components/dashboard/DashboardStats';
import RecentPayments from '@/components/dashboard/RecentPayments';
import MaintenanceStatus from '@/components/dashboard/MaintenanceStatus';
import Breadcrumbs from '@/components/Breadcrumbs';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import ErrorDisplay from '@/components/dashboard/ErrorDisplay';
import { 
  Plus,
  Home,
  Users,
  Wrench,
  CreditCard,
} from 'lucide-react';


// Server-side data fetching functions
async function fetchDashboardStats() {
  const defaultStats = {
    properties: 0,
    tenants: 0,
    rent: 0,
    occupancy: 0,
    overdueRentals: 0,
    overdueAmount: 0
  };

  try {
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/dashboard/stats`, {
      next: { revalidate: 300 }, // Revalidate every 5 minutes
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      console.warn('Stats API failed, calculating fallback stats...');
      return await calculateFallbackStats(defaultStats);
    }

    const result = await response.json();
    return { ...defaultStats, ...result };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return await calculateFallbackStats(defaultStats);
  }
}

async function fetchRecentPayments() {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/payments?limit=5`, {
      next: { revalidate: 60 }, // Revalidate every minute for payments
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      console.warn('Payments API failed');
      return [];
    }

    const result = await response.json();
    
    // Handle different response formats
    if (Array.isArray(result)) {
      return result;
    } else if (result.payments) {
      return result.payments;
    } else if (result.data) {
      return result.data;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching payments:', error);
    return [];
  }
}

async function fetchMaintenanceRequests(){
  try {
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/maintenance?limit=5`, {
      next: { revalidate: 300 }, // Revalidate every 5 minutes
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      return [];
    }

    const result = await response.json();
    
    if (Array.isArray(result)) {
      return result;
    } else if (result.maintenance) {
      return result.maintenance;
    } else if (result.data) {
      return result.data;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching maintenance requests:', error);
    return [];
  }
}

async function calculateFallbackStats(statsData) {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';
    
    const [propertiesRes, leasesRes] = await Promise.allSettled([
      fetch(`${baseUrl}/api/properties`, {
        next: { revalidate: 3600 }, // Properties change less frequently
        headers: { 'Content-Type': 'application/json' }
      }),
      fetch(`${baseUrl}/api/leases?status=active`, {
        next: { revalidate: 300 },
        headers: { 'Content-Type': 'application/json' }
      })
    ]);

    // Get properties count
    if (propertiesRes.status === 'fulfilled' && propertiesRes.value?.ok) {
      try {
        const propertiesResult = await propertiesRes.value.json();
        
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
          const overdueLeases = leases.filter((lease) => {
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
    
    return statsData;
  } catch (fallbackError) {
    console.error('Error calculating fallback stats:', fallbackError);
    return statsData;
  }
}

async function getDashboardData() {
  try {
    // Fetch all data in parallel
    const [stats, payments, maintenance] = await Promise.allSettled([
      fetchDashboardStats(),
      fetchRecentPayments(),
      fetchMaintenanceRequests()
    ]);

    return {
      stats: stats.status === 'fulfilled' ? stats.value : {
        properties: 0,
        tenants: 0,
        rent: 0,
        occupancy: 0,
        overdueRentals: 0,
        overdueAmount: 0
      },
      payments: payments.status === 'fulfilled' ? payments.value : [],
      maintenance: maintenance.status === 'fulfilled' ? maintenance.value : [],
      error: stats.status === 'rejected' || payments.status === 'rejected' || maintenance.status === 'rejected' 
        ? 'Some dashboard data may be incomplete or unavailable' 
        : undefined
    };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return {
      stats: {
        properties: 0,
        tenants: 0,
        rent: 0,
        occupancy: 0,
        overdueRentals: 0,
        overdueAmount: 0
      },
      payments: [],
      maintenance: [],
      error: 'Failed to load dashboard data'
    };
  }
}

// Main Dashboard Server Component
export default async function DashboardPage() {
  const dashboardData = await getDashboardData();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4">
        {/* Header with client-side refresh functionality */}
        <DashboardHeader />
        
        <Breadcrumbs />
        
        {/* Error Display */}
        {dashboardData.error && (
          <ErrorDisplay error={dashboardData.error} />
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

// Generate metadata for the page
export const metadata = {
  title: 'Dashboard | Property Management',
  description: 'Property management dashboard with overview of properties, tenants, and recent activity.',
};

// Optional: Add revalidation at the page level
export const revalidate = 300; // Revalidate every 5 minutes