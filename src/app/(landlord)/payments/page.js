// src/app/payments/page.js
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  Search, 
  Filter,
  Download,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Receipt,
  DollarSign,
  Calendar,
  User,
  Home,
  FileText,
  Eye,
  Edit
} from 'lucide-react';
import { formatDate } from 'utils/date';
import { formatCurrency } from 'utils/currency';

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch payments
  useEffect(() => {
    fetchPayments();
  }, [statusFilter, sortBy, currentPage]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/payments?${params}`);
      if (response.ok) {
        const data = await response.json();
        
        // Handle different response formats
        if (data.payments) {
          setPayments(data.payments);
          setTotalPages(data.pagination?.totalPages || 1);
          setTotalCount(data.pagination?.totalCount || 0);
        } else {
          const paymentsArray = Array.isArray(data) ? data : data.data || [];
          setPayments(paymentsArray);
          setTotalCount(paymentsArray.length);
        }
      } else {
        console.error('Failed to fetch payments');
        setPayments([]);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort payments
  const filteredPayments = payments
    .filter(payment => {
      if (!searchTerm) return true;
      
      const searchLower = searchTerm.toLowerCase();
      const tenantName = payment.tenantId?.name || 
        `${payment.tenantId?.firstName} ${payment.tenantId?.lastName}` || '';
      const propertyAddress = payment.propertyId?.address || payment.propertyId?.name || '';
      
      return (
        payment.reference?.toLowerCase().includes(searchLower) ||
        tenantName.toLowerCase().includes(searchLower) ||
        propertyAddress.toLowerCase().includes(searchLower) ||
        payment.amount?.toString().includes(searchTerm)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'amount_high':
          return (b.amount || 0) - (a.amount || 0);
        case 'amount_low':
          return (a.amount || 0) - (b.amount || 0);
        case 'date_recent':
          return new Date(b.paymentDate) - new Date(a.paymentDate);
        case 'date_old':
          return new Date(a.paymentDate) - new Date(b.paymentDate);
        default:
          return 0;
      }
    });

  const getStatusConfig = (status) => {
    switch (status) {
      case 'verified':
        return { icon: <CheckCircle className="w-4 h-4" />, color: 'text-green-600 bg-green-100', label: 'Verified' };
      case 'pending':
        return { icon: <Clock className="w-4 h-4" />, color: 'text-yellow-600 bg-yellow-100', label: 'Pending' };
      case 'disputed':
        return { icon: <AlertTriangle className="w-4 h-4" />, color: 'text-red-600 bg-red-100', label: 'Disputed' };
      case 'cancelled':
        return { icon: <XCircle className="w-4 h-4" />, color: 'text-gray-600 bg-gray-100', label: 'Cancelled' };
      default:
        return { icon: <Clock className="w-4 h-4" />, color: 'text-gray-600 bg-gray-100', label: status };
    }
  };

  const getPaymentMethodLabel = (method) => {
    const methods = {
      bank_transfer: 'Bank Transfer',
      mobile_money: 'Mobile Money',
      cash: 'Cash',
      cheque: 'Cheque',
      card: 'Card',
      other: 'Other'
    };
    return methods[method] || method;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
                <Receipt className="w-6 h-6 mr-3 text-blue-600" />
                Payment Management
              </h1>
              <p className="text-gray-600">
                Track and manage all rental payments
                {totalCount > 0 && ` (${totalCount} total)`}
              </p>
            </div>
            
            <div className="flex space-x-3 mt-4 md:mt-0">
              <Link
                href="/payments/record"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Record Payment
              </Link>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Payments
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by reference, tenant, property, or amount..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="disputed">Disputed</option>
                <option value="cancelled">Cancelled</option>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="amount_high">Amount (High to Low)</option>
                <option value="amount_low">Amount (Low to High)</option>
                <option value="date_recent">Payment Date (Recent)</option>
                <option value="date_old">Payment Date (Oldest)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Pending', status: 'pending', count: payments.filter(p => p.status === 'pending').length },
            { label: 'Verified', status: 'verified', count: payments.filter(p => p.status === 'verified').length },
            { label: 'Disputed', status: 'disputed', count: payments.filter(p => p.status === 'disputed').length },
            { label: 'Total Amount', status: 'total', count: payments.reduce((sum, p) => sum + (p.amount || 0), 0) }
          ].map((item, index) => {
            const statusConfig = getStatusConfig(item.status);
            return (
              <div key={index} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg ${statusConfig.color}`}>
                    {item.status === 'total' ? <DollarSign className="w-5 h-5" /> : statusConfig.icon}
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">{item.label}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {item.status === 'total' ? formatCurrency(item.count) : item.count}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Payments List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading payments...</span>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No payments found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filters.' 
                  : 'Get started by recording your first payment.'
                }
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <div className="mt-6">
                  <Link
                    href="/payments/record"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Record First Payment
                  </Link>
                </div>
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
                        Property & Tenant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount & Method
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
                      const statusConfig = getStatusConfig(payment.status);
                      const tenantName = payment.tenantId?.name || 
                        `${payment.tenantId?.firstName} ${payment.tenantId?.lastName}` || 
                        'Unknown Tenant';
                      const propertyName = payment.propertyId?.address || payment.propertyId?.name || 'Unknown Property';
                      
                      return (
                        <tr key={payment._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {payment.reference}
                              </div>
                              <div className="text-sm text-gray-500">
                                {formatDate(payment.paymentDate)}
                              </div>
                              {payment.receiptUrl && (
                                <div className="flex items-center mt-1">
                                  <FileText className="w-3 h-3 text-green-500 mr-1" />
                                  <span className="text-xs text-green-600">Receipt</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {tenantName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {propertyName}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {formatCurrency(payment.amount)}
                              </div>
                              <div className="text-sm text-gray-500">
                                {getPaymentMethodLabel(payment.paymentMethod)}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                              {statusConfig.icon}
                              <span className="ml-1">{statusConfig.label}</span>
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <Link
                                href={`/payments/${payment._id}`}
                                className="text-blue-600 hover:text-blue-900 flex items-center"
                                title="View payment"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>
                              {payment.status !== 'cancelled' && (
                                <Link
                                  href={`/payments/${payment._id}/edit`}
                                  className="text-gray-600 hover:text-gray-900 flex items-center"
                                  title="Edit payment"
                                >
                                  <Edit className="w-4 h-4" />
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
                  const statusConfig = getStatusConfig(payment.status);
                  const tenantName = payment.tenantId?.name || 
                    `${payment.tenantId?.firstName} ${payment.tenantId?.lastName}` || 
                    'Unknown Tenant';
                  const propertyName = payment.propertyId?.address || payment.propertyId?.name || 'Unknown Property';
                  
                  return (
                    <div key={payment._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-medium text-gray-900">{payment.reference}</p>
                          <p className="text-sm text-gray-500">{formatDate(payment.paymentDate)}</p>
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                          {statusConfig.icon}
                          <span className="ml-1">{statusConfig.label}</span>
                        </span>
                      </div>
                      
                      <div className="space-y-2 mb-3">
                        <div className="flex items-center text-sm">
                          <User className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-gray-900">{tenantName}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Home className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-gray-900">{propertyName}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <DollarSign className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-gray-900">{formatCurrency(payment.amount)}</span>
                          <span className="text-gray-500 ml-2">via {getPaymentMethodLabel(payment.paymentMethod)}</span>
                        </div>
                        {payment.receiptUrl && (
                          <div className="flex items-center text-sm">
                            <FileText className="w-4 h-4 text-green-500 mr-2" />
                            <span className="text-green-600">Receipt available</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex justify-end space-x-2">
                        <Link
                          href={`/payments/${payment._id}`}
                          className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Link>
                        {payment.status !== 'cancelled' && (
                          <Link
                            href={`/payments/${payment._id}/edit`}
                            className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Showing{' '}
                          <span className="font-medium">{((currentPage - 1) * 20) + 1}</span>
                          {' '}to{' '}
                          <span className="font-medium">
                            {Math.min(currentPage * 20, totalCount)}
                          </span>
                          {' '}of{' '}
                          <span className="font-medium">{totalCount}</span>
                          {' '}results
                        </p>
                      </div>
                      <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Previous
                          </button>
                          
                          {/* Page numbers */}
                          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                            const page = i + 1;
                            return (
                              <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                  currentPage === page
                                    ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                }`}
                              >
                                {page}
                              </button>
                            );
                          })}
                          
                          <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Next
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Quick Stats Footer */}
        {!loading && filteredPayments.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(
                    filteredPayments
                      .filter(p => p.status === 'verified')
                      .reduce((sum, p) => sum + (p.amount || 0), 0)
                  )}
                </div>
                <div className="text-sm text-gray-500">Total Verified</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {formatCurrency(
                    filteredPayments
                      .filter(p => p.status === 'pending')
                      .reduce((sum, p) => sum + (p.amount || 0), 0)
                  )}
                </div>
                <div className="text-sm text-gray-500">Pending Verification</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(
                    filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
                  )}
                </div>
                <div className="text-sm text-gray-500">Total Amount</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}