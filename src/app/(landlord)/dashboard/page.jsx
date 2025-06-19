// Solution 1: Direct Database Access in Server Component
// app/dashboard/page.tsx (Updated Server Component)
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import DashboardStats from '@/components/dashboard/DashboardStats';
import RecentPayments from '@/components/dashboard/RecentPayments';
import MaintenanceStatus from '@/components/dashboard/MaintenanceStatus';
import Breadcrumbs from '@/components/Breadcrumbs';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import ErrorDisplay from '@/components/dashboard/ErrorDisplay';
import dbConnect from 'lib/db';
// Import models
import Payment from 'models';
import Property from 'models';
import Lease from 'models';
import User from 'models';
import Maintenance from 'models/Maintenance';
import mongoose from 'mongoose';
import { 
  Plus,
  Home,
  Users,
  Wrench,
  CreditCard,
} from 'lucide-react';



// Helper function to get models
function getModels() {
  return {
    Payment: mongoose.model('Payment'),
    Property: mongoose.model('Property'),
    Lease: mongoose.model('Lease'),
    User: mongoose.model('User'),
    Maintenance: mongoose.model('Maintenance')
  };
}

// Server-side data fetching functions (Updated to use direct DB access)
async function fetchDashboardStats(userId, userRole) {
  const defaultStats = {
    properties: 0,
    tenants: 0,
    rent: 0,
    occupancy: 0,
    overdueRentals: 0,
    overdueAmount: 0
  };

  try {
    await dbConnect();
    const { Property, Lease } = getModels();

    let propertyFilter = {};
    let leaseFilter = {};
    let propertyIds = []
    // Apply role-based filtering
    if (userRole === 'landlord') {
      propertyFilter = { landlord: userId };
      // Get landlord's properties first, then filter leases
      const landlordProperties = await Property.find(propertyFilter).select('_id');
      propertyIds = landlordProperties.map(p => p._id);
      
      leaseFilter = { propertyId: { $in: propertyIds }, status: 'active' };
    } else if (userRole === 'tenant') {
      leaseFilter = { tenant: userId, status: 'active' };
    } else if (['manager', 'admin'].includes(userRole)) {
      leaseFilter = { status: 'active' };
    }
    
    // Get properties count
    const propertiesCount = await Property.countDocuments(propertyFilter);

    // Get active leases
    const leases = await Lease.find(leaseFilter);
  
    // Calculate stats
    const stats = {
      properties: propertiesCount,
      tenants: leases.length,
      rent: leases.reduce((sum, lease) => sum + (lease.monthlyRent || 0), 0),
      occupancy: propertiesCount > 0 ? Math.round((leases.length / propertiesCount) * 100) : 0,
      overdueRentals: 0,
      overdueAmount: 0
    };

    // Calculate overdue rentals
    const currentDate = new Date();
    const overdueLeases = leases.filter(lease => {
      const balanceDue = lease.balanceDue || 0;
      const nextPaymentDue = lease.nextPaymentDue ? new Date(lease.nextPaymentDue) : null;
      return balanceDue > 0 && nextPaymentDue && nextPaymentDue < currentDate;
    });

    stats.overdueRentals = overdueLeases.length;
    stats.overdueAmount = overdueLeases.reduce((sum, lease) => sum + (lease.balanceDue || 0), 0);

    return stats;
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return defaultStats;
  }
}

async function fetchRecentPayments(userId, userRole) {
  try {
    await dbConnect();
    const { Payment, Property } = getModels();

    let filter = {};

    // Apply role-based filtering
    if (userRole === 'tenant') {
      filter = { tenant: userId };
    } else if (userRole === 'landlord') {
      const landlordProperties = await Property.find({ landlord: userId }).select('_id');
      const propertyIds = landlordProperties.map(p => p._id);
      filter = { property: { $in: propertyIds } };
    }
    // Managers and admins can see all payments (no filter)

    const payments = await Payment.find(filter)
      .populate('tenant', 'firstName lastName name email')
      .populate('property', 'address city name')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Transform for frontend
    return payments.map(payment => ({
      id: payment._id.toString(),
      amount: payment.amount,
      date: payment.paymentDate || payment.createdAt,
      tenant: payment.tenant?.firstName ? 
        `${payment.tenant.firstName} ${payment.tenant.lastName}` : 
        payment.tenant?.name || 'Unknown',
      property: payment.property?.address || payment.property?.name || 'Unknown Property',
      status: payment.status
    }));
  } catch (error) {
    console.error('Error fetching recent payments:', error);
    return [];
  }
}

async function fetchMaintenanceRequests(userId, userRole){
  try {
    await dbConnect();
    const { Maintenance, Property } = getModels();

    let filter = {};

    // Apply role-based filtering
    if (userRole === 'tenant') {
      filter = { tenant: userId };
    } else if (userRole === 'landlord') {
      const landlordProperties = await Property.find({ landlord: userId }).select('_id');
      const propertyIds = landlordProperties.map(p => p._id);
      filter = { property: { $in: propertyIds } };
    }
    // Managers and admins can see all requests (no filter)

    const requests = await Maintenance.find(filter)
      .populate('property', 'address city name')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Transform for frontend
    return requests.map(request => ({
      id: request._id.toString(),
      title: request.title || request.description?.substring(0, 50) || 'Maintenance Request',
      priority: request.priority || 'medium',
      status: request.status,
      property: request.property?.address || request.property?.name || 'Unknown Property',
      date: request.createdAt
    }));
  } catch (error) {
    console.error('Error fetching maintenance requests:', error);
    return [];
  }
}

async function getDashboardData(userId, userRole){
  try {
    // Fetch all data in parallel
    const [stats, payments, maintenance] = await Promise.allSettled([
      fetchDashboardStats(userId, userRole),
      fetchRecentPayments(userId, userRole),
      fetchMaintenanceRequests(userId, userRole)
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
        ? 'Some dashboard data may be incomplete' 
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
  // Get session on the server
  const session = await getServerSession(authOptions);

  // Redirect if not authenticated
  if (!session?.user) {
    redirect('/auth/login');
  }

  // Fetch dashboard data with user context
  const dashboardData = await getDashboardData(session.user.id, session.user.role);

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
