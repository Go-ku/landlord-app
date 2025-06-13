// app/tenant/payments/page.js
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  DollarSign,
  Calendar,
  Receipt,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  CreditCard,
  Plus,
  Eye,
  Download,
  Loader2,
  Search,
  Filter,
  FileText
} from 'lucide-react';

export default function TenantPaymentsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  
  // State
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  
  // Stats
  const [stats, setStats] = useState({
    totalPaid: 0,
    totalPending: 0,
    totalOverdue: 0,
    paymentsCount: 0
  });

  // Check authorization
  useEffect(() => {
    if (session && session.user.role !== 'tenant') {
      router.push('/dashboard');
    }
  }, [session, router]);

  // Fetch payments
  useEffect(() => {
    if (session?.user?.role === 'tenant') {
      fetchPayments();
    }
  }, [session, statusFilter, sortBy]);

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      params.append('sortBy', sortBy);
      
      const response = await fetch(`/api/tenant/payments?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setPayments(data.data.payments || []);
        setStats(data.data.stats || {});
        setError('');
      } else {
        setError(data.error || 'Failed to fetch payments');
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      setError('Failed to fetch payments');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter payments based on search
  const filteredPayments = payments.filter(payment => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      payment.receiptNumber?.toLowerCase().includes(searchLower) ||
      payment.reference?.toLowerCase().includes(searchLower) ||
      payment.description?.toLowerCase().includes(searchLower) ||
      payment.amount?.toString().includes(searchTerm)
    );
  });

  const getStatusConfig = (payment) => {
    if (payment.isOverdue) {
      return { 
        icon: <AlertTriangle className="w-4 h-4" />, 
        color: 'text-red-600 bg-red-100 border-red-200', 
        label: `Overdue (${payment.daysPastDue} days)`,
        textColor: 'text-red-800'
      };
    }
    
    switch (payment.status) {
      case 'completed':
      case 'paid':
        return { 
          icon: <CheckCircle className="w-4 h-4" />, 
          color: 'text-green-600 bg-green-100 border-green-200', 
          label: 'Paid',
          textColor: 'text-green-800'
        };
      case 'pending':
        return { 
          icon: <Clock className="w-4 h-4" />, 
          color: 'text-yellow-600 bg-yellow-100 border-yellow-200', 
          label: payment.isUpcoming ? 'Due Soon' : 'Pending',
          textColor: 'text-yellow-800'
        };
      case 'failed':
        return { 
          icon: <XCircle className="w-4 h-4" />, 
          color: 'text-red-600 bg-red-100 border-red-200', 
          label: 'Failed',
          textColor: 'text-red-800'
        };
      default:
        return { 
          icon: <Clock className="w-4 h-4" />, 
          color: 'text-gray-600 bg-gray-100 border-gray-200', 
          label: payment.status,
          textColor: 'text-gray-800'
        };
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
          <p className="text-gray-600">Loading your payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/tenant"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center mb-2">
                <Receipt className="w-8 h-8 mr-3 text-blue-600" />
                My Payments
              </h1>
              <p className="text-gray-600">
                Track your rent payments and payment history
              </p>
            </div>
            
            <Link
              href="/tenant/payments/new"
              className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus className="w-4 h-4 mr-2" />
              Make Payment
            </Link>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-400 mr-3" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Paid</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${stats.totalPaid?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${stats.totalPending?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${stats.totalOverdue?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Receipt className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Payments</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.paymentsCount || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Payments
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by reference, amount..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Payments</option>
                <option value="completed">Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            
            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="amount_high">Amount (High to Low)</option>
                <option value="amount_low">Amount (Low to High)</option>
                <option value="due_date">Due Date</option>
              </select>
            </div>
          </div>
        </div>

        {/* Payments List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'You haven\'t made any payments yet'
                }
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <Link
                  href="/tenant/payments/new"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Make Your First Payment
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payment Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount & Method
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Due Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPayments.map((payment) => {
                      const statusConfig = getStatusConfig(payment);
                      
                      return (
                        <tr key={payment._id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {payment.receiptNumber || payment.reference}
                              </div>
                              <div className="text-sm text-gray-500">
                                {new Date(payment.paymentDate || payment.createdAt).toLocaleDateString()}
                              </div>
                              {payment.description && (
                                <div className="text-xs text-gray-400 mt-1">
                                  {payment.description}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                ${payment.amount?.toLocaleString()}
                              </div>
                              <div className="text-sm text-gray-500 capitalize">
                                {payment.paymentMethod?.replace('_', ' ')}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {payment.dueDate ? new Date(payment.dueDate).toLocaleDateString() : '-'}
                            </div>
                            {payment.isOverdue && (
                              <div className="text-xs text-red-600 font-medium">
                                {payment.daysPastDue} days overdue
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                              {statusConfig.icon}
                              <span className="ml-1">{statusConfig.label}</span>
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <Link
                                href={`/tenant/payments/${payment._id}`}
                                className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                                title="View payment details"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>
                              {payment.receiptUrl && (
                                <a
                                  href={payment.receiptUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50 transition-colors"
                                  title="View receipt"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                              )}
                              {(payment.status === 'pending' || payment.status === 'failed') && (
                                <Link
                                  href={`/tenant/payments/retry/${payment._id}`}
                                  className="text-orange-600 hover:text-orange-900 p-1 rounded hover:bg-orange-50 transition-colors"
                                  title="Retry payment"
                                >
                                  <CreditCard className="w-4 h-4" />
                                </Link>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-4 p-4">
                {filteredPayments.map((payment) => {
                  const statusConfig = getStatusConfig(payment);
                  
                  return (
                    <div key={payment._id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {payment.receiptNumber || payment.reference}
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(payment.paymentDate || payment.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                          {statusConfig.icon}
                          <span className="ml-1">{statusConfig.label}</span>
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Amount</p>
                          <p className="font-medium text-gray-900">${payment.amount?.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Method</p>
                          <p className="font-medium text-gray-900 capitalize">
                            {payment.paymentMethod?.replace('_', ' ')}
                          </p>
                        </div>
                        {payment.dueDate && (
                          <div className="col-span-2">
                            <p className="text-gray-600">Due Date</p>
                            <p className="font-medium text-gray-900">
                              {new Date(payment.dueDate).toLocaleDateString()}
                              {payment.isOverdue && (
                                <span className="ml-2 text-red-600 text-xs">
                                  ({payment.daysPastDue} days overdue)
                                </span>
                              )}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {payment.description && (
                        <p className="text-sm text-gray-600 italic">{payment.description}</p>
                      )}
                      
                      <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-100">
                        <Link
                          href={`/tenant/payments/${payment._id}`}
                          className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Link>
                        {payment.receiptUrl && (
                          <a
                            href={payment.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Receipt
                          </a>
                        )}
                        {(payment.status === 'pending' || payment.status === 'failed') && (
                          <Link
                            href={`/tenant/payments/retry/${payment._id}`}
                            className="inline-flex items-center px-3 py-1 text-sm bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200 transition-colors"
                          >
                            <CreditCard className="w-4 h-4 mr-1" />
                            Retry
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Payment Tips */}
        {filteredPayments.length > 0 && (
          <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-blue-600" />
              Payment Tips
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
              <div className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <p>Pay rent by the 1st of each month to avoid late fees</p>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <p>Keep receipts for your records and tax purposes</p>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <p>Set up automatic payments to never miss a due date</p>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <p>Contact your landlord immediately if you have payment issues</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}