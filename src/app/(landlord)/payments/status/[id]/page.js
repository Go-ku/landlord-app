// src/app/payments/status/[id]/page.js - Payment Status Page
'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Smartphone,
  Receipt,
  AlertCircle,
  Copy,
  ExternalLink
} from 'lucide-react';
import { formatCurrency } from '../../../../utils/currency';
import { formatDate } from '../../../../utils/date';

export default function PaymentStatusPage() {
  const params = useParams();
  const router = useRouter();
  const paymentId = params.id;
  
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchPaymentStatus = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setRefreshing(!showLoading);
    
    try {
      const response = await fetch(`/api/payments/${paymentId}`);
      
      if (response.ok) {
        const paymentData = await response.json();
        setPayment(paymentData);
        setError(null);
        
        // If payment is completed or failed, stop auto-refresh
        if (paymentData.status === 'completed' || paymentData.status === 'failed') {
          setAutoRefresh(false);
        }
        
        // If it's a MoMo payment and we have a reference, also check MoMo status
        if (paymentData.paymentMethod === 'mobile_money' && paymentData.referenceNumber) {
          const momoResponse = await fetch(`/api/payments/momo/status/${paymentData.referenceNumber}`);
          if (momoResponse.ok) {
            const momoData = await momoResponse.json();
            setPayment(prev => ({ ...prev, momoData: momoData.data }));
          }
        }
      } else {
        setError('Failed to fetch payment details');
      }
    } catch (err) {
      setError('Error fetching payment status');
      console.error('Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Auto-refresh every 5 seconds for pending payments
  useEffect(() => {
    fetchPaymentStatus();
    
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchPaymentStatus(false);
      }, 5000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [paymentId, autoRefresh]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
      case 'verified':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'failed':
        return <XCircle className="w-6 h-6 text-red-500" />;
      case 'pending':
      default:
        return <Clock className="w-6 h-6 text-yellow-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
      case 'verified':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'failed':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'pending':
      default:
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    }
  };

  const getMoMoStatusDisplay = (momoStatus) => {
    switch (momoStatus) {
      case 'SUCCESSFUL':
        return { label: 'Successful', color: 'text-green-600' };
      case 'FAILED':
        return { label: 'Failed', color: 'text-red-600' };
      case 'PENDING':
        return { label: 'Pending', color: 'text-yellow-600' };
      default:
        return { label: 'Unknown', color: 'text-gray-600' };
    }
  };

  if (loading && !payment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading payment details...</span>
      </div>
    );
  }

  if (error && !payment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Payment</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => fetchPaymentStatus()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href="/payments" 
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Payments
          </Link>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Receipt className="w-6 h-6 mr-3 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Payment Status</h1>
                  <p className="text-gray-600">
                    Track your payment progress and status
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => fetchPaymentStatus(false)}
                disabled={refreshing}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {payment && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Status */}
            <div className="lg:col-span-2 space-y-6">
              {/* Payment Status Card */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Payment Status</h2>
                  {autoRefresh && payment.status === 'pending' && (
                    <div className="flex items-center text-sm text-gray-500">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-2"></div>
                      Auto-refreshing...
                    </div>
                  )}
                </div>
                
                <div className={`p-4 rounded-lg border ${getStatusColor(payment.status)} mb-6`}>
                  <div className="flex items-center">
                    {getStatusIcon(payment.status)}
                    <div className="ml-3">
                      <h3 className="font-medium capitalize">{payment.status}</h3>
                      <p className="text-sm">
                        {payment.status === 'pending' && 'Your payment is being processed'}
                        {payment.status === 'completed' && 'Your payment has been successfully processed'}
                        {payment.status === 'failed' && 'Your payment could not be processed'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* MoMo Status */}
                {payment.paymentMethod === 'mobile_money' && payment.momoData && (
                  <div className="mb-6">
                    <h3 className="font-medium text-gray-900 mb-3">MTN Mobile Money Status</h3>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Smartphone className="w-5 h-5 text-orange-600 mr-2" />
                          <span className="font-medium">MoMo Transaction:</span>
                        </div>
                        <span className={`font-medium ${getMoMoStatusDisplay(payment.momoData.momoStatus).color}`}>
                          {getMoMoStatusDisplay(payment.momoData.momoStatus).label}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Amount:</span>
                    <p className="font-medium text-lg">{formatCurrency(payment.amount)}</p>
                  </div>
                  
                  <div>
                    <span className="text-gray-600">Payment Method:</span>
                    <p className="font-medium capitalize flex items-center">
                      {payment.paymentMethod === 'mobile_money' && <Smartphone className="w-4 h-4 mr-1" />}
                      {payment.paymentMethod.replace('_', ' ')}
                    </p>
                  </div>
                  
                  <div>
                    <span className="text-gray-600">Payment Type:</span>
                    <p className="font-medium capitalize">{payment.paymentType}</p>
                  </div>
                  
                  <div>
                    <span className="text-gray-600">Date:</span>
                    <p className="font-medium">{formatDate(payment.paymentDate)}</p>
                  </div>
                  
                  {payment.referenceNumber && (
                    <div className="md:col-span-2">
                      <span className="text-gray-600">Reference Number:</span>
                      <div className="flex items-center">
                        <p className="font-medium font-mono text-sm">{payment.referenceNumber}</p>
                        <button
                          onClick={() => copyToClipboard(payment.referenceNumber)}
                          className="ml-2 p-1 text-gray-400 hover:text-gray-600"
                          title="Copy reference number"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Property & Lease Info */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Property & Lease Details</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Property:</span>
                    <p className="font-medium">{payment.property?.address || 'N/A'}</p>
                  </div>
                  
                  <div>
                    <span className="text-gray-600">Tenant:</span>
                    <p className="font-medium">
                      {payment.tenant?.name || 
                       `${payment.tenant?.firstName} ${payment.tenant?.lastName}` || 
                       'N/A'}
                    </p>
                  </div>
                  
                  {payment.lease && (
                    <>
                      <div>
                        <span className="text-gray-600">Monthly Rent:</span>
                        <p className="font-medium">{formatCurrency(payment.lease.monthlyRent)}</p>
                      </div>
                      
                      <div>
                        <span className="text-gray-600">Lease Status:</span>
                        <p className="font-medium capitalize">{payment.lease.status}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Approval History */}
              {payment.approvalHistory && payment.approvalHistory.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment History</h2>
                  
                  <div className="space-y-3">
                    {payment.approvalHistory.map((entry, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0">
                          {entry.action === 'approved' && <CheckCircle className="w-5 h-5 text-green-500" />}
                          {entry.action === 'rejected' && <XCircle className="w-5 h-5 text-red-500" />}
                          {entry.action === 'submitted' && <Clock className="w-5 h-5 text-blue-500" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium capitalize">{entry.action}</p>
                          {entry.notes && <p className="text-sm text-gray-600">{entry.notes}</p>}
                          <p className="text-xs text-gray-500">{formatDate(entry.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Next Steps */}
              {payment.status === 'pending' && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Next Steps</h3>
                  
                  {payment.paymentMethod === 'mobile_money' ? (
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start">
                        <Smartphone className="w-4 h-4 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                        <p>Check your phone for MoMo payment prompt</p>
                      </div>
                      <div className="flex items-start">
                        <AlertCircle className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                        <p>Enter your Mobile Money PIN when prompted</p>
                      </div>
                      <div className="flex items-start">
                        <Clock className="w-4 h-4 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                        <p>Wait for payment confirmation</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start">
                        <Clock className="w-4 h-4 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                        <p>Your payment is being reviewed</p>
                      </div>
                      <div className="flex items-start">
                        <AlertCircle className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                        <p>You&apos;ll be notified once approved</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Success Actions */}
              {payment.status === 'completed' && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Complete</h3>
                  
                  <div className="space-y-3">
                    <Link
                      href={`/payments/${payment._id}/receipt`}
                      className="flex items-center justify-center w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Receipt className="w-4 h-4 mr-2" />
                      Download Receipt
                    </Link>
                    
                    <Link
                      href="/payments"
                      className="flex items-center justify-center w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      View All Payments
                    </Link>
                  </div>
                </div>
              )}

              {/* Failed Actions */}
              {payment.status === 'failed' && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Failed</h3>
                  
                  <div className="space-y-3">
                    <Link
                      href={`/payments/record?leaseId=${payment.lease._id}`}
                      className="flex items-center justify-center w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Try Again
                    </Link>
                    
                    <button className="flex items-center justify-center w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                      Contact Support
                    </button>
                  </div>
                </div>
              )}

              {/* Help */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Need Help?</h3>
                
                <div className="space-y-3 text-sm text-gray-700">
                  <p>If you&apos;re experiencing issues with your payment:</p>
                  
                  <ul className="list-disc list-inside space-y-1">
                    <li>Check your mobile money balance</li>
                    <li>Ensure you have network connectivity</li>
                    <li>Try refreshing this page</li>
                    <li>Contact our support team</li>
                  </ul>
                  
                  <div className="pt-3 border-t">
                    <button className="flex items-center text-blue-600 hover:text-blue-800">
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Contact Support
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}