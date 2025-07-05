// app/tenant/dashboard/page.tsx - Dynamic tenant dashboard
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import dbConnect from 'lib/db';
import Lease from 'models/Lease';
import PropertyRequest from 'models/PropertyRequest';
import Notification from 'models/Notification';
import { 
  FileText, 
  CreditCard, 
  Home, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  PenTool,
  DollarSign
} from 'lucide-react';
import Link from 'next/link';

// Server-side data fetching
async function getTenantDashboardData(tenantId) {
  try {
    await dbConnect();
    
    // Get current lease
    const currentLease = await Lease.findOne({
      tenantId: tenantId,
      status: { $in: ['draft', 'pending_signature', 'signed', 'active'] }
    }).populate('propertyId landlordId propertyRequestId');
    
    // Get recent property requests
    const propertyRequests = await PropertyRequest.find({
      tenant: tenantId
    }).populate('property landlord').sort({ createdAt: -1 }).limit(5);
    
    // Get unread notifications
    const unreadNotifications = await Notification.find({
      recipient: tenantId,
      isRead: false
    }).sort({ createdAt: -1 }).limit(10);
    
    return {
      currentLease: currentLease ? JSON.parse(JSON.stringify(currentLease)) : null,
      propertyRequests: JSON.parse(JSON.stringify(propertyRequests)),
      unreadNotifications: JSON.parse(JSON.stringify(unreadNotifications))
    };
  } catch (error) {
    console.error('Error fetching tenant dashboard data:', error);
    return {
      currentLease: null,
      propertyRequests: [],
      unreadNotifications: []
    };
  }
}

// Dashboard components based on lease status
function NoLeaseContent() {
  return (
    <div className="text-center py-12">
      <Home className="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h2 className="text-2xl font-semibold text-gray-900 mb-2">
        Welcome to Your Tenant Dashboard
      </h2>
      <p className="text-gray-600 mb-6">
        You don't have any active lease applications yet. Start by requesting a property.
      </p>
      <Link
        href="/tenant/request-property"
        className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
      >
        <Home className="w-5 h-5 mr-2" />
        Request a Property
      </Link>
    </div>
  );
}

function PendingSignatureContent({ lease }) {
  const nextAction = lease.getNextAction ? lease.getNextAction() : { message: 'Review lease agreement' };
  
  return (
    <div className="space-y-6">
      {/* Action Required Alert */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start">
          <PenTool className="w-6 h-6 text-blue-600 mt-1" />
          <div className="ml-4">
            <h3 className="text-lg font-semibold text-blue-900">
              Lease Agreement Ready for Signature
            </h3>
            <p className="text-blue-700 mt-1">
              Your landlord has prepared your lease agreement. Please review and sign to proceed.
            </p>
            <div className="mt-4">
              <Link
                href={`/tenant/lease/${lease._id}/sign`}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <PenTool className="w-4 h-4 mr-2" />
                Review & Sign Lease
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Lease Details */}
      <LeaseDetailsCard lease={lease} />
    </div>
  );
}

