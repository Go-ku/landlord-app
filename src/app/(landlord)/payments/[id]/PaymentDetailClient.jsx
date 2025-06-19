// app/payments/[id]/PaymentDetailClient.js - Client Component
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Download, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Home, 
  Calendar, 
  CreditCard,
  FileText,
  AlertCircle,
  Edit,
  Trash2,
  MoreVertical
} from 'lucide-react';

export default function PaymentDetailClient({ payment, currentUser }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showActions, setShowActions] = useState(false);

  // Helper functions
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZM', {
      style: 'currency',
      currency: 'ZMW'
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-ZM', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'failed':
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-gray-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed':
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const canEdit = () => {
    return ['manager', 'admin'].includes(currentUser.role) || 
           (currentUser.role === 'landlord' && payment.property?.landlord === currentUser.id);
  };

  const canApprove = () => {
    return ['manager', 'admin'].includes(currentUser.role) && 
           payment.approvalStatus === 'pending';
  };

  const handleApprove = async () => {
    if (!confirm('Are you sure you want to approve this payment?')) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/payments/${payment._id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Approved via payment details' })
      });

      if (response.ok) {
        router.refresh();
      } else {
        alert('Failed to approve payment');
      }
    } catch (error) {
      console.error('Error approving payment:', error);
      alert('Failed to approve payment');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/payments/${payment._id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        router.refresh();
      } else {
        alert('Failed to reject payment');
      }
    } catch (error) {
      console.error('Error rejecting payment:', error);
      alert('Failed to reject payment');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceipt = () => {
    // TODO: Implement receipt download
    alert('Receipt download will be implemented');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Payment Details
              </h1>
              <p className="text-gray-600">
                Receipt #{payment.receiptNumber}
              </p>
            </div>
          </div>

          {/* Actions Menu */}
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            
            {showActions && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                <div className="py-1">
                  <button
                    onClick={handleDownloadReceipt}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Download className="w-4 h-4 mr-3" />
                    Download Receipt
                  </button>
                  
                  {canEdit() && (
                    <Link
                      href={`/payments/${payment._id}/edit`}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Edit className="w-4 h-4 mr-3" />
                      Edit Payment
                    </Link>
                  )}
                  
                  {canApprove() && (
                    <>
                      <button
                        onClick={handleApprove}
                        disabled={loading}
                        className="flex items-center w-full px-4 py-2 text-sm text-green-700 hover:bg-green-50"
                      >
                        <CheckCircle className="w-4 h-4 mr-3" />
                        Approve
                      </button>
                      <button
                        onClick={handleReject}
                        disabled={loading}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                      >
                        <XCircle className="w-4 h-4 mr-3" />
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Payment Overview */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">
                  {formatCurrency(payment.amount)}
                </h2>
                <p className="text-gray-600 capitalize">
                  {payment.paymentType} payment
                </p>
              </div>
              <div className="text-right">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(payment.status)}`}>
                  {getStatusIcon(payment.status)}
                  <span className="ml-2 capitalize">{payment.status}</span>
                </div>
                {payment.approvalStatus !== payment.status && (
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border mt-2 ${getStatusColor(payment.approvalStatus)}`}>
                    {getStatusIcon(payment.approvalStatus)}
                    <span className="ml-2 capitalize">{payment.approvalStatus}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Payment Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Payment Details
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium">{formatDate(payment.paymentDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Method:</span>
                    <span className="font-medium capitalize">{payment.paymentMethod.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Reference:</span>
                    <span className="font-medium">{payment.referenceNumber || 'N/A'}</span>
                  </div>
                  {payment.lateFee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Late Fee:</span>
                      <span className="font-medium text-red-600">{formatCurrency(payment.lateFee)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Property & Tenant Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Home className="w-5 h-5 mr-2" />
                  Property & Tenant
                </h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-600 block">Property:</span>
                    <span className="font-medium">{payment.property?.address || payment.property?.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 block">Tenant:</span>
                    <span className="font-medium">
                      {payment.tenant?.name || 
                       `${payment.tenant?.firstName} ${payment.tenant?.lastName}`.trim() ||
                       'Unknown Tenant'}
                    </span>
                  </div>
                  {payment.tenant?.email && (
                    <div>
                      <span className="text-gray-600 block">Email:</span>
                      <span className="font-medium">{payment.tenant.email}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            {payment.description && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Description
                </h3>
                <p className="text-gray-700">{payment.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Approval History */}
        {payment.approvalHistory && payment.approvalHistory.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Approval History
              </h3>
              <div className="space-y-4">
                {payment.approvalHistory.map((entry, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getStatusColor(entry.action)}`}>
                      {getStatusIcon(entry.action)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium capitalize">{entry.action}</span>
                        <span className="text-sm text-gray-500">
                          {formatDate(entry.timestamp)}
                        </span>
                      </div>
                      {entry.notes && (
                        <p className="text-gray-600 text-sm mt-1">{entry.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Rejection Reason */}
        {payment.rejectionReason && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <XCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Rejection Reason</h3>
                <p className="text-sm text-red-700 mt-1">{payment.rejectionReason}</p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          <Link
            href="/payments"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            All Payments
          </Link>
          
          {payment.property && (
            <Link
              href={`/properties/${payment.property._id}`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <Home className="w-4 h-4 mr-2" />
              View Property
            </Link>
          )}
          
          {payment.lease && (
            <Link
              href={`/leases/${payment.lease._id}`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <FileText className="w-4 h-4 mr-2" />
              View Lease
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}