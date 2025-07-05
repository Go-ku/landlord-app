// app/tenant/payments/success/page.jsx - Server component for payment success
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import dbConnect from 'lib/db';
import Payment from 'models/Payment';
import Lease from 'models/Lease';
import Link from 'next/link';
import PaymentSuccessClient from '@/components/tenant/payments/PaymentSuccessClient';
import { 
  CheckCircle, 
  Home, 
  Receipt, 
  AlertTriangle 
} from 'lucide-react';

// Server component to fetch payment data
export default async function PaymentSuccessPage({ searchParams }) {
  const session = await getServerSession(authOptions);
  
  // Redirect if not authenticated or not a tenant
  if (!session?.user || session.user.role !== 'tenant') {
    redirect('/auth/login');
  }

  const paymentId = searchParams.paymentId;
  
  if (!paymentId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Information Missing</h1>
          <p className="text-gray-600 mb-6">
            We couldn&apos;t find the payment information. Please check your payment history.
          </p>
          <Link
            href="/tenant/payments"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            View Payment History
          </Link>
        </div>
      </div>
    );
  }

  // Fetch payment data on the server
  const paymentData = await getPaymentData(paymentId, session.user.id);
  
  if (!paymentData.success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Not Found</h1>
          <p className="text-gray-600 mb-6">
            {paymentData.error || 'The payment could not be found or you do not have permission to view it.'}
          </p>
          <Link
            href="/tenant/payments"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            View Payment History
          </Link>
        </div>
      </div>
    );
  }

  const { payment, lease } = paymentData;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Payment Successful!
            </h1>
            
            <p className="text-lg text-gray-600 mb-4">
              Your payment of <span className="font-semibold text-green-600">
                ZMW {payment.amount.toLocaleString()}
              </span> has been processed successfully.
            </p>
            
            <div className="inline-flex items-center px-4 py-2 bg-green-50 text-green-800 rounded-full text-sm font-medium">
              <CheckCircle className="w-4 h-4 mr-2" />
              {payment.status === 'completed' ? 'Payment Completed' : 'Payment Confirmed'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Payment Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Payment Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <Receipt className="w-5 h-5 mr-2 text-blue-600" />
                Payment Details
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Payment Amount</h3>
                    <p className="text-2xl font-bold text-gray-900">
                      ZMW {payment.amount.toLocaleString()}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Payment Method</h3>
                    <p className="text-lg text-gray-900 capitalize">
                      {payment.paymentMethod === 'mobile_money' ? 'MTN Mobile Money' : payment.paymentMethod.replace('_', ' ')}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Payment Type</h3>
                    <p className="text-lg text-gray-900 capitalize">
                      {payment.paymentType === 'first_payment' ? 'First Payment (Deposit + Rent)' : 
                       payment.paymentType === 'rent' ? 'Monthly Rent Payment' : 
                       payment.paymentType}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Payment Date</h3>
                    <p className="text-lg text-gray-900">
                      {new Date(payment.paymentDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Reference Number</h3>
                    <p className="text-lg text-gray-900 font-mono">
                      {payment.referenceNumber || payment.receiptNumber}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Status</h3>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      payment.status === 'completed' 
                        ? 'bg-green-100 text-green-800' 
                        : payment.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {payment.status === 'completed' ? 'Completed' : 
                       payment.status === 'pending' ? 'Processing' : 
                       payment.status}
                    </span>
                  </div>
                </div>
              </div>
              
              {payment.description && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
                  <p className="text-gray-900">{payment.description}</p>
                </div>
              )}
            </div>

            {/* Property Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <Home className="w-5 h-5 mr-2 text-green-600" />
                Property Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Property Address</h3>
                  <p className="text-lg text-gray-900">{lease.propertyId?.address || 'Property Address'}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Property Type</h3>
                  <p className="text-lg text-gray-900">{lease.propertyId?.type || 'Residential'}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Monthly Rent</h3>
                  <p className="text-lg text-gray-900">ZMW {lease.monthlyRent?.toLocaleString()}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Lease Status</h3>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${
                    lease.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : lease.status === 'signed'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {lease.status}
                  </span>
                </div>
              </div>

              {lease.landlordId && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Landlord</h3>
                  <p className="text-lg text-gray-900">{lease.landlordId.name || lease.landlordId.email}</p>
                </div>
              )}
            </div>

            {/* Next Steps */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-blue-900 mb-4">What&apos;s Next?</h2>
              <div className="space-y-3">
                {payment.paymentType === 'first_payment' && (
                  <div className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-blue-900">Lease Activated</p>
                      <p className="text-blue-800 text-sm">Your lease is now active and you can move in!</p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-blue-900">Receipt Sent</p>
                    <p className="text-blue-800 text-sm">A payment receipt has been sent to your email address.</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-blue-900">Payment Recorded</p>
                    <p className="text-blue-800 text-sm">Your payment has been recorded in your account history.</p>
                  </div>
                </div>
                
                {lease.nextPaymentDue && (
                  <div className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-blue-900">Next Payment Due</p>
                      <p className="text-blue-800 text-sm">
                        Your next payment of ZMW {lease.monthlyRent?.toLocaleString()} is due on{' '}
                        {new Date(lease.nextPaymentDue).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              
              <div className="space-y-3">
                <PaymentSuccessClient paymentId={payment._id} />
                
                <Link
                  href="/tenant/payments"
                  className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  View Payment History
                </Link>
                
                <Link
                  href="/tenant/dashboard"
                  className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Back to Dashboard
                </Link>
                
                {lease.status === 'active' && (
                  <a
                    href="/tenant/maintenance"
                    className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Report Maintenance
                  </a>
                )}
              </div>
            </div>

            {/* Payment Summary */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Summary</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount Paid:</span>
                  <span className="font-semibold">ZMW {payment.amount.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Method:</span>
                  <span className="font-medium">
                    {payment.paymentMethod === 'mobile_money' ? 'MTN MoMo' : payment.paymentMethod}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Transaction Fee:</span>
                  <span className="font-medium">
                    {payment.paymentMethod === 'mobile_money' ? 'Included' : 'N/A'}
                  </span>
                </div>
                
                <hr className="my-3" />
                
                <div className="flex justify-between text-base">
                  <span className="font-semibold">Total Paid:</span>
                  <span className="font-bold text-green-600">ZMW {payment.amount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Contact Support */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Need Help?</h3>
              
              <div className="space-y-3 text-sm">
                <div>
                  <h4 className="font-medium text-gray-700">Payment Issues</h4>
                  <p className="text-gray-600">support@rentalpay.zm</p>
                  <p className="text-gray-600">+260 XXX XXX XXX</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-700">Property Matters</h4>
                  <p className="text-gray-600">{lease.landlordId?.email || 'Contact via platform'}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-700">Business Hours</h4>
                  <p className="text-gray-600">Mon - Fri: 8:00 AM - 6:00 PM</p>
                  <p className="text-gray-600">Sat: 9:00 AM - 2:00 PM</p>
                </div>
              </div>
            </div>

            {/* Save for Records */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-2">Save This Receipt</h4>
              <p className="text-yellow-800 text-sm">
                Keep this payment confirmation for your records. You can also find it in your payment history.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Server-side function to fetch payment data
async function getPaymentData(paymentId, tenantId) {
  try {
    await dbConnect();
    
    const payment = await Payment.findOne({
      _id: paymentId,
      tenant: tenantId
    })
    .populate('lease')
    .populate({
      path: 'lease',
      populate: [
        {
          path: 'propertyId',
          select: 'address type city'
        },
        {
          path: 'landlordId',
          select: 'name email'
        }
      ]
    })
    .lean();

    if (!payment) {
      return {
        success: false,
        error: 'Payment not found or access denied'
      };
    }

    // Transform payment data for client
    const transformedPayment = {
      ...payment,
      _id: payment._id.toString(),
      paymentDate: payment.paymentDate?.toISOString() || payment.createdAt?.toISOString(),
      createdAt: payment.createdAt?.toISOString(),
      updatedAt: payment.updatedAt?.toISOString()
    };

    return {
      success: true,
      payment: transformedPayment,
      lease: payment.lease
    };

  } catch (error) {
    console.error('Error fetching payment data:', error);
    return {
      success: false,
      error: 'Failed to load payment information'
    };
  }
}

// Metadata for the page
export const metadata = {
  title: 'Payment Successful | Rent Payment',
  description: 'Your rent payment has been processed successfully.',
};

