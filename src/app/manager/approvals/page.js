// app/manager/approvals/page.js
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import dbConnect from 'lib/db';
import Payment from 'models/Payment';
import Invoice from 'models/Invoice';
import Property from 'models/Property';
import User from 'models/User';
import Breadcrumbs from '@/components/Breadcrumbs';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  FileText,
  DollarSign,
  Eye,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Calendar,
  User as UserIcon,
  Building,
  Filter,
  RefreshCw
} from 'lucide-react';

// Fetch approval data based on user role
async function getApprovalData(userId, userRole) {
  try {
    await dbConnect();
    
    let propertyFilter = {};
    
    if (userRole === 'landlord') {
      // Landlords can only approve for their own properties
      propertyFilter = { landlord: userId };
    }
    // Managers can approve for all properties
    
    // Get properties that this user can approve for
    const approvalProperties = await Property.find(propertyFilter).select('_id');
    const propertyIds = approvalProperties.map(p => p._id);
    
    // Get pending payments that need approval
    const pendingPayments = await Payment.find({
      property: { $in: propertyIds },
      approvalStatus: 'pending',
      requiresApprovalFrom: userId
    })
      .populate('tenant', 'name email')
      .populate('property', 'address type')
      .populate('recordedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(20);

    // Get pending invoices that need approval
    const pendingInvoices = await Invoice.find({
      property: { $in: propertyIds },
      approvalStatus: 'pending',
      requiresApprovalFrom: userId
    })
      .populate('tenant', 'name email')
      .populate('property', 'address type')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(20);

    // Get recently approved/rejected items for history
    const recentApprovals = await Promise.all([
      Payment.find({
        property: { $in: propertyIds },
        approvalStatus: { $in: ['approved', 'rejected'] },
        approvedBy: userId
      })
        .populate('tenant', 'name')
        .populate('property', 'address')
        .sort({ approvedAt: -1 })
        .limit(10),
      
      Invoice.find({
        property: { $in: propertyIds },
        approvalStatus: { $in: ['approved', 'rejected'] },
        approvedBy: userId
      })
        .populate('tenant', 'name')
        .populate('property', 'address')
        .sort({ approvedAt: -1 })
        .limit(10)
    ]);

    // Combine and sort recent approvals
    const combinedApprovals = [
      ...recentApprovals[0].map(item => ({ ...item.toObject(), type: 'payment' })),
      ...recentApprovals[1].map(item => ({ ...item.toObject(), type: 'invoice' }))
    ].sort((a, b) => new Date(b.approvedAt) - new Date(a.approvedAt)).slice(0, 10);

    // Calculate statistics
    const stats = {
      pendingPayments: pendingPayments.length,
      pendingInvoices: pendingInvoices.length,
      totalPending: pendingPayments.length + pendingInvoices.length,
      totalValue: pendingPayments.reduce((sum, p) => sum + p.amount, 0) + 
                  pendingInvoices.reduce((sum, i) => sum + i.totalAmount, 0)
    };

    return {
      pendingPayments,
      pendingInvoices,
      recentApprovals: combinedApprovals,
      stats,
      propertyCount: propertyIds.length
    };
  } catch (error) {
    console.error('Error fetching approval data:', error);
    return null;
  }
}

// Loading component
function ApprovalDashboardLoading() {
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
              <div className="w-full h-16 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
        
        {/* Content loading */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="w-full h-64 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Stats component
function ApprovalStats({ stats, userRole }) {
  const formatCurrency = (amount) => `ZMW ${amount.toLocaleString()}`;
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="p-3 bg-orange-100 rounded-lg">
            <Clock className="w-6 h-6 text-orange-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalPending}</p>
            <p className="text-xs text-gray-500">
              {stats.pendingPayments} payments • {stats.pendingInvoices} invoices
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="p-3 bg-blue-100 rounded-lg">
            <DollarSign className="w-6 h-6 text-blue-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Total Value</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalValue)}</p>
            <p className="text-xs text-gray-500">
              Awaiting approval
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="p-3 bg-red-100 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Urgent Reviews</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.pendingPayments + stats.pendingInvoices > 5 ? 'High' : 'Low'}
            </p>
            <p className="text-xs text-gray-500">
              Priority level
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="p-3 bg-green-100 rounded-lg">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Your Role</p>
            <p className="text-lg font-bold text-gray-900 capitalize">{userRole}</p>
            <p className="text-xs text-gray-500">
              Approval authority
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Pending payments component
function PendingPayments({ payments }) {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Pending Payments</h3>
          <span className="text-sm text-gray-500">{payments.length} items</span>
        </div>
      </div>
      
      <div className="max-h-96 overflow-y-auto">
        {payments.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {payments.map((payment) => (
              <div key={payment._id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <DollarSign className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          ZMW {payment.amount.toLocaleString()} - {payment.paymentType}
                        </div>
                        <div className="text-sm text-gray-500">
                          {payment.tenant?.name} • {payment.property?.address}
                        </div>
                        <div className="text-xs text-gray-500">
                          Recorded by {payment.recordedBy?.name} on {formatDate(payment.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link
                      href={`/manager/approvals/payment/${payment._id}`}
                      className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Review
                    </Link>
                  </div>
                </div>
                {payment.description && (
                  <div className="mt-2 text-sm text-gray-600 ml-14">
                    {payment.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-8 text-center text-gray-500">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p>No pending payments</p>
            <p className="text-sm mt-1">All payments have been reviewed</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Pending invoices component
function PendingInvoices({ invoices }) {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Pending Invoices</h3>
          <span className="text-sm text-gray-500">{invoices.length} items</span>
        </div>
      </div>
      
      <div className="max-h-96 overflow-y-auto">
        {invoices.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {invoices.map((invoice) => (
              <div key={invoice._id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <FileText className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {invoice.invoiceNumber} - ZMW {invoice.totalAmount.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          {invoice.tenant?.name} • {invoice.property?.address}
                        </div>
                        <div className="text-xs text-gray-500">
                          Created by {invoice.createdBy?.name} on {formatDate(invoice.createdAt)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Due: {formatDate(invoice.dueDate)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link
                      href={`/manager/approvals/invoice/${invoice._id}`}
                      className="inline-flex items-center px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Review
                    </Link>
                  </div>
                </div>
                {invoice.items && invoice.items.length > 0 && (
                  <div className="mt-2 ml-14">
                    <div className="text-xs text-gray-500">
                      Items: {invoice.items.map(item => item.description).join(', ')}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-8 text-center text-gray-500">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p>No pending invoices</p>
            <p className="text-sm mt-1">All invoices have been reviewed</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Recent approvals component
function RecentApprovals({ approvals }) {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Recent Approvals</h3>
          <Link href="/manager/approvals/history" className="text-blue-600 hover:text-blue-800 text-sm">
            View all →
          </Link>
        </div>
      </div>
      
      <div className="max-h-64 overflow-y-auto">
        {approvals.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {approvals.map((item) => (
              <div key={`${item.type}-${item._id}`} className="px-6 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`p-2 rounded-lg ${
                      item.approvalStatus === 'approved' 
                        ? 'bg-green-100' 
                        : 'bg-red-100'
                    }`}>
                      {item.type === 'payment' ? (
                        <DollarSign className={`w-4 h-4 ${
                          item.approvalStatus === 'approved' 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`} />
                      ) : (
                        <FileText className={`w-4 h-4 ${
                          item.approvalStatus === 'approved' 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`} />
                      )}
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">
                        {item.type === 'payment' 
                          ? `Payment - ZMW ${item.amount?.toLocaleString()}`
                          : `${item.invoiceNumber} - ZMW ${item.totalAmount?.toLocaleString()}`
                        }
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.tenant?.name} • {formatDate(item.approvedAt)}
                      </div>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    item.approvalStatus === 'approved'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {item.approvalStatus === 'approved' ? (
                      <>
                        <ThumbsUp className="w-3 h-3 mr-1" />
                        Approved
                      </>
                    ) : (
                      <>
                        <ThumbsDown className="w-3 h-3 mr-1" />
                        Rejected
                      </>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-8 text-center text-gray-500">
            <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p>No recent approvals</p>
            <p className="text-sm mt-1">Your approval history will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Main component
export default async function ApprovalDashboard() {
  // Check authentication and authorization
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/manager/approvals');
  }

  if (!['manager', 'landlord'].includes(session.user.role)) {
    redirect('/dashboard'); // Redirect unauthorized users
  }

  // Fetch approval data
  const approvalData = await getApprovalData(session.user.id, session.user.role);

  if (!approvalData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto p-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-red-800">
                  Error Loading Approval Data
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  There was a problem loading the approval dashboard data.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<ApprovalDashboardLoading />}>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto p-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center mb-2 sm:mb-0">
                <CheckCircle className="w-6 h-6 mr-3 text-green-600" />
                Approval Dashboard
              </h1>
              <p className="text-gray-600">
                Review and approve payments and invoices from admin users
              </p>
            </div>
            <div className="flex items-center space-x-3 mt-4 sm:mt-0">
              <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                <UserIcon className="w-4 h-4 mr-1" />
                {session.user.role.charAt(0).toUpperCase() + session.user.role.slice(1)}
              </span>
              <Link
                href="/manager/approvals/history"
                className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors font-medium"
              >
                <Clock className="w-4 h-4 mr-2" />
                View History
              </Link>
            </div>
          </div>

          {/* Breadcrumbs */}
          <Breadcrumbs />

          {/* Stats */}
          <ApprovalStats stats={approvalData.stats} userRole={session.user.role} />

          {/* Main content grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Pending payments */}
            <PendingPayments payments={approvalData.pendingPayments} />
            
            {/* Pending invoices */}
            <PendingInvoices invoices={approvalData.pendingInvoices} />
          </div>

          {/* Recent approvals */}
          <RecentApprovals approvals={approvalData.recentApprovals} />

          {/* Quick actions */}
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link
                href="/manager/approvals/bulk"
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <CheckCircle className="w-6 h-6 text-green-600 mb-2" />
                <h4 className="font-medium text-gray-900">Bulk Approval</h4>
                <p className="text-sm text-gray-500 mt-1">
                  Approve multiple items at once
                </p>
              </Link>
              
              <Link
                href="/manager/assign-properties"
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Building className="w-6 h-6 text-blue-600 mb-2" />
                <h4 className="font-medium text-gray-900">Property Assignments</h4>
                <p className="text-sm text-gray-500 mt-1">
                  Manage admin property access
                </p>
              </Link>
              
              <Link
                href="/properties"
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Eye className="w-6 h-6 text-purple-600 mb-2" />
                <h4 className="font-medium text-gray-900">View Properties</h4>
                <p className="text-sm text-gray-500 mt-1">
                  Manage your properties
                </p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Suspense>
  );
}