'use client';
import { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  XCircle,
  Receipt, 
  DollarSign, 
  Calendar, 
  CreditCard,
  User,
  Home,
  FileText,
  Download,
  Mail,
  MessageSquare,
  Edit,
  Trash2,
  Eye,
  Share2
} from 'lucide-react';
import { formatDate, formatDateWithDay } from 'utils/date';
import { formatCurrency } from 'utils/currency';

export default function PaymentDetailClient({ payment }) {
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState('');

  const getStatusConfig = (status) => {
    switch (status) {
      case 'verified':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: <CheckCircle className="w-4 h-4" />,
          label: 'Verified',
          description: 'Payment has been approved and applied to lease balance'
        };
      case 'pending':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: <Clock className="w-4 h-4" />,
          label: 'Pending Verification',
          description: 'Payment is awaiting verification by landlord'
        };
      case 'disputed':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: <AlertTriangle className="w-4 h-4" />,
          label: 'Disputed',
          description: 'Payment requires additional verification or clarification'
        };
      case 'cancelled':
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: <XCircle className="w-4 h-4" />,
          label: 'Cancelled',
          description: 'Payment has been cancelled and reversed'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: <Clock className="w-4 h-4" />,
          label: status,
          description: 'Unknown status'
        };
    }
  };

  const handleVerifyPayment = async () => {
    setActionLoading('verify');
    try {
      const response = await fetch(`/api/payments/${payment._id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify' })
      });
      
      if (response.ok) {
        window.location.reload(); // Refresh to show updated status
      } else {
        throw new Error('Failed to verify payment');
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      alert('Failed to verify payment. Please try again.');
    } finally {
      setActionLoading('');
    }
  };

  const handleDisputePayment = async () => {
    const reason = prompt('Please provide a reason for disputing this payment:');
    if (!reason) return;
    
    setActionLoading('dispute');
    try {
      const response = await fetch(`/api/payments/${payment._id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'dispute',
          notes: reason
        })
      });
      
      if (response.ok) {
        window.location.reload();
      } else {
        throw new Error('Failed to dispute payment');
      }
    } catch (error) {
      console.error('Error disputing payment:', error);
      alert('Failed to dispute payment. Please try again.');
    } finally {
      setActionLoading('');
    }
  };

  const handleDownloadReceipt = () => {
    if (payment.receiptUrl) {
      const link = document.createElement('a');
      link.href = payment.receiptUrl;
      link.download = `Receipt_${payment.reference}_${formatDate(payment.paymentDate)}.${payment.receiptUrl.split('.').pop()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleSharePayment = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Payment Receipt - ${payment.reference}`,
          text: `Payment of ${formatCurrency(payment.amount)} received on ${formatDate(payment.paymentDate)}`,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Share cancelled or failed');
      }
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Payment link copied to clipboard!');
    }
  };

  const statusConfig = getStatusConfig(payment.status);
  const propertyName = payment.propertyId?.address || payment.propertyId?.name || 'Unknown Property';
  const tenantName = payment.tenantId?.name || 
    `${payment.tenantId?.firstName} ${payment.tenantId?.lastName}` || 
    'Unknown Tenant';

  const paymentMethods = {
    bank_transfer: 'Bank Transfer',
    mobile_money: 'Mobile Money',
    cash: 'Cash',
    cheque: 'Cheque',
    card: 'Card Payment',
    other: 'Other'
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
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
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
                  <Receipt className="w-6 h-6 mr-3 text-blue-600" />
                  Payment Details
                </h1>
                <p className="text-gray-600">
                  Reference: <span className="font-mono font-medium">{payment.reference}</span>
                </p>
                <p className="text-gray-600">
                  Recorded on {formatDate(payment.createdAt)}
                </p>
              </div>
              
              <div className="flex items-center space-x-3 mt-4 md:mt-0">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${statusConfig.color}`}>
                  {statusConfig.icon}
                  <span className="ml-2">{statusConfig.label}</span>
                </span>
              </div>
            </div>
            
            {/* Status Description */}
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-700">{statusConfig.description}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Payment Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                Payment Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Amount & Currency</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-semibold text-2xl text-green-600">
                        {formatCurrency(payment.amount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Currency:</span>
                      <span className="font-medium">{payment.currency}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Payment Details</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span className="font-medium">{formatDateWithDay(payment.paymentDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Method:</span>
                      <span className="font-medium">{paymentMethods[payment.paymentMethod] || payment.paymentMethod}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Reference:</span>
                      <span className="font-mono font-medium">{payment.reference}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {payment.description && (
                <div className="mt-6">
                  <h3 className="font-medium text-gray-900 mb-2">Description/Notes</h3>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-md">{payment.description}</p>
                </div>
              )}
            </div>

            {/* Lease Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Home className="w-5 h-5 mr-2 text-blue-600" />
                Lease Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Property</h3>
                  <p className="text-gray-700 mb-1">{propertyName}</p>
                  {payment.propertyId?.type && (
                    <p className="text-sm text-gray-500">Type: {payment.propertyId.type}</p>
                  )}
                  <Link
                    href={`/properties/${payment.propertyId?._id}`}
                    className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm mt-2"
                  >
                    View Property Details →
                  </Link>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Tenant</h3>
                  <p className="text-gray-700 mb-1">{tenantName}</p>
                  {payment.tenantId?.email && (
                    <p className="text-sm text-gray-500">{payment.tenantId.email}</p>
                  )}
                  {payment.tenantId?.phone && (
                    <p className="text-sm text-gray-500">{payment.tenantId.phone}</p>
                  )}
                </div>
              </div>
              
              {payment.leaseId && (
                <div className="mt-4 pt-4 border-t">
                  <Link
                    href={`/leases/${payment.leaseId._id}`}
                    className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    View Full Lease Details →
                  </Link>
                </div>
              )}
            </div>

            {/* Receipt/Proof */}
            {payment.receiptUrl && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-purple-600" />
                  Receipt/Proof
                </h2>
                
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center">
                    <Receipt className="w-8 h-8 text-gray-400 mr-3" />
                    <div>
                      <p className="font-medium text-gray-900">Receipt File</p>
                      <p className="text-sm text-gray-500">Uploaded with payment</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => window.open(payment.receiptUrl, '_blank')}
                      className="inline-flex items-center px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </button>
                    <button
                      onClick={handleDownloadReceipt}
                      className="inline-flex items-center px-3 py-2 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Verification Details */}
            {payment.verifiedAt && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Verification Details</h2>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Verified Date:</span>
                    <span className="font-medium">{formatDateWithDay(payment.verifiedAt)}</span>
                  </div>
                  
                  {payment.verifiedBy && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Verified By:</span>
                      <span className="font-medium">
                        {payment.verifiedBy.name || `${payment.verifiedBy.firstName} ${payment.verifiedBy.lastName}`}
                      </span>
                    </div>
                  )}
                  
                  {payment.verificationNotes && (
                    <div>
                      <span className="text-gray-600 block mb-1">Notes:</span>
                      <p className="text-gray-700 bg-gray-50 p-3 rounded-md">{payment.verificationNotes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              
              <div className="space-y-2">
                {payment.status === 'pending' && (
                  <>
                    <button
                      onClick={handleVerifyPayment}
                      disabled={actionLoading === 'verify'}
                      className="w-full text-left px-3 py-2 text-sm text-green-700 bg-green-50 hover:bg-green-100 rounded-md flex items-center disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4 mr-3" />
                      {actionLoading === 'verify' ? 'Verifying...' : 'Verify Payment'}
                    </button>
                    
                    <button
                      onClick={handleDisputePayment}
                      disabled={actionLoading === 'dispute'}
                      className="w-full text-left px-3 py-2 text-sm text-red-700 bg-red-50 hover:bg-red-100 rounded-md flex items-center disabled:opacity-50"
                    >
                      <AlertTriangle className="w-4 h-4 mr-3" />
                      {actionLoading === 'dispute' ? 'Disputing...' : 'Dispute Payment'}
                    </button>
                  </>
                )}
                
                <button
                  onClick={handleSharePayment}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md flex items-center"
                >
                  <Share2 className="w-4 h-4 mr-3" />
                  Share Payment Details
                </button>
                
                <Link
                  href={`/payments/${payment._id}/edit`}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md flex items-center block"
                >
                  <Edit className="w-4 h-4 mr-3" />
                  Edit Payment
                </Link>
                
                <Link
                  href="/payments/record"
                  className="w-full text-left px-3 py-2 text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md flex items-center block"
                >
                  <Receipt className="w-4 h-4 mr-3" />
                  Record New Payment
                </Link>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Summary</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment ID:</span>
                  <span className="font-mono text-xs">{payment._id}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-medium">{statusConfig.label}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium">{formatCurrency(payment.amount)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">{formatDate(payment.paymentDate)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Method:</span>
                  <span className="font-medium">{paymentMethods[payment.paymentMethod]}</span>
                </div>
                
                {payment.receiptUrl && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Receipt:</span>
                    <span className="text-green-600 font-medium">✓ Available</span>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-2 h-2 mt-2 bg-blue-600 rounded-full"></div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Payment Recorded</p>
                    <p className="text-xs text-gray-500">{formatDateWithDay(payment.createdAt)}</p>
                  </div>
                </div>
                
                {payment.verifiedAt && (
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-2 h-2 mt-2 bg-green-600 rounded-full"></div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">Payment {payment.status === 'verified' ? 'Verified' : 'Disputed'}</p>
                      <p className="text-xs text-gray-500">{formatDateWithDay(payment.verifiedAt)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}