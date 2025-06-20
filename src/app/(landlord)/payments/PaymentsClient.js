// app/payments/PaymentsClient.js - Client Component
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  Edit,
  Loader2,
  TrendingUp,
  CreditCard
} from 'lucide-react';

// Utility functions
const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-ZM', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return 'ZMW 0.00';
  return new Intl.NumberFormat('en-ZM', {
    style: 'currency',
    currency: 'ZMW'
  }).format(amount);
};

const formatDateTime = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-ZM', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function PaymentsClient({ initialData }) {
  const {
    payments: initialPayments,
    pagination: initialPagination,
    statistics,
    filterOptions,
    searchParams: initialSearchParams,
    userRole,
    userId,
    userName
  } = initialData;

  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State management
  const [payments, setPayments] = useState(initialPayments);
  const [pagination, setPagination] = useState(initialPagination);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(initialSearchParams.search || '');
  const [statusFilter, setStatusFilter] = useState(initialSearchParams.status || 'all');
  const [sortBy, setSortBy] = useState(initialSearchParams.sortBy || 'newest');
  const [selectedTenant, setSelectedTenant] = useState(initialSearchParams.tenant || '');
  const [selectedProperty, setSelectedProperty] = useState(initialSearchParams.property || '');
  const [showFilters, setShowFilters] = useState(false);

  // Update URL and fetch new data
  const updateFilters = (newParams) => {
    const params = new URLSearchParams();
    
    Object.entries(newParams).forEach(([key, value]) => {
      if (value && value !== 'all' && value !== '') {
        params.set(key, value);
      }
    });

    router.push(`/payments?${params.toString()}`);
  };

  // Handle filter changes
  const handleSearch = (term) => {
    setSearchTerm(term);
    updateFilters({
      search: term,
      status: statusFilter,
      sortBy,
      tenant: selectedTenant,
      property: selectedProperty,
      page: 1
    });
  };

  const handleStatusChange = (status) => {
    setStatusFilter(status);
    updateFilters({
      search: searchTerm,
      status,
      sortBy,
      tenant: selectedTenant,
      property: selectedProperty,
      page: 1
    });
  };

  const handleSortChange = (sort) => {
    setSortBy(sort);
    updateFilters({
      search: searchTerm,
      status: statusFilter,
      sortBy: sort,
      tenant: selectedTenant,
      property: selectedProperty,
      page: pagination.page
    });
  };

  const handlePageChange = (page) => {
    updateFilters({
      search: searchTerm,
      status: statusFilter,
      sortBy,
      tenant: selectedTenant,
      property: selectedProperty,
      page
    });
  };

  // Status configuration
  const getStatusConfig = (status) => {
    switch (status) {
      case 'completed':
      case 'verified':
        return { 
          icon: <CheckCircle className="w-4 h-4" />, 
          color: 'text-green-600 bg-green-100 border-green-200', 
          label: 'Verified' 
        };
      case 'pending':
        return { 
          icon: <Clock className="w-4 h-4" />, 
          color: 'text-yellow-600 bg-yellow-100 border-yellow-200', 
          label: 'Pending' 
        };
      case 'failed':
      case 'disputed':
        return { 
          icon: <AlertTriangle className="w-4 h-4" />, 
          color: 'text-red-600 bg-red-100 border-red-200', 
          label: 'Disputed' 
        };
      case 'cancelled':
        return { 
          icon: <XCircle className="w-4 h-4" />, 
          color: 'text-gray-600 bg-gray-100 border-gray-200', 
          label: 'Cancelled' 
        };
      default:
        return { 
          icon: <Clock className="w-4 h-4" />, 
          color: 'text-gray-600 bg-gray-100 border-gray-200', 
          label: status || 'Unknown' 
        };
    }
  };

  const getPaymentMethodLabel = (method) => {
    const methods = {
      bank_transfer: 'Bank Transfer',
      mobile_money: 'Mobile Money',
      cash: 'Cash',
      cheque: 'Cheque',
      card: 'Card',
      manual: 'Manual Entry',
      other: 'Other'
    };
    return methods[method] || method;
  };

  // Filter payments for display
  const filteredPayments = payments.filter(payment => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const tenantName = payment.tenant?.name || 
      `${payment.tenant?.firstName || ''} ${payment.tenant?.lastName || ''}`.trim();
    const propertyAddress = payment.property?.address || payment.property?.name || '';
    
    return (
      payment.receiptNumber?.toLowerCase().includes(searchLower) ||
      payment.referenceNumber?.toLowerCase().includes(searchLower) ||
      tenantName.toLowerCase().includes(searchLower) ||
      propertyAddress.toLowerCase().includes(searchLower) ||
      payment.amount?.toString().includes(searchTerm)
    );
  });

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
                {userRole === 'tenant' && `Your payment history and records`}
                {userRole === 'landlord' && `Track payments for your properties`}
                {(userRole === 'manager' || userRole === 'admin') && `System-wide payment management`}
                {pagination.total > 0 && ` (${pagination.total} total)`}
              </p>
            </div>
            
            <div className="flex space-x-3 mt-4 md:mt-0">
              {(userRole === 'landlord' || userRole === 'manager' || userRole === 'admin') && (
                <Link
                  href="/payments/record"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Record Payment
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[
            { 
              label: 'Total Payments', 
              value: statistics.totals?.totalCount || 0,
              icon: <Receipt className="w-5 h-5" />,
              color: 'bg-blue-100 text-blue-600'
            },
            { 
              label: 'Verified', 
              value: statistics.statusBreakdown?.verified?.count || statistics.statusBreakdown?.completed?.count || 0,
              icon: <CheckCircle className="w-5 h-5" />,
              color: 'bg-green-100 text-green-600'
            },
            { 
              label: 'Pending', 
              value: statistics.statusBreakdown?.pending?.count || 0,
              icon: <Clock className="w-5 h-5" />,
              color: 'bg-yellow-100 text-yellow-600'
            },
            { 
              label: 'Total Amount', 
              value: formatCurrency(statistics.totals?.totalAmount || 0),
              icon: <DollarSign className="w-5 h-5" />,
              color: 'bg-purple-100 text-purple-600'
            }
          ].map((stat, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className={`p-2 rounded-lg ${stat.color}`}>
                  {stat.icon}
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {typeof stat.value === 'string' ? stat.value : stat.value.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4 lg:mb-0">Filter Payments</h3>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50"
            >
              <Filter className="w-4 h-4 mr-2" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
          </div>

          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${showFilters ? 'block' : 'hidden lg:grid'}`}>
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Payments
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
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
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="completed">Completed</option>
                <option value="disputed">Disputed</option>
                <option value="failed">Failed</option>
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
                onChange={(e) => handleSortChange(e.target.value)}
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

          {/* Advanced Filters for Managers/Admins */}
          {(userRole === 'manager' || userRole === 'admin') && (
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200 ${showFilters ? 'block' : 'hidden lg:grid'}`}>
              {/* Tenant Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tenant
                </label>
                <select
                  value={selectedTenant}
                  onChange={(e) => setSelectedTenant(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Tenants</option>
                  {filterOptions.tenants.map(tenant => (
                    <option key={tenant._id} value={tenant._id}>
                      {tenant.name || `${tenant.firstName} ${tenant.lastName}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Property Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property
                </label>
                <select
                  value={selectedProperty}
                  onChange={(e) => setSelectedProperty(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Properties</option>
                  {filterOptions.properties.map(property => (
                    <option key={property._id} value={property._id}>
                      {property.address || property.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Payments List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
              <span className="ml-3 text-gray-600">Loading payments...</span>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No payments found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filters.' 
                  : userRole === 'tenant'
                  ? 'No payment records available.'
                  : 'Get started by recording your first payment.'
                }
              </p>
              {!searchTerm && statusFilter === 'all' && (userRole === 'landlord' || userRole === 'manager' || userRole === 'admin') && (
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
                        Tenant & Property
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
                      const tenantName = payment.tenant?.name || 
                        `${payment.tenant?.firstName || ''} ${payment.tenant?.lastName || ''}`.trim() || 
                        'Unknown Tenant';
                      const propertyName = payment.property?.address || payment.property?.name || 'Unknown Property';
                      
                      return (
                        <tr key={payment._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {payment.receiptNumber || payment.referenceNumber || 'N/A'}
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
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                              {statusConfig.icon}
                              <span className="ml-1">{statusConfig.label}</span>
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <Link
                                href={`/payments/${payment._id}`}
                                className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                                title="View payment"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>
                              {payment.status !== 'cancelled' && (userRole === 'landlord' || userRole === 'manager' || userRole === 'admin') && (
                                <Link
                                  href={`/payments/${payment._id}/edit`}
                                  className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-50 transition-colors"
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
                  const tenantName = payment.tenant?.name || 
                    `${payment.tenant?.firstName || ''} ${payment.tenant?.lastName || ''}`.trim() || 
                    'Unknown Tenant';
                  const propertyName = payment.property?.address || payment.property?.name || 'Unknown Property';
                  
                  return (
                    <div key={payment._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-medium text-gray-900">
                            {payment.receiptNumber || payment.referenceNumber || 'N/A'}
                          </p>
                          <p className="text-sm text-gray-500">{formatDate(payment.paymentDate)}</p>
                        </div>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
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
                        {payment.status !== 'cancelled' && (userRole === 'landlord' || userRole === 'manager' || userRole === 'admin') && (
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
              {pagination.pages > 1 && (
                <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button
                        onClick={() => handlePageChange(Math.max(pagination.page - 1, 1))}
                        disabled={pagination.page === 1}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => handlePageChange(Math.min(pagination.page + 1, pagination.pages))}
                        disabled={pagination.page === pagination.pages}
                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Showing{' '}
                          <span className="font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span>
                          {' '}to{' '}
                          <span className="font-medium">
                            {Math.min(pagination.page * pagination.limit, pagination.total)}
                          </span>
                          {' '}of{' '}
                          <span className="font-medium">{pagination.total}</span>
                          {' '}results
                        </p>
                      </div>
                      <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                          <button
                            onClick={() => handlePageChange(Math.max(pagination.page - 1, 1))}
                            disabled={pagination.page === 1}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Previous
                          </button>
                          
                          {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => {
                            const page = i + 1;
                            return (
                              <button
                                key={page}
                                onClick={() => handlePageChange(page)}
                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                  pagination.page === page
                                    ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                }`}
                              >
                                {page}
                              </button>
                            );
                          })}
                          
                          <button
                            onClick={() => handlePageChange(Math.min(pagination.page + 1, pagination.pages))}
                            disabled={pagination.page === pagination.pages}
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

        {/* Summary Statistics */}
        {!loading && filteredPayments.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
              Payment Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(
                    filteredPayments
                      .filter(p => p.status === 'verified' || p.status === 'completed')
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