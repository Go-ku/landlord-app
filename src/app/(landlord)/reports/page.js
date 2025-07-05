// src/app/reports/page.js
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import dbConnect from 'lib/db';
import Property from 'models/Property';
import User from 'models/User';
import Lease from 'models/Lease';
import Payment from 'models/Payment';
import Maintenance from 'models/Maintenance';
import ReportsClient from './ReportsClient';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign,
  Home,
  Users,
  AlertCircle
} from 'lucide-react';

// Helper function to serialize MongoDB data
function serializeData(data) {
  if (!data) return null;
  
  return JSON.parse(JSON.stringify(data, (key, value) => {
    if (value && typeof value === 'object' && value.constructor?.name === 'ObjectId') {
      return value.toString();
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  }));
}

async function getReportsData(userId, userRole) {
  try {
    await dbConnect();
    
    // Date ranges for analysis
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const currentYear = new Date(now.getFullYear(), 0, 1);
    const last12Months = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    
    let propertyFilter = {};
    let paymentFilter = {};
    let maintenanceFilter = {};
    
    // Role-based filtering
    if (userRole === 'landlord') {
      // Landlords see only their properties
      const landlordProperties = await Property.find({ landlord: userId }).select('_id').lean();
      const propertyIds = landlordProperties.map(p => p._id);
      
      propertyFilter = { _id: { $in: propertyIds } };
      paymentFilter = { property: { $in: propertyIds } };
      maintenanceFilter = { propertyId: { $in: propertyIds } };
    } else if (['manager', 'admin'].includes(userRole)) {
      // Managers and admins see all data
      // No additional filtering needed
    } else {
      // Other roles should not access reports
      throw new Error('Unauthorized access to reports');
    }

    // Fetch all required data in parallel
    const [
      // Properties data
      totalProperties,
      availableProperties,
      
      // Tenants data
      totalTenants,
      activeTenants,
      
      // Leases data
      activeLeases,
      expiringLeases,
      
      // Payments data
      totalPayments,
      currentMonthPayments,
      lastMonthPayments,
      currentYearPayments,
      monthlyPaymentTrends,
      
      // Maintenance data
      totalMaintenanceRequests,
      pendingMaintenance,
      completedMaintenance,
      
      // Occupancy data
      occupancyData
    ] = await Promise.allSettled([
      // Properties
      Property.countDocuments(propertyFilter),
      Property.countDocuments({ ...propertyFilter, isAvailable: true }),
      
      // Tenants
      User.countDocuments({ role: 'tenant' }),
      User.countDocuments({ role: 'tenant', isActive: true }),
      
      // Leases
      Lease.countDocuments({ status: 'active' }),
      Lease.find({ 
        status: 'active',
        endDate: { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } // Next 30 days
      }).countDocuments(),
      
      // Payments
      Payment.countDocuments(paymentFilter),
      Payment.aggregate([
        { $match: { ...paymentFilter, paymentDate: { $gte: currentMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Payment.aggregate([
        { $match: { ...paymentFilter, paymentDate: { $gte: lastMonth, $lt: currentMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Payment.aggregate([
        { $match: { ...paymentFilter, paymentDate: { $gte: currentYear } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      
      // Monthly payment trends (last 12 months)
      Payment.aggregate([
        { $match: { ...paymentFilter, paymentDate: { $gte: last12Months } } },
        {
          $group: {
            _id: {
              year: { $year: '$paymentDate' },
              month: { $month: '$paymentDate' }
            },
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      
      // Maintenance
      Maintenance.countDocuments(maintenanceFilter),
      Maintenance.countDocuments({ ...maintenanceFilter, status: 'Pending' }),
      Maintenance.countDocuments({ ...maintenanceFilter, status: 'Completed' }),
      
      // Occupancy calculation
      Property.aggregate([
        { $match: propertyFilter },
        {
          $lookup: {
            from: 'leases',
            localField: '_id',
            foreignField: 'propertyId',
            as: 'leases'
          }
        },
        {
          $addFields: {
            isOccupied: {
              $gt: [
                {
                  $size: {
                    $filter: {
                      input: '$leases',
                      as: 'lease',
                      cond: { $eq: ['$$lease.status', 'active'] }
                    }
                  }
                },
                0
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            totalProperties: { $sum: 1 },
            occupiedProperties: {
              $sum: {
                $cond: ['$isOccupied', 1, 0]
              }
            }
          }
        }
      ])
    ]);

    // Process results safely
    const getResultValue = (result) => result.status === 'fulfilled' ? result.value : null;

    // Calculate metrics
    const currentMonthRevenue = getResultValue(currentMonthPayments)?.[0]?.total || 0;
    const lastMonthRevenue = getResultValue(lastMonthPayments)?.[0]?.total || 0;
    const currentYearRevenue = getResultValue(currentYearPayments)?.[0]?.total || 0;
    
    const revenueGrowth = lastMonthRevenue > 0 
      ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
      : 0;

    const occupancyStats = getResultValue(occupancyData)?.[0] || { totalProperties: 0, occupiedProperties: 0 };
    const occupancyRate = occupancyStats.totalProperties > 0 
      ? (occupancyStats.occupiedProperties / occupancyStats.totalProperties * 100).toFixed(1)
      : 0;

    // Process monthly trends
    const monthlyTrends = getResultValue(monthlyPaymentTrends) || [];
    const last12MonthsData = [];
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthData = monthlyTrends.find(t => 
        t._id.year === date.getFullYear() && t._id.month === date.getMonth() + 1
      );
      
      last12MonthsData.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: monthData?.totalAmount || 0,
        payments: monthData?.count || 0
      });
    }

    return {
      overview: {
        totalProperties: getResultValue(totalProperties) || 0,
        availableProperties: getResultValue(availableProperties) || 0,
        totalTenants: getResultValue(totalTenants) || 0,
        activeTenants: getResultValue(activeTenants) || 0,
        activeLeases: getResultValue(activeLeases) || 0,
        expiringLeases: getResultValue(expiringLeases) || 0,
        occupancyRate: parseFloat(occupancyRate),
        currentMonthRevenue,
        lastMonthRevenue,
        currentYearRevenue,
        revenueGrowth: parseFloat(revenueGrowth),
        totalPayments: getResultValue(totalPayments) || 0,
        totalMaintenanceRequests: getResultValue(totalMaintenanceRequests) || 0,
        pendingMaintenance: getResultValue(pendingMaintenance) || 0,
        completedMaintenance: getResultValue(completedMaintenance) || 0
      },
      trends: {
        monthlyRevenue: last12MonthsData
      },
      currentUser: { id: userId, role: userRole }
    };

  } catch (error) {
    console.error('Error fetching reports data:', error);
    return {
      overview: {
        totalProperties: 0,
        availableProperties: 0,
        totalTenants: 0,
        activeTenants: 0,
        activeLeases: 0,
        expiringLeases: 0,
        occupancyRate: 0,
        currentMonthRevenue: 0,
        lastMonthRevenue: 0,
        currentYearRevenue: 0,
        revenueGrowth: 0,
        totalPayments: 0,
        totalMaintenanceRequests: 0,
        pendingMaintenance: 0,
        completedMaintenance: 0
      },
      trends: { monthlyRevenue: [] },
      currentUser: { id: userId, role: userRole },
      error: error.message
    };
  }
}

export default async function ReportsPage({ searchParams }) {
  // Await searchParams for Next.js 15 compatibility
  const params = await searchParams;
  
  // Check authentication
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/reports');
  }

  // Check if user has permission to view reports
  const allowedRoles = ['landlord', 'manager', 'admin'];
  if (!allowedRoles.includes(session.user.role)) {
    redirect('/unauthorized?reason=insufficient_permissions');
  }

  const data = await getReportsData(session.user.id, session.user.role);
  
  // Handle errors
  if (data.error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Reports Error</h2>
          <p className="text-gray-600 mb-6">{data.error}</p>
          <a
            href="/dashboard"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <BarChart3 className="w-8 h-8 mr-3 text-blue-600" />
              Reports & Analytics
            </h1>
            <p className="text-gray-600 mt-2">
              {session.user.role === 'landlord' 
                ? 'Financial and operational insights for your property portfolio'
                : session.user.role === 'manager'
                ? 'Comprehensive reports across all managed properties'
                : 'System-wide analytics and performance metrics'
              }
            </p>
            
            {session.user.role === 'landlord' && data.overview.totalProperties > 0 && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Portfolio Overview:</strong> {data.overview.totalProperties} properties, 
                  {data.overview.occupancyRate}% occupancy rate
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Home className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Properties</p>
                <p className="text-2xl font-bold text-gray-900">{data.overview.totalProperties}</p>
                <p className="text-xs text-gray-500">{data.overview.availableProperties} available</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Tenants</p>
                <p className="text-2xl font-bold text-gray-900">{data.overview.activeTenants}</p>
                <p className="text-xs text-gray-500">{data.overview.activeLeases} active leases</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Occupancy Rate</p>
                <p className="text-2xl font-bold text-gray-900">{data.overview.occupancyRate}%</p>
                <p className="text-xs text-gray-500">
                  {data.overview.totalProperties - (data.overview.totalProperties * data.overview.occupancyRate / 100)} vacant
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  K{(data.overview.currentMonthRevenue / 1000).toFixed(1)}
                </p>
                <p className={`text-xs ${data.overview.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.overview.revenueGrowth >= 0 ? '+' : ''}{data.overview.revenueGrowth}% vs last month
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Reports Client Component */}
        <ReportsClient 
          initialData={serializeData(data)}
          userRole={session.user.role}
          searchParams={params}
        />
      </div>
    </div>
  );
}

export async function generateMetadata({ searchParams }) {
  // Await searchParams for Next.js 15 compatibility
  const params = await searchParams;
  
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return {
      title: 'Reports - Authentication Required',
      description: 'Please sign in to view reports',
    };
  }

  let title = 'Reports & Analytics - Property Management';
  let description = 'View comprehensive reports and analytics for property management';
  
  if (session.user.role === 'landlord') {
    title = 'Portfolio Reports - Property Management';
    description = 'Financial and operational insights for your property portfolio';
  } else if (session.user.role === 'manager') {
    title = 'Management Reports - Property Management';
    description = 'Comprehensive reports across all managed properties';
  } else if (session.user.role === 'admin') {
    title = 'System Analytics - Property Management';
    description = 'System-wide analytics and performance metrics';
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
  };
}