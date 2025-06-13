// app/admin/dashboard/page.js - Fixed with Proper Null Checks
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import dbConnect from 'lib/db';
import User from 'models/User';
import Property from 'models/Property';
import Payment from 'models/Payment';
import Invoice from 'models/Invoice';
import Breadcrumbs from '@/components/Breadcrumbs';
import { 
  Shield, 
  DollarSign, 
  FileText, 
  Users, 
  Building, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  CreditCard,
  Calendar,
  Eye,
  Plus,
  ArrowRight,
  MapPin,
  User as UserIcon,
  AlertCircle as AlertIcon
} from 'lucide-react';

// Fetch admin dashboard data based on assigned properties
async function getAdminDashboardData(userId) {
  try {
    await dbConnect();
    
    // Get the admin user with assigned properties
    const adminUser = await User.findById(userId)
      .populate('assignedProperties.property', 'address type monthlyRent landlord')
      .populate('assignedProperties.assignedBy', 'name')
      .populate('supervisedBy', 'name email');

    if (!adminUser || adminUser.role !== 'admin') {
      throw new Error('Admin user not found');
    }

    // Get active property assignments
    const activeAssignments = adminUser.assignedProperties?.filter(assignment => assignment.isActive) || [];
    const assignedPropertyIds = activeAssignments.map(assignment => assignment.property?._id).filter(Boolean);

    if (assignedPropertyIds.length === 0) {
      return {
        adminUser,
        assignedProperties: [],
        stats: {
          assignedProperties: 0,
          pendingPayments: 0,
          pendingInvoices: 0,
          totalRevenue: 0,
          monthlyPaymentCount: 0,
          monthlyInvoiceCount: 0
        },
        recentPayments: [],
        recentInvoices: [],
        pendingPayments: [],
        pendingInvoices: []
      };
    }

    const today = new Date();
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Get statistics for assigned properties only
    const [
      monthlyPayments,
      monthlyInvoices,
      pendingPayments,
      pendingInvoices,
      recentPayments,
      recentInvoices
    ] = await Promise.all([
      // Monthly payments for assigned properties
      Payment.aggregate([
        { 
          $match: { 
            property: { $in: assignedPropertyIds },
            paymentDate: { $gte: thisMonth },
            approvalStatus: 'approved'
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      
      // Monthly invoices for assigned properties
      Invoice.aggregate([
        { 
          $match: { 
            property: { $in: assignedPropertyIds },
            issueDate: { $gte: thisMonth },
            approvalStatus: 'approved'
          }
        },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
      ]),
      
      // Pending payments awaiting approval
      Payment.find({
        property: { $in: assignedPropertyIds },
        recordedBy: userId,
        approvalStatus: 'pending'
      }).populate('tenant', 'name').populate('property', 'address').limit(10),
      
      // Pending invoices awaiting approval
      Invoice.find({
        property: { $in: assignedPropertyIds },
        createdBy: userId,
        approvalStatus: 'pending'
      }).populate('tenant', 'name').populate('property', 'address').limit(10),
      
      // Recent payments recorded by this admin
      Payment.find({
        property: { $in: assignedPropertyIds },
        recordedBy: userId
      })
        .populate('tenant', 'name')
        .populate('property', 'address')
        .sort({ createdAt: -1 })
        .limit(5),
      
      // Recent invoices created by this admin
      Invoice.find({
        property: { $in: assignedPropertyIds },
        createdBy: userId
      })
        .populate('tenant', 'name')
        .populate('property', 'address')
        .sort({ createdAt: -1 })
        .limit(5)
    ]);

    const stats = {
      assignedProperties: assignedPropertyIds.length,
      pendingPayments: pendingPayments?.length || 0,
      pendingInvoices: pendingInvoices?.length || 0,
      totalRevenue: (monthlyPayments[0]?.total || 0) + (monthlyInvoices[0]?.total || 0),
      monthlyPaymentCount: monthlyPayments[0]?.count || 0,
      monthlyInvoiceCount: monthlyInvoices[0]?.count || 0
    };

    return {
      adminUser,
      assignedProperties: activeAssignments,
      stats,
      recentPayments: recentPayments || [],
      recentInvoices: recentInvoices || [],
      pendingPayments: pendingPayments || [],
      pendingInvoices: pendingInvoices || []
    };
  } catch (error) {
    console.error('Error fetching admin dashboard data:', error);
    throw error;
  }
}

// Loading component
function AdminDashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-200 rounded animate-pulse mr-3"></div>
            <div className="w-48 h-8 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
        
        <div className="w-full h-6 bg-gray-200 rounded animate-pulse mb-6"></div>
        
        {/* Stats loading */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="w-full h-20 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
        
        {/* Content loading */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="w-full h-40 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Admin info component
function AdminInfo({ adminUser }) {
  if (!adminUser) return null;
  
  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow p-6 text-white mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Welcome, {adminUser.name}</h2>
          <p className="text-blue-100 mt-1">
            {adminUser.adminLevel ? 
              adminUser.adminLevel.charAt(0).toUpperCase() + adminUser.adminLevel.slice(1) + ' Admin' :
              'Admin Assistant'
            }
          </p>
          {adminUser.supervisedBy && (
            <p className="text-blue-100 text-sm mt-1">
              Supervised by {adminUser.supervisedBy.name}
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">
            {adminUser.assignedProperties?.filter(a => a.isActive).length || 0}
          </div>
          <div className="text-blue-100 text-sm">Assigned Properties</div>
        </div>
      </div>
    </div>
  );
}

// Stats Cards Component
function AdminStatsCards({ stats = {}, adminLevel = 'financial' }) {
  const formatCurrency = (amount) => `ZMW ${(amount || 0).toLocaleString()}`;
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Assigned Properties */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Building className="w-6 h-6 text-blue-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Assigned Properties</p>
            <p className="text-2xl font-bold text-gray-900">{stats.assignedProperties || 0}</p>
            <p className="text-xs text-gray-500">
              Your responsibility
            </p>
          </div>
        </div>
      </div>

      {/* Monthly Revenue */}
      {(adminLevel === 'financial' || adminLevel === 'assistant') && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.totalRevenue)}
              </p>
              <p className="text-xs text-gray-500">
                {stats.monthlyPaymentCount || 0} payments
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pending Payments */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="p-3 bg-orange-100 rounded-lg">
            <Clock className="w-6 h-6 text-orange-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Pending Payments</p>
            <p className="text-2xl font-bold text-gray-900">{stats.pendingPayments || 0}</p>
            <p className="text-xs text-gray-500">
              Awaiting approval
            </p>
          </div>
        </div>
      </div>

      {/* Pending Invoices */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="p-3 bg-purple-100 rounded-lg">
            <FileText className="w-6 h-6 text-purple-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Pending Invoices</p>
            <p className="text-2xl font-bold text-gray-900">{stats.pendingInvoices || 0}</p>
            <p className="text-xs text-gray-500">
              Awaiting approval
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Quick Actions Component
function QuickActions({ assignedProperties = [], adminLevel = 'financial' }) {
  const hasAssignedProperties = assignedProperties.length > 0;
  
  const actions = [
    {
      title: 'Log Payment',
      description: 'Record a payment from tenant',
      href: hasAssignedProperties ? '/admin/payments/new' : null,
      icon: CreditCard,
      color: 'green',
      disabled: !hasAssignedProperties
    },
    {
      title: 'Create Invoice',
      description: 'Generate invoice for tenant',
      href: hasAssignedProperties ? '/admin/invoices/new' : null,
      icon: FileText,
      color: 'blue',
      disabled: !hasAssignedProperties
    },
    {
      title: 'View Reports',
      description: 'Financial reports for assigned properties',
      href: hasAssignedProperties ? '/admin/reports' : null,
      icon: TrendingUp,
      color: 'purple',
      disabled: !hasAssignedProperties
    },
    {
      title: 'My Properties',
      description: 'View assigned properties',
      href: '/admin/properties',
      icon: Building,
      color: 'orange',
      disabled: false
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
      
      {!hasAssignedProperties && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <AlertIcon className="w-5 h-5 text-yellow-600 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">No Properties Assigned</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Contact your manager to get properties assigned to start logging payments and creating invoices.
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((action) => {
          const IconComponent = action.icon;
          const isDisabled = action.disabled;
          
          const content = (
            <div className={`p-4 border-2 rounded-lg transition-all ${
              isDisabled 
                ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                : `border-${action.color}-200 hover:border-${action.color}-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${action.color}-500 cursor-pointer`
            }`}>
              <div className="flex items-center">
                <div className={`p-2 rounded-lg ${
                  isDisabled
                    ? 'bg-gray-100'
                    : action.color === 'green'
                    ? 'bg-green-100'
                    : action.color === 'blue'
                    ? 'bg-blue-100'
                    : action.color === 'purple'
                    ? 'bg-purple-100'
                    : 'bg-orange-100'
                }`}>
                  <IconComponent className={`w-5 h-5 ${
                    isDisabled
                      ? 'text-gray-400'
                      : action.color === 'green'
                      ? 'text-green-600'
                      : action.color === 'blue'
                      ? 'text-blue-600'
                      : action.color === 'purple'
                      ? 'text-purple-600'
                      : 'text-orange-600'
                  }`} />
                </div>
                <div className="ml-3 flex-1">
                  <h4 className={`text-sm font-medium ${isDisabled ? 'text-gray-500' : 'text-gray-900'}`}>
                    {action.title}
                  </h4>
                  <p className={`text-xs mt-1 ${isDisabled ? 'text-gray-400' : 'text-gray-500'}`}>
                    {action.description}
                  </p>
                </div>
                {!isDisabled && <ArrowRight className="w-4 h-4 text-gray-400" />}
              </div>
            </div>
          );
          
          return action.href && !isDisabled ? (
            <Link key={action.title} href={action.href}>
              {content}
            </Link>
          ) : (
            <div key={action.title}>
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Assigned Properties Component
function AssignedProperties({ assignedProperties = [] }) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Your Assigned Properties</h3>
          <span className="text-sm text-gray-500">{assignedProperties.length} properties</span>
        </div>
      </div>
      
      <div className="max-h-64 overflow-y-auto">
        {assignedProperties.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {assignedProperties.map((assignment) => (
              <div key={assignment._id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <MapPin className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">
                        {assignment.property?.address || 'Unknown Address'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {assignment.property?.type} • ZMW {assignment.property?.monthlyRent?.toLocaleString() || 0}/month
                      </div>
                      <div className="text-xs text-gray-500">
                        Assigned by {assignment.assignedBy?.name} on {new Date(assignment.assignedDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link
                      href={`/admin/properties/${assignment.property?._id}`}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Manage →
                    </Link>
                  </div>
                </div>
                <div className="mt-2 ml-11">
                  <div className="flex flex-wrap gap-1">
                    {assignment.permissions?.map((permission) => (
                      <span key={permission} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {permission.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-8 text-center text-gray-500">
            <Building className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p>No properties assigned</p>
            <p className="text-sm mt-1">Contact your manager to get properties assigned</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Recent Activity Component - FIXED with proper null checks
function RecentActivity({ 
  recentPayments = [], 
  recentInvoices = [], 
  pendingPayments = [], 
  pendingInvoices = [] 
}) {
  // Ensure all arrays are valid
  const safeRecentPayments = Array.isArray(recentPayments) ? recentPayments : [];
  const safeRecentInvoices = Array.isArray(recentInvoices) ? recentInvoices : [];
  const safePendingPayments = Array.isArray(pendingPayments) ? pendingPayments : [];
  const safePendingInvoices = Array.isArray(pendingInvoices) ? pendingInvoices : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Pending Approvals */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Pending Approvals</h3>
          <span className="text-sm text-gray-500">
            {safePendingPayments.length + safePendingInvoices.length} items
          </span>
        </div>
        <div className="space-y-3 max-h-48 overflow-y-auto">
          {[...safePendingPayments, ...safePendingInvoices].length > 0 ? (
            [...safePendingPayments, ...safePendingInvoices]
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .slice(0, 5)
              .map((item) => (
                <div key={item._id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      {item.receiptNumber ? (
                        <DollarSign className="w-4 h-4 text-orange-600" />
                      ) : (
                        <FileText className="w-4 h-4 text-orange-600" />
                      )}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {item.receiptNumber 
                          ? `Payment - ZMW ${item.amount?.toLocaleString() || 0}`
                          : `${item.invoiceNumber || 'Invoice'} - ZMW ${item.totalAmount?.toLocaleString() || 0}`
                        }
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.tenant?.name || 'Unknown'} • Awaiting approval
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-orange-600 font-medium">Pending</span>
                </div>
              ))
          ) : (
            <div className="text-center py-4">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">All items approved</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          <Link href="/admin/activity" className="text-blue-600 hover:text-blue-800 text-sm">
            View all →
          </Link>
        </div>
        <div className="space-y-3 max-h-48 overflow-y-auto">
          {[...safeRecentPayments, ...safeRecentInvoices].length > 0 ? (
            [...safeRecentPayments, ...safeRecentInvoices]
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .slice(0, 5)
              .map((item) => (
                <div key={item._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {item.receiptNumber ? (
                        <DollarSign className="w-4 h-4 text-gray-600" />
                      ) : (
                        <FileText className="w-4 h-4 text-gray-600" />
                      )}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {item.receiptNumber 
                          ? `Payment - ZMW ${item.amount?.toLocaleString() || 0}`
                          : `${item.invoiceNumber || 'Invoice'} - ZMW ${item.totalAmount?.toLocaleString() || 0}`
                        }
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.tenant?.name || 'Unknown'} • {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium ${
                    item.approvalStatus === 'approved' 
                      ? 'text-green-600' 
                      : item.approvalStatus === 'rejected'
                      ? 'text-red-600'
                      : 'text-orange-600'
                  }`}>
                    {item.approvalStatus ? 
                      item.approvalStatus.charAt(0).toUpperCase() + item.approvalStatus.slice(1) :
                      'Pending'
                    }
                  </span>
                </div>
              ))
          ) : (
            <div className="text-center py-4">
              <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No recent activity</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Main Admin Dashboard Component
export default async function AdminDashboardPage() {
  // Check authentication and authorization
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/admin/dashboard');
  }

  if (session.user.role !== 'admin') {
    redirect('/dashboard'); // Redirect non-admins
  }

  let dashboardData;
  let error = null;

  try {
    dashboardData = await getAdminDashboardData(session.user.id);
  } catch (err) {
    error = err.message;
    console.error('Admin dashboard error:', err);
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto p-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-red-800">
                  Error Loading Dashboard
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  {error}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<AdminDashboardLoading />}>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto p-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center mb-2 sm:mb-0">
                <Shield className="w-6 h-6 mr-3 text-blue-600" />
                Admin Dashboard
              </h1>
              <p className="text-gray-600">
                Manage payments and invoices for your assigned properties
              </p>
            </div>
            <div className="flex items-center space-x-3 mt-4 sm:mt-0">
              <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                <Shield className="w-4 h-4 mr-1" />
                {dashboardData?.adminUser?.adminLevel ? 
                  dashboardData.adminUser.adminLevel.charAt(0).toUpperCase() + dashboardData.adminUser.adminLevel.slice(1) + ' Admin' :
                  'Admin'
                }
              </span>
            </div>
          </div>

          {/* Breadcrumbs */}
          <Breadcrumbs />

          {/* Admin Info */}
          <AdminInfo adminUser={dashboardData?.adminUser} />

          {/* Stats Cards */}
          <AdminStatsCards 
            stats={dashboardData?.stats} 
            adminLevel={dashboardData?.adminUser?.adminLevel}
          />

          {/* Quick Actions */}
          <QuickActions 
            assignedProperties={dashboardData?.assignedProperties}
            adminLevel={dashboardData?.adminUser?.adminLevel}
          />

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Assigned Properties */}
            <AssignedProperties assignedProperties={dashboardData?.assignedProperties} />
            
            {/* Recent Activity */}
            <div className="lg:col-span-1">
              <RecentActivity 
                recentPayments={dashboardData?.recentPayments}
                recentInvoices={dashboardData?.recentInvoices}
                pendingPayments={dashboardData?.pendingPayments}
                pendingInvoices={dashboardData?.pendingInvoices}
              />
            </div>
          </div>
        </div>
      </div>
    </Suspense>
  );
}