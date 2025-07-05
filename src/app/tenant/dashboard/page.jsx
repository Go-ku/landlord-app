// app/tenant/dashboard/page.tsx - Enhanced Dynamic tenant dashboard
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import dbConnect from 'lib/db';
import Lease from 'models/Lease';
import PropertyRequest from 'models/PropertyRequest';
import Notification from 'models/Notification';
import Payment from 'models/Payment';
import Invoice from 'models/Invoice';
import Maintenance from 'models/Maintenance';
import { 
  FileText, 
  CreditCard, 
  Home, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  PenTool,
  DollarSign,
  Bell,
  Calendar,
  TrendingUp,
  MapPin,
  Phone,
  Mail,
  User,
  Settings,
  ChevronRight,
  Wrench,
  Shield,
  Archive,
  Star,
  Download,
  Plus,
  Receipt,
  ExternalLink,
  Zap
} from 'lucide-react';
import Link from 'next/link';

// Enhanced server-side data fetching with payment history
async function getTenantDashboardData(tenantId) {
  try {
    await dbConnect();
    
    // Get current lease with more details
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

    // Get recent payments for current lease
    const recentPayments = currentLease ? await Payment.find({
      leaseId: currentLease._id
    }).sort({ createdAt: -1 }).limit(3) : [];

    // Get pending invoices
    const pendingInvoices = currentLease ? await Invoice.find({
      leaseId: currentLease._id,
      status: { $in: ['pending', 'overdue'] }
    }).sort({ dueDate: 1 }) : [];

    // Get recent maintenance requests
    const recentMaintenance = currentLease ? await Maintenance.find({
      tenantId: tenantId,
      propertyId: currentLease.propertyId
    }).sort({ createdAt: -1 }).limit(3) : [];

    // Calculate payment analytics
    const paymentStats = currentLease ? {
      totalPaid: await Payment.aggregate([
        { $match: { leaseId: currentLease._id, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      onTimePayments: await Payment.countDocuments({
        leaseId: currentLease._id,
        status: 'completed',
        paidAt: { $lte: '$dueDate' }
      }),
      totalPayments: await Payment.countDocuments({
        leaseId: currentLease._id,
        status: 'completed'
      })
    } : null;
    
    return {
      currentLease: currentLease ? JSON.parse(JSON.stringify(currentLease)) : null,
      propertyRequests: JSON.parse(JSON.stringify(propertyRequests)),
      unreadNotifications: JSON.parse(JSON.stringify(unreadNotifications)),
      recentPayments: JSON.parse(JSON.stringify(recentPayments)),
      pendingInvoices: JSON.parse(JSON.stringify(pendingInvoices)),
      recentMaintenance: JSON.parse(JSON.stringify(recentMaintenance)),
      paymentStats: paymentStats ? JSON.parse(JSON.stringify(paymentStats)) : null
    };
  } catch (error) {
    console.error('Error fetching tenant dashboard data:', error);
    return {
      currentLease: null,
      propertyRequests: [],
      unreadNotifications: [],
      recentPayments: [],
      pendingInvoices: [],
      recentMaintenance: [],
      paymentStats: null
    };
  }
}

// Enhanced Dashboard components with better UX
function WelcomeHeader({ userName, unreadCount, pendingInvoices, hasActiveLease }) {
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';
  
  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-8 text-white mb-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            {greeting}, {userName || 'Tenant'}!
          </h1>
          <p className="text-blue-100 text-lg">
            Welcome to your rental management dashboard
          </p>
        </div>
        {unreadCount > 0 && (
          <Link
            href="/tenant/notifications"
            className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 flex items-center space-x-2 hover:bg-white/30 transition-colors"
          >
            <Bell className="w-5 h-5" />
            <span className="font-medium">{unreadCount}</span>
          </Link>
        )}
      </div>
      
      {/* Quick Action Buttons */}
      {hasActiveLease && (
        <div className="flex flex-wrap gap-4">
          <Link
            href="/tenant/payments/new"
            className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-3 flex items-center space-x-3 hover:bg-white/30 transition-colors group"
          >
            <div className="bg-white/20 rounded-lg p-2 group-hover:bg-white/30">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold">Make Payment</p>
              <p className="text-blue-100 text-sm">Pay rent or fees</p>
            </div>
          </Link>
          
          <Link
            href="/tenant/maintenance/new"
            className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-3 flex items-center space-x-3 hover:bg-white/30 transition-colors group"
          >
            <div className="bg-white/20 rounded-lg p-2 group-hover:bg-white/30">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold">Request Maintenance</p>
              <p className="text-blue-100 text-sm">Report issues</p>
            </div>
          </Link>
          
          {pendingInvoices > 0 && (
            <Link
              href="/tenant/invoices"
              className="bg-red-500/80 backdrop-blur-sm rounded-xl px-6 py-3 flex items-center space-x-3 hover:bg-red-500 transition-colors group"
            >
              <div className="bg-white/20 rounded-lg p-2 group-hover:bg-white/30">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold">Pending Invoices</p>
                <p className="text-red-100 text-sm">{pendingInvoices} invoice{pendingInvoices > 1 ? 's' : ''} due</p>
              </div>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function QuickStatsCards({ lease, paymentStats }) {
  if (!lease) return null;

  const daysUntilDue = lease.nextPaymentDue ? 
    Math.ceil((new Date(lease.nextPaymentDue) - new Date()) / (1000 * 60 * 60 * 24)) : null;
  
  const onTimePercentage = paymentStats?.totalPayments > 0 ? 
    Math.round((paymentStats.onTimePayments / paymentStats.totalPayments) * 100) : 100;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Rent Status */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Monthly Rent</p>
            <p className="text-2xl font-bold text-gray-900">
              ZMW {lease.monthlyRent?.toLocaleString()}
            </p>
            {daysUntilDue !== null && (
              <p className={`text-sm mt-1 ${
                daysUntilDue <= 5 ? 'text-red-600' : daysUntilDue <= 10 ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {daysUntilDue <= 0 ? 'Overdue!' : `Due in ${daysUntilDue} days`}
              </p>
            )}
          </div>
          <div className={`p-3 rounded-full ${
            daysUntilDue <= 5 ? 'bg-red-100' : daysUntilDue <= 10 ? 'bg-yellow-100' : 'bg-green-100'
          }`}>
            <DollarSign className={`w-6 h-6 ${
              daysUntilDue <= 5 ? 'text-red-600' : daysUntilDue <= 10 ? 'text-yellow-600' : 'text-green-600'
            }`} />
          </div>
        </div>
      </div>

      {/* Payment Performance */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Payment Score</p>
            <p className="text-2xl font-bold text-gray-900">{onTimePercentage}%</p>
            <p className="text-sm text-gray-500 mt-1">On-time payments</p>
          </div>
          <div className="p-3 rounded-full bg-blue-100">
            <TrendingUp className="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Lease Duration */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Lease Status</p>
            <p className="text-2xl font-bold text-gray-900 capitalize">{lease.status}</p>
            <p className="text-sm text-gray-500 mt-1">
              Until {new Date(lease.endDate).toLocaleDateString()}
            </p>
          </div>
          <div className="p-3 rounded-full bg-purple-100">
            <Calendar className="w-6 h-6 text-purple-600" />
          </div>
        </div>
      </div>
    </div>
  );
}

function NoLeaseContent() {
  return (
    <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
      <div className="max-w-md mx-auto">
        <div className="bg-blue-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
          <Home className="w-10 h-10 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Ready to Find Your Perfect Home?
        </h2>
        <p className="text-gray-600 mb-8 leading-relaxed">
          Start your rental journey with us. Browse available properties or submit a custom request to find exactly what you're looking for.
        </p>
        <div className="space-y-4">
          <Link
            href="/tenant/request-property"
            className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-base font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-colors w-full"
          >
            <Home className="w-5 h-5 mr-3" />
            Request a Property
          </Link>
          <Link
            href="/properties/browse"
            className="inline-flex items-center justify-center px-8 py-4 border border-gray-300 text-base font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 transition-colors w-full"
          >
            Browse Available Properties
          </Link>
        </div>
      </div>
    </div>
  );
}

function PendingSignatureContent({ lease }) {
  return (
    <div className="space-y-6">
      {/* Enhanced Action Alert */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-8">
        <div className="flex items-start">
          <div className="bg-blue-100 rounded-full p-3 mr-4">
            <PenTool className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-blue-900 mb-2">
              Your Lease Agreement is Ready! 📝
            </h3>
            <p className="text-blue-700 mb-6 text-lg leading-relaxed">
              Great news! Your landlord has prepared your lease agreement. Please take a moment to review the terms and conditions, then sign to move forward.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href={`/tenant/lease/${lease._id}/sign`}
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                <PenTool className="w-5 h-5 mr-2" />
                Review & Sign Lease
              </Link>
              <Link
                href={`/tenant/lease/${lease._id}/preview`}
                className="inline-flex items-center justify-center px-6 py-3 border border-blue-300 text-base font-medium rounded-xl text-blue-700 bg-white hover:bg-blue-50 transition-colors"
              >
                <FileText className="w-5 h-5 mr-2" />
                Preview Document
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      <EnhancedLeaseDetailsCard lease={lease} />
    </div>
  );
}

function SignedAwaitingPaymentContent({ lease }) {
  const firstPayment = lease.firstPaymentRequired || (lease.securityDeposit + lease.monthlyRent);
  
  return (
    <div className="space-y-6">
      {/* Success Message */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-8">
        <div className="flex items-start">
          <div className="bg-green-100 rounded-full p-3 mr-4">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-green-900 mb-2">
              Congratulations! Lease Signed Successfully! 🎉
            </h3>
            <p className="text-green-700 text-lg">
              You're almost there! Complete your first payment to activate your lease and get your keys.
            </p>
          </div>
        </div>
      </div>
      
      {/* Payment Card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
        <div className="flex items-start">
          <div className="bg-yellow-100 rounded-full p-3 mr-4">
            <DollarSign className="w-6 h-6 text-yellow-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Complete Your First Payment
            </h3>
            
            {/* Payment Breakdown */}
            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <h4 className="font-semibold text-gray-900 mb-4">Payment Breakdown</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Security Deposit</span>
                  <span className="font-medium">ZMW {lease.securityDeposit?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">First Month's Rent</span>
                  <span className="font-medium">ZMW {lease.monthlyRent?.toLocaleString()}</span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">Total Due</span>
                    <span className="font-bold text-xl text-gray-900">ZMW {firstPayment.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href={`/payments/new?leaseId=${lease._id}`}
                className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-base font-medium rounded-xl text-white bg-yellow-600 hover:bg-yellow-700 transition-colors"
              >
                <CreditCard className="w-5 h-5 mr-2" />
                Make Payment Now
              </Link>
              <Link
                href="/tenant/payment-methods"
                className="inline-flex items-center justify-center px-8 py-4 border border-gray-300 text-base font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <Settings className="w-5 h-5 mr-2" />
                Payment Methods
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      <EnhancedLeaseDetailsCard lease={lease} showPaymentInfo={true} />
    </div>
  );
}

function ActiveLeaseContent({ lease, paymentStats, recentPayments, pendingInvoices, recentMaintenance }) {
  const daysUntilDue = lease.nextPaymentDue ? 
    Math.ceil((new Date(lease.nextPaymentDue) - new Date()) / (1000 * 60 * 60 * 24)) : null;
  
  return (
    <div className="space-y-8">
      {/* Quick Stats */}
      <QuickStatsCards lease={lease} paymentStats={paymentStats} />
      
      {/* Pending Invoices Alert */}
      {pendingInvoices.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <div className="bg-red-100 rounded-full p-3 mr-4">
                <Receipt className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-red-900 mb-2">
                  {pendingInvoices.length} Pending Invoice{pendingInvoices.length > 1 ? 's' : ''}
                </h3>
                <p className="text-red-700 text-lg mb-4">
                  You have outstanding invoices that require payment.
                </p>
                <div className="space-y-2">
                  {pendingInvoices.slice(0, 2).map((invoice) => (
                    <div key={invoice._id} className="flex items-center justify-between bg-white rounded-lg p-3">
                      <div>
                        <p className="font-medium text-gray-900">{invoice.description}</p>
                        <p className="text-sm text-gray-600">Due: {new Date(invoice.dueDate).toLocaleDateString()}</p>
                      </div>
                      <span className="font-bold text-red-600">ZMW {invoice.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Link
                href="/tenant/invoices"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                <Receipt className="w-5 h-5 mr-2" />
                View & Pay Invoices
              </Link>
              {pendingInvoices.length > 0 && (
                <Link
                  href={`/tenant/invoices/${pendingInvoices[0]._id}/pay`}
                  className="inline-flex items-center px-6 py-3 border border-red-300 text-base font-medium rounded-xl text-red-700 bg-white hover:bg-red-50 transition-colors"
                >
                  <Zap className="w-5 h-5 mr-2" />
                  Quick Pay
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Payment Reminder */}
      {daysUntilDue !== null && daysUntilDue <= 10 && (
        <div className={`border-2 rounded-2xl p-6 ${
          daysUntilDue <= 3 
            ? 'bg-red-50 border-red-200' 
            : daysUntilDue <= 7
            ? 'bg-yellow-50 border-yellow-200'
            : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <div className={`rounded-full p-3 mr-4 ${
                daysUntilDue <= 3 ? 'bg-red-100' : daysUntilDue <= 7 ? 'bg-yellow-100' : 'bg-blue-100'
              }`}>
                <Clock className={`w-6 h-6 ${
                  daysUntilDue <= 3 ? 'text-red-600' : daysUntilDue <= 7 ? 'text-yellow-600' : 'text-blue-600'
                }`} />
              </div>
              <div>
                <h3 className={`text-xl font-bold mb-2 ${
                  daysUntilDue <= 3 ? 'text-red-900' : daysUntilDue <= 7 ? 'text-yellow-900' : 'text-blue-900'
                }`}>
                  {daysUntilDue <= 0 ? 'Payment Overdue!' : `Payment Due ${daysUntilDue <= 3 ? 'Soon' : 'This Week'}`}
                </h3>
                <p className={`text-lg mb-1 ${
                  daysUntilDue <= 3 ? 'text-red-700' : daysUntilDue <= 7 ? 'text-yellow-700' : 'text-blue-700'
                }`}>
                  {daysUntilDue <= 0 
                    ? 'Your payment is overdue. Please pay immediately to avoid late fees.'
                    : `Your next payment of ZMW ${lease.monthlyRent?.toLocaleString()} is due in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}.`
                  }
                </p>
                <p className="text-sm text-gray-600">
                  Due Date: {new Date(lease.nextPaymentDue).toLocaleDateString()}
                </p>
              </div>
            </div>
            <Link
              href={`/tenant/payments/make-payment`}
              className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white transition-colors ${
                daysUntilDue <= 3 ? 'bg-red-600 hover:bg-red-700' : 
                daysUntilDue <= 7 ? 'bg-yellow-600 hover:bg-yellow-700' : 
                'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <CreditCard className="w-5 h-5 mr-2" />
              Pay Now
            </Link>
          </div>
        </div>
      )}
      
      {/* Enhanced Quick Actions Grid */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickActionCard
            href="/tenant/payments/new"
            icon={Plus}
            title="Make Payment"
            description="Pay rent or other charges"
            color="green"
            highlight={daysUntilDue <= 5}
          />
          <QuickActionCard
            href="/tenant/maintenance/new"
            icon={Wrench}
            title="Request Maintenance"
            description="Report issues and repairs"
            color="blue"
          />
          <QuickActionCard
            href="/tenant/invoices"
            icon={Receipt}
            title="View Invoices"
            description="Manage bills and payments"
            color="purple"
            badge={pendingInvoices.length > 0 ? pendingInvoices.length : null}
          />
          <QuickActionCard
            href="/tenant/payments"
            icon={CreditCard}
            title="Payment History"
            description="View all transactions"
            color="indigo"
          />
        </div>
      </div>
      
      {/* Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Payments */}
        {recentPayments.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Recent Payments</h3>
              <Link
                href="/tenant/payments"
                className="text-blue-600 hover:text-blue-800 font-medium flex items-center"
              >
                View All
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
            <div className="space-y-4">
              {recentPayments.map((payment) => (
                <div key={payment._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center">
                    <div className="bg-green-100 rounded-full p-2 mr-4">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        ZMW {payment.amount?.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(payment.paidAt || payment.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                    Completed
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Recent Maintenance */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Maintenance Requests</h3>
            <Link
              href="/tenant/maintenance"
              className="text-blue-600 hover:text-blue-800 font-medium flex items-center"
            >
              View All
              <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          {recentMaintenance.length > 0 ? (
            <div className="space-y-4">
              {recentMaintenance.map((request) => (
                <div key={request._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center">
                    <div className={`rounded-full p-2 mr-4 ${
                      request.status === 'completed' ? 'bg-green-100' :
                      request.status === 'in_progress' ? 'bg-blue-100' :
                      'bg-yellow-100'
                    }`}>
                      <Wrench className={`w-5 h-5 ${
                        request.status === 'completed' ? 'text-green-600' :
                        request.status === 'in_progress' ? 'text-blue-600' :
                        'text-yellow-600'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {request.title || request.description?.substring(0, 30) + '...'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                    request.status === 'completed' ? 'bg-green-100 text-green-800' :
                    request.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {request.status.replace('_', ' ').charAt(0).toUpperCase() + request.status.slice(1).replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No maintenance requests yet</p>
              <Link
                href="/tenant/maintenance/new"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Request Maintenance
              </Link>
            </div>
          )}
        </div>
      </div>
      
      <EnhancedLeaseDetailsCard lease={lease} showPaymentInfo={true} showFullDetails={true} />
    </div>
  );
}

function QuickActionCard({ href, icon: Icon, title, description, color, highlight = false, badge = null }) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 group-hover:bg-blue-200',
    green: 'bg-green-100 text-green-600 group-hover:bg-green-200',
    purple: 'bg-purple-100 text-purple-600 group-hover:bg-purple-200',
    indigo: 'bg-indigo-100 text-indigo-600 group-hover:bg-indigo-200',
  };

  return (
    <Link
      href={href}
      className={`group p-6 border rounded-xl hover:shadow-md transition-all duration-200 bg-white relative ${
        highlight 
          ? 'border-green-300 ring-2 ring-green-100' 
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      {badge && (
        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
          {badge}
        </div>
      )}
      <div className={`w-12 h-12 rounded-lg mb-4 flex items-center justify-center transition-colors ${colorClasses[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="font-semibold text-gray-900 mb-2 group-hover:text-gray-700">{title}</h4>
      <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
      {highlight && (
        <div className="mt-3 text-xs font-medium text-green-600 flex items-center">
          <Zap className="w-3 h-3 mr-1" />
          Action Needed
        </div>
      )}
    </Link>
  );
}

function EnhancedLeaseDetailsCard({ lease, showPaymentInfo = false, showFullDetails = false }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Lease Information</h3>
        <div className="flex items-center space-x-3">
          <Link
            href={`/tenant/lease/${lease._id}/download`}
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Link>
          {lease.status === 'active' && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
              Active
            </span>
          )}
        </div>
      </div>
      
      {/* Property Details */}
      <div className="mb-6">
        <div className="flex items-start space-x-4">
          <div className="bg-blue-100 rounded-lg p-3">
            <MapPin className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 text-lg">
              {lease.propertyId?.address || 'Property address'}
            </h4>
            {lease.propertyId?.description && (
              <p className="text-gray-600 mt-1">{lease.propertyId.description}</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Key Information Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <InfoItem
          label="Monthly Rent"
          value={`ZMW ${lease.monthlyRent?.toLocaleString()}`}
          icon={DollarSign}
        />
        <InfoItem
          label="Security Deposit"
          value={`ZMW ${lease.securityDeposit?.toLocaleString()}`}
          icon={Shield}
        />
        <InfoItem
          label="Lease Term"
          value={`${new Date(lease.startDate).toLocaleDateString()} - ${new Date(lease.endDate).toLocaleDateString()}`}
          icon={Calendar}
        />
        <InfoItem
          label="Lease Duration"
          value={`${Math.ceil((new Date(lease.endDate) - new Date(lease.startDate)) / (1000 * 60 * 60 * 24 * 30))} months`}
          icon={Clock}
        />
        
        {showPaymentInfo && (
          <>
            <InfoItem
              label="Total Paid"
              value={`ZMW ${lease.totalPaid?.toLocaleString() || '0'}`}
              icon={TrendingUp}
            />
            {lease.nextPaymentDue && (
              <InfoItem
                label="Next Payment Due"
                value={new Date(lease.nextPaymentDue).toLocaleDateString()}
                icon={Calendar}
              />
            )}
          </>
        )}
      </div>
      
      {/* Landlord Contact Info */}
      {showFullDetails && lease.landlordId && (
        <div className="pt-6 border-t border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
            <User className="w-5 h-5 mr-2" />
            Landlord Contact
          </h4>
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="space-y-3">
              <div className="flex items-center">
                <User className="w-4 h-4 text-gray-500 mr-3" />
                <span className="text-gray-900 font-medium">
                  {lease.landlordId.name || lease.landlordId.email}
                </span>
              </div>
              {lease.landlordId.email && (
                <div className="flex items-center">
                  <Mail className="w-4 h-4 text-gray-500 mr-3" />
                  <a 
                    href={`mailto:${lease.landlordId.email}`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {lease.landlordId.email}
                  </a>
                </div>
              )}
              {lease.landlordId.phone && (
                <div className="flex items-center">
                  <Phone className="w-4 h-4 text-gray-500 mr-3" />
                  <a 
                    href={`tel:${lease.landlordId.phone}`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {lease.landlordId.phone}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center space-x-3">
      <div className="bg-gray-100 rounded-lg p-2">
        <Icon className="w-4 h-4 text-gray-600" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <p className="text-gray-900 font-semibold">{value}</p>
      </div>
    </div>
  );
}

function RecentPropertyRequests({ propertyRequests }) {
  if (propertyRequests.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Recent Property Requests</h3>
        <Link
          href="/tenant/property-requests"
          className="text-blue-600 hover:text-blue-800 font-medium flex items-center"
        >
          View All ({propertyRequests.length})
          <ChevronRight className="w-4 h-4 ml-1" />
        </Link>
      </div>
      
      <div className="space-y-4">
        {propertyRequests.slice(0, 3).map((request) => (
          <div key={request._id} className="flex items-center justify-between p-6 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
            <div className="flex items-center">
              <div className="bg-white rounded-lg p-3 mr-4 shadow-sm">
                <Home className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-1">
                  {request.requestedPropertyDetails?.address || request.property?.address || 'Property Request'}
                </p>
                <p className="text-sm text-gray-600">
                  Submitted {new Date(request.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                request.status === 'approved' ? 'bg-green-100 text-green-800' :
                request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
              </span>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Main Enhanced Dashboard Component
export default async function TenantDashboard() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user || session.user.role !== 'tenant') {
    redirect('/auth/login');
  }
  
  const dashboardData = await getTenantDashboardData(session.user.id);
  const { currentLease, propertyRequests, unreadNotifications, recentPayments, pendingInvoices, recentMaintenance, paymentStats } = dashboardData;
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Enhanced Header */}
        <WelcomeHeader 
          userName={session.user.name} 
          unreadCount={unreadNotifications.length}
          pendingInvoices={pendingInvoices.length}
          hasActiveLease={currentLease?.status === 'active'}
        />
        
        {/* Main Content - Dynamic based on lease status */}
        <div className="mb-8">
          {!currentLease && <NoLeaseContent />}
          {currentLease?.status === 'pending_signature' && <PendingSignatureContent lease={currentLease} />}
          {currentLease?.status === 'signed' && <SignedAwaitingPaymentContent lease={currentLease} />}
          {currentLease?.status === 'active' && (
            <ActiveLeaseContent 
              lease={currentLease} 
              paymentStats={paymentStats}
              recentPayments={recentPayments}
              pendingInvoices={pendingInvoices}
              recentMaintenance={recentMaintenance}
            />
          )}
        </div>
        
        {/* Recent Property Requests */}
        <RecentPropertyRequests propertyRequests={propertyRequests} />
      </div>
    </div>
  );
}