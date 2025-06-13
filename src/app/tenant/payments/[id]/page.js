// app/tenant/payments/[id]/page.js
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Receipt,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Download,
  Building,
  User,
  Calendar,
  DollarSign,
  CreditCard,
  FileText,
  Loader2,
  Mail,
  Phone,
  Copy,
  Check
} from 'lucide-react';

export default function TenantPaymentDetailsPage({ params }) {
  const { data: session } = useSession();
  const router = useRouter();
  const paymentId = params.id;
  
  // State
  const [payment, setPayment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Check authorization
  useEffect(() => {
    if (session && session.user.role !== 'tenant') {
      router.push('/dashboard');
    }
  }, [session, router]);

  // Fetch payment details
  useEffect(() => {
    if (session?.user?.role === 'tenant' && paymentId) {
      fetchPaymentDetails();
    }
  }, [session, paymentId]);

  const fetchPaymentDetails = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tenants/payments/${paymentId}`);
      const data = await response.json();
      
      if (data.success) {
        setPayment(data.data);
        setError('');
      } else {
        setError(data.error || 'Payment not found');
      }
    } catch (error) {
      console.error('Error fetching payment details:', error);
      setError('Failed to load payment details');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusConfig = (status, isOverdue = false) => {
    if (isOverdue) {
      return {
        icon: <AlertTriangle className="w-5 h-5" />,
        color: 'text-red-600 bg-red-100 border-red-200',
        label: 'Overdue',
        textColor: 'text-red-800',
        bgColor: 'bg-red-50'
      };
    }

    switch (status) {
      case 'completed':
      case 'paid':
      case 'verified':
        return {
          icon: <CheckCircle className="w-5 h-5" />,
          color: 'text-green-600 bg-green-100 border-green-200',
          label: 'Verified',
          textColor: 'text-green-800',
          bgColor: 'bg-green-50'
        };
      case 'pending':
        return {
          icon: <Clock className="w-5 h-5" />,
          color: 'text-yellow-600 bg-yellow-100 border-yellow-200',
          label: 'Pending Review',
          textColor: 'text-yellow-800',
          bgColor: 'bg-yellow-50'
        };
      case 'failed':
        return {
          icon: <XCircle className="w-5 h-5" />,
          color: 'text-red-600 bg-red-100 border-red-200',
          label: 'Failed',
          textColor: 'text-red-800',
          bgColor: 'bg-red-50'
        };
      case 'cancelled':
        return {
          icon: <XCircle className="w-5 h-5" />,
          color: 'text-gray-600 bg-gray-100 border-gray-200',
          label: 'Cancelled',
          textColor: 'text-gray-800',
          bgColor: 'bg-gray-50'
        };
      default:
        return {
          icon: <Clock className="w-5 h-5" />,
          color: 'text-gray-600 bg-gray-100 border-gray-200',
          label: status || 'Unknown',
          textColor: 'text-gray-800',
          bgColor: 'bg-gray-50'
        };
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  if (session?.user?.role !== 'tenant') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">This page is only accessible to tenants.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/tenant/payments"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Payments
          </Link>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(
    payment.status, 
    payment.isOverdue
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/tenant/payments"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Payments
          </Link>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
                  <Receipt className="w-8 h-8 mr-3 text-blue-600" />
                  Payment Details
                </h1>
                <p className="text-gray-600">
                  Reference: <span className="font-mono font-medium">{payment.receiptNumber || payment.reference}</span>
                </p>
              </div>
              
              <div className="mt-4 sm:mt-0">
                <span className={`inline-flex items-center px-4 py-2 rounded-lg border font-medium ${statusConfig.color}`}>
                  {statusConfig.icon}
                  <span className="ml-2">{statusConfig.label}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Payment Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <DollarSign className="w-6 h-6 mr-2 text-green-600" />
                Payment Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <p className="text-2xl font-bold text-gray-900">${payment.amount?.toLocaleString()}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type</label>
                  <p className="text-lg text-gray-900 capitalize">
                    {payment.paymentType === 'rent' ? 'Monthly Rent' : 
                     payment.paymentType === 'deposit' ? 'Security Deposit' :
                     payment.paymentType === 'utilities' ? 'Utilities' :
                     payment.paymentType === 'maintenance' ? 'Maintenance Fee' :
                     payment.paymentType === 'fees' ? 'Late Fees' :
                     payment.paymentType || 'Payment'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                  <p className="text-lg text-gray-900">
                    {new Date(payment.paymentDate || payment.createdAt).toLocaleDateString()}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <p className="text-lg text-gray-900 capitalize">
                    {payment.paymentMethod?.replace('_', ' ')}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
                  <div className="flex items-center space-x-2">
                    <p className="text-lg font-mono text-gray-900">{payment.reference}</p>
                    <button
                      onClick={() => copyToClipboard(payment.reference)}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Copy reference"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {payment.dueDate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <p className="text-lg text-gray-900">
                      {new Date(payment.dueDate).toLocaleDateString()}
                      {payment.isOverdue && (
                        <span className="ml-2 text-red-600 text-sm font-medium">
                          ({payment.daysPastDue} days overdue)
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>
              
              {payment.description && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description/Notes</label>
                  <p className="text-gray-900 whitespace-pre-wrap">{payment.description}</p>
                </div>
              )}
            </div>

            {/* Property Information */}
            {payment.property && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <Building className="w-6 h-6 mr-2 text-blue-600" />
                  Property Information
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Property Address</label>
                    <p className="text-lg text-gray-900">{payment.property.address}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
                    <p className="text-lg text-gray-900 capitalize">{payment.property.type}</p>
                  </div>
                  
                  {payment.lease?.monthlyRent && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Rent</label>
                      <p className="text-lg text-gray-900">${payment.lease.monthlyRent.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Receipt/Proof */}
            {payment.receiptUrl && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <FileText className="w-6 h-6 mr-2 text-purple-600" />
                  Payment Proof
                </h2>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <FileText className="w-8 h-8 text-gray-500 mr-3" />
                    <div>
                      <p className="font-medium text-gray-900">Receipt Document</p>
                      <p className="text-sm text-gray-500">Uploaded payment proof</p>
                    </div>
                  </div>
                  <a
                    href={payment.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    View Receipt
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Details */}
            <div className={`rounded-lg border p-6 ${statusConfig.bgColor} ${statusConfig.color.split(' ')[2]}`}>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                {statusConfig.icon}
                <span className="ml-2">Payment Status</span>
              </h3>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Current Status</p>
                  <p className="text-lg font-semibold">{statusConfig.label}</p>
                </div>
                
                {payment.status === 'pending' && (
                  <div className="p-3 bg-white bg-opacity-50 rounded-lg">
                    <p className="text-sm">
                      {`Your payment is being reviewed by management. You will be notified once it's processed.`}
                    </p>
                  </div>
                )}
                
                {payment.status === 'failed' && (
                  <div className="p-3 bg-white bg-opacity-50 rounded-lg">
                    <p className="text-sm">
                      This payment could not be processed. Please contact your landlord or try submitting a new payment.
                    </p>
                  </div>
                )}
                
                {(payment.status === 'completed' || payment.status === 'verified') && (
                  <div className="p-3 bg-white bg-opacity-50 rounded-lg">
                    <p className="text-sm">
                      Payment has been verified and applied to your account.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Timeline */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                Payment Timeline
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Payment Submitted</p>
                    <p className="text-xs text-gray-500">
                      {new Date(payment.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                {payment.approvedAt && (
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Payment Verified</p>
                      <p className="text-xs text-gray-500">
                        {new Date(payment.approvedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
                
                {payment.status === 'pending' && (
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Under Review</p>
                      <p className="text-xs text-gray-500">Processing...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
              
              <div className="space-y-3">
                {payment.receiptUrl && (
                  <a
                    href={payment.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download className="w-4 h-4 inline mr-2" />
                    Download Receipt
                  </a>
                )}
                
                {(payment.status === 'failed' || payment.status === 'pending') && (
                  <Link
                    href="/tenant/payments/new"
                    className="block w-full text-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <CreditCard className="w-4 h-4 inline mr-2" />
                    Make New Payment
                  </Link>
                )}
                
                <Link
                  href="/tenant/contact"
                  className="block w-full text-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Mail className="w-4 h-4 inline mr-2" />
                  Contact Landlord
                </Link>
              </div>
            </div>

            {/* Need Help */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Need Help?</h3>
              <p className="text-sm text-gray-600 mb-4">
                {`If you have questions about this payment or need assistance, don't hesitate to reach out.`}
              </p>
              <Link
                href="/tenant/contact"
                className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                <Phone className="w-4 h-4 mr-1" />
                Contact Support
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}