function SignedAwaitingPaymentContent({ lease }) {
  return (
    <div className="space-y-6">
      {/* Payment Required Alert */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-start">
          <CheckCircle className="w-6 h-6 text-green-600 mt-1" />
          <div className="ml-4">
            <h3 className="text-lg font-semibold text-green-900">
              Lease Agreement Signed Successfully!
            </h3>
            <p className="text-green-700 mt-1">
              Next step: Make your first payment to activate the lease.
            </p>
          </div>
        </div>
      </div>
      
      {/* Payment Required */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-start">
          <DollarSign className="w-6 h-6 text-yellow-600 mt-1" />
          <div className="ml-4">
            <h3 className="text-lg font-semibold text-yellow-900">
              First Payment Required
            </h3>
            <p className="text-yellow-700 mt-1">
              Amount due: ${lease.firstPaymentRequired?.toLocaleString() || (lease.securityDeposit + lease.monthlyRent).toLocaleString()}
            </p>
            <p className="text-sm text-yellow-600 mt-1">
              (Security Deposit: ${lease.securityDeposit?.toLocaleString()} + First Month: ${lease.monthlyRent?.toLocaleString()})
            </p>
            <div className="mt-4">
              <Link
                href={`/tenant/lease/${lease._id}/payment`}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Make Payment
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Lease Details */}
      <LeaseDetailsCard lease={lease} showPaymentInfo={true} />
    </div>
  );
}

function ActiveLeaseContent({ lease }) {
  const daysUntilDue = lease.nextPaymentDue ? 
    Math.ceil((new Date(lease.nextPaymentDue) - new Date()) / (1000 * 60 * 60 * 24)) : null;
  
  return (
    <div className="space-y-6">
      {/* Active Status */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-start">
          <CheckCircle className="w-6 h-6 text-green-600 mt-1" />
          <div className="ml-4">
            <h3 className="text-lg font-semibold text-green-900">
              Lease Active & In Good Standing
            </h3>
            <p className="text-green-700 mt-1">
              Your lease is active. Welcome to your new home!
            </p>
          </div>
        </div>
      </div>
      
      {/* Payment Status */}
      {daysUntilDue !== null && (
        <div className={`border rounded-lg p-6 ${
          daysUntilDue <= 5 
            ? 'bg-yellow-50 border-yellow-200' 
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-start">
            <Clock className={`w-6 h-6 mt-1 ${
              daysUntilDue <= 5 ? 'text-yellow-600' : 'text-gray-600'
            }`} />
            <div className="ml-4">
              <h3 className={`text-lg font-semibold ${
                daysUntilDue <= 5 ? 'text-yellow-900' : 'text-gray-900'
              }`}>
                Next Payment Due
              </h3>
              <p className={`mt-1 ${
                daysUntilDue <= 5 ? 'text-yellow-700' : 'text-gray-700'
              }`}>
                {daysUntilDue <= 0 
                  ? 'Payment is overdue!' 
                  : `Payment due in ${daysUntilDue} days`
                }
              </p>
              <p className="text-sm mt-1">
                Amount: ${lease.monthlyRent?.toLocaleString()}
              </p>
              {daysUntilDue <= 5 && (
                <div className="mt-4">
                  <Link
                    href={`/tenant/payments/make-payment`}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Make Payment Now
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/tenant/payments"
          className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
        >
          <CreditCard className="w-8 h-8 text-blue-600 mb-2" />
          <h4 className="font-medium text-gray-900">Payment History</h4>
          <p className="text-sm text-gray-600 mt-1">View all payments</p>
        </Link>
        
        <Link
          href="/tenant/maintenance"
          className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
        >
          <Home className="w-8 h-8 text-green-600 mb-2" />
          <h4 className="font-medium text-gray-900">Maintenance</h4>
          <p className="text-sm text-gray-600 mt-1">Request repairs</p>
        </Link>
        
        <Link
          href={`/tenant/lease/${lease._id}`}
          className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
        >
          <FileText className="w-8 h-8 text-purple-600 mb-2" />
          <h4 className="font-medium text-gray-900">Lease Details</h4>
          <p className="text-sm text-gray-600 mt-1">View agreement</p>
        </Link>
      </div>
      
      {/* Lease Details */}
      <LeaseDetailsCard lease={lease} showPaymentInfo={true} showFullDetails={true} />
    </div>
  );
}

function LeaseDetailsCard({ lease, showPaymentInfo = false, showFullDetails = false }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Lease Information</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium text-gray-700">Property</h4>
          <p className="text-gray-900">{lease.propertyId?.address || 'Property address'}</p>
        </div>
        
        <div>
          <h4 className="font-medium text-gray-700">Monthly Rent</h4>
          <p className="text-gray-900">${lease.monthlyRent?.toLocaleString()}</p>
        </div>
        
        <div>
          <h4 className="font-medium text-gray-700">Lease Term</h4>
          <p className="text-gray-900">
            {new Date(lease.startDate).toLocaleDateString()} - {new Date(lease.endDate).toLocaleDateString()}
          </p>
        </div>
        
        <div>
          <h4 className="font-medium text-gray-700">Security Deposit</h4>
          <p className="text-gray-900">${lease.securityDeposit?.toLocaleString()}</p>
        </div>
        
        {showPaymentInfo && (
          <>
            <div>
              <h4 className="font-medium text-gray-700">Total Paid</h4>
              <p className="text-gray-900">${lease.totalPaid?.toLocaleString() || '0'}</p>
            </div>
            
            {lease.nextPaymentDue && (
              <div>
                <h4 className="font-medium text-gray-700">Next Payment Due</h4>
                <p className="text-gray-900">{new Date(lease.nextPaymentDue).toLocaleDateString()}</p>
              </div>
            )}
          </>
        )}
      </div>
      
      {showFullDetails && lease.landlordId && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="font-medium text-gray-700">Landlord Contact</h4>
          <p className="text-gray-900">{lease.landlordId.name || lease.landlordId.email}</p>
          {lease.landlordId.phone && (
            <p className="text-gray-600">{lease.landlordId.phone}</p>
          )}
        </div>
      )}
    </div>
  );
}

// Main Dashboard Component
export default async function TenantDashboard() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user || session.user.role !== 'tenant') {
    redirect('/auth/login');
  }
  
  const dashboardData = await getTenantDashboardData(session.user.id);
  const { currentLease, propertyRequests, unreadNotifications } = dashboardData;
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Tenant Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage your rental applications and lease agreements</p>
        </div>
        
        {/* Notifications */}
        {unreadNotifications.length > 0 && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-blue-600 mr-2" />
              <span className="font-medium text-blue-900">
                You have {unreadNotifications.length} unread notification{unreadNotifications.length > 1 ? 's' : ''}
              </span>
              <Link
                href="/tenant/notifications"
                className="ml-auto text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View All
              </Link>
            </div>
          </div>
        )}
        
        {/* Main Content - Dynamic based on lease status */}
        <div className="mb-8">
          {!currentLease && <NoLeaseContent />}
          {currentLease?.status === 'pending_signature' && <PendingSignatureContent lease={currentLease} />}
          {currentLease?.status === 'signed' && <SignedAwaitingPaymentContent lease={currentLease} />}
          {currentLease?.status === 'active' && <ActiveLeaseContent lease={currentLease} />}
        </div>
        
        {/* Recent Property Requests */}
        {propertyRequests.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Property Requests</h3>
            <div className="space-y-3">
              {propertyRequests.slice(0, 3).map((request) => (
                <div key={request._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">
                      {request.requestedPropertyDetails?.address || request.property?.address || 'Property Request'}
                    </p>
                    <p className="text-sm text-gray-600">
                      Status: <span className="capitalize">{request.status}</span>
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    request.status === 'approved' ? 'bg-green-100 text-green-800' :
                    request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {request.status}
                  </span>
                </div>
              ))}
            </div>
            {propertyRequests.length > 3 && (
              <div className="mt-4">
                <Link
                  href="/tenant/property-requests"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View all requests ({propertyRequests.length})
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}