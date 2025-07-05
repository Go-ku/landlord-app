// app/payments/PaymentsClient.js - Mobile-First Client Component
'use client';

import { useState, useEffect, useMemo } from 'react';
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
  CreditCard,
  X,
  SlidersHorizontal,
  Building,
  Mail,
  MapPin
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

  // Role-based access control
  const hasSystemWideAccess = userRole === 'manager' || userRole === 'admin';
  const canEditPayments = userRole === 'landlord' || userRole === 'manager' || userRole === 'admin';
  const canRecordPayments = userRole === 'landlord' || userRole === 'manager' || userRole === 'admin';
  const canViewAllPayments = userRole === 'manager' || userRole === 'admin';
  const canViewPropertyFilters = userRole === 'manager' || userRole === 'admin';
  const canViewTenantFilters = userRole === 'manager' || userRole === 'admin';

  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Simplified state management
  const [payments, setPayments] = useState(initialPayments);
  const [pagination, setPagination] = useState(initialPagination);
  const [loading, setLoading] = useState(false);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState(initialSearchParams.search || '');
  const [statusFilter, setStatusFilter] = useState(initialSearchParams.status || 'all');
  const [timeFilter, setTimeFilter] = useState(initialSearchParams.timeFilter || 'all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Advanced filters (only for managers/admins with system-wide access)
  const [tenantFilter, setTenantFilter] = useState(initialSearchParams.tenant || '');
  const [propertyFilter, setPropertyFilter] = useState(initialSearchParams.property || '');
  const [dateFromFilter, setDateFromFilter] = useState(initialSearchParams.dateFrom || '');
  const [dateToFilter, setDateToFilter] = useState(initialSearchParams.dateTo || '');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // Items per page

  // Status configuration
  const getStatusConfig = (status) => {
    switch (status) {
      case 'completed':
      case 'verified':
        return { 
          icon: <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />, 
          color: 'bg-green-100 text-green-800 border-green-200', 
          label: 'Verified',
          value: 'verified'
        };
      case 'pending':
        return { 
          icon: <Clock className="w-3 h-3 sm:w-4 sm:h-4" />, 
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
          label: 'Pending',
          value: 'pending'
        };
      case 'failed':
      case 'disputed':
        return { 
          icon: <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4" />, 
          color: 'bg-red-100 text-red-800 border-red-200', 
          label: 'Disputed',
          value: 'disputed'
        };
      case 'cancelled':
        return { 
          icon: <XCircle className="w-3 h-3 sm:w-4 sm:h-4" />, 
          color: 'bg-gray-100 text-gray-800 border-gray-200', 
          label: 'Cancelled',
          value: 'cancelled'
        };
      default:
        return { 
          icon: <Clock className="w-3 h-3 sm:w-4 sm:h-4" />, 
          color: 'bg-gray-100 text-gray-800 border-gray-200', 
          label: status || 'Unknown',
          value: status || 'unknown'
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

  const getTenantName = (tenant) => {
    if (!tenant) return 'Unknown Tenant';
    if (tenant.name) return tenant.name;
    if (tenant.firstName || tenant.lastName) {
      return `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim();
    }
    return 'Unknown Tenant';
  };

  // Time filter options
  const timeFilterOptions = [
    { value: 'all', label: 'All Time' },
    { value: '7days', label: 'Past 7 Days' },
    { value: '1month', label: 'Past Month' },
    { value: '3months', label: 'Past 3 Months' },
    { value: '6months', label: 'Past 6 Months' },
    { value: '1year', label: 'Past Year' }
  ];

  // Get date range for time filter
  const getTimeFilterRange = (timeFilter) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (timeFilter) {
      case '7days':
        return {
          from: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
          to: now
        };
      case '1month':
        return {
          from: new Date(today.getFullYear(), today.getMonth() - 1, today.getDate()),
          to: now
        };
      case '3months':
        return {
          from: new Date(today.getFullYear(), today.getMonth() - 3, today.getDate()),
          to: now
        };
      case '6months':
        return {
          from: new Date(today.getFullYear(), today.getMonth() - 6, today.getDate()),
          to: now
        };
      case '1year':
        return {
          from: new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()),
          to: now
        };
      default:
        return null;
    }
  };

  // Filter and search logic with useMemo for performance
  const filteredPayments = useMemo(() => {
    return payments.filter(payment => {
      const tenantName = getTenantName(payment.tenant).toLowerCase();
      const tenantEmail = (payment.tenant?.email || '').toLowerCase();
      const propertyAddress = (payment.property?.address || '').toLowerCase();
      const propertyName = (payment.property?.name || '').toLowerCase();
      const receiptNumber = (payment.receiptNumber || '').toLowerCase();
      const referenceNumber = (payment.referenceNumber || '').toLowerCase();
      const amount = (payment.amount || 0).toString();
      
      const searchLower = searchQuery.toLowerCase();
      
      // Search across multiple fields
      const matchesSearch = searchQuery === '' || 
        receiptNumber.includes(searchLower) ||
        referenceNumber.includes(searchLower) ||
        tenantName.includes(searchLower) ||
        tenantEmail.includes(searchLower) ||
        propertyAddress.includes(searchLower) ||
        propertyName.includes(searchLower) ||
        amount.includes(searchQuery) ||
        payment._id.toLowerCase().includes(searchLower);

      // Status filter
      const matchesStatus = statusFilter === 'all' || 
        (payment.status === 'completed' ? 'verified' : payment.status) === statusFilter;

      // Time filter
      const paymentDate = new Date(payment.paymentDate);
      const timeRange = getTimeFilterRange(timeFilter);
      const matchesTimeFilter = timeFilter === 'all' || 
        (timeRange && paymentDate >= timeRange.from && paymentDate <= timeRange.to);

      // Tenant filter (only for managers/admins)
      const matchesTenant = !hasSystemWideAccess || !tenantFilter || 
        payment.tenant?._id === tenantFilter;

      // Property filter (only for managers/admins)
      const matchesProperty = !hasSystemWideAccess || !propertyFilter || 
        payment.property?._id === propertyFilter;

      // Date range filter (only for managers/admins) - overrides time filter if set
      const paymentDateTime = new Date(payment.paymentDate);
      const matchesDateFrom = !hasSystemWideAccess || !dateFromFilter || 
        paymentDateTime >= new Date(dateFromFilter);
      const matchesDateTo = !hasSystemWideAccess || !dateToFilter || 
        paymentDateTime <= new Date(dateToFilter + 'T23:59:59');

      // Use custom date range if both from and to are set, otherwise use time filter
      const matchesDateRange = (hasSystemWideAccess && dateFromFilter && dateToFilter) 
        ? (matchesDateFrom && matchesDateTo)
        : matchesTimeFilter;

      // Role-based access control
      const hasAccess = userRole === 'tenant' 
        ? payment.tenant?._id === userId || payment.tenantId === userId
        : userRole === 'landlord'
        ? payment.property?.landlordId === userId || payment.landlord === userId
        : hasSystemWideAccess; // managers and admins see all

      return matchesSearch && matchesStatus && matchesDateRange && matchesTenant && 
             matchesProperty && hasAccess;
    });
  }, [payments, searchQuery, statusFilter, timeFilter, tenantFilter, propertyFilter, 
      dateFromFilter, dateToFilter, hasSystemWideAccess, userId, userRole]);

  // Paginated payments
  const paginatedPayments = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredPayments.slice(startIndex, endIndex);
  }, [filteredPayments, currentPage, itemsPerPage]);

  // Pagination info
  const paginationInfo = useMemo(() => {
    const totalItems = filteredPayments.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);
    
    return {
      totalItems,
      totalPages,
      startItem,
      endItem,
      currentPage,
      itemsPerPage
    };
  }, [filteredPayments.length, currentPage, itemsPerPage]);

  // Stats calculation with useMemo
  const stats = useMemo(() => {
    const total = payments.length;
    const verified = payments.filter(p => p.status === 'verified' || p.status === 'completed').length;
    const pending = payments.filter(p => p.status === 'pending').length;
    const disputed = payments.filter(p => p.status === 'disputed' || p.status === 'failed').length;
    const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const verifiedAmount = payments
      .filter(p => p.status === 'verified' || p.status === 'completed')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    const pendingAmount = payments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    return {
      total,
      verified,
      pending,
      disputed,
      totalAmount,
      verifiedAmount,
      pendingAmount
    };
  }, [payments]);

  // Clear search and filters
  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTimeFilter('all');
    if (hasSystemWideAccess) {
      setTenantFilter('');
      setPropertyFilter('');
      setDateFromFilter('');
      setDateToFilter('');
    }
    setCurrentPage(1); // Reset to first page when clearing filters
  };

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
    // Scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, timeFilter, tenantFilter, propertyFilter, dateFromFilter, dateToFilter]);

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

  // Handle filter changes with debouncing for search
  const handleSearch = (term) => {
    setSearchQuery(term);
    // Note: In a real implementation, you might want to debounce this
    updateFilters({
      search: term,
      status: statusFilter,
      page: 1
    });
  };

  const handleStatusChange = (status) => {
    setStatusFilter(status);
    updateFilters({
      search: searchQuery,
      status,
      page: 1
    });
  };

  // Mobile-first Stats component
  function PaymentsStats() {
    const statsData = [
      {
        label: 'Total',
        value: stats.total,
        icon: Receipt,
        color: 'blue'
      },
      {
        label: 'Verified',
        value: `${stats.verified} (${formatCurrency(stats.verifiedAmount)})`,
        icon: CheckCircle,
        color: 'green'
      },
      {
        label: 'Pending',
        value: `${stats.pending} (${formatCurrency(stats.pendingAmount)})`,
        icon: Clock,
        color: 'yellow'
      },
      {
        label: 'Total Value',
        value: formatCurrency(stats.totalAmount),
        icon: DollarSign,
        color: 'purple'
      }
    ];

    return (
      <div className="mb-6">
        {/* Mobile: 2x2 Grid */}
        <div className="grid grid-cols-2 gap-3 sm:hidden">
          {statsData.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div key={index} className="bg-white rounded-lg shadow p-3">
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg mr-2 bg-${stat.color}-100`}>
                    <IconComponent className={`w-4 h-4 text-${stat.color}-600`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-600 truncate">{stat.label}</p>
                    <p className="text-sm font-bold text-gray-900 truncate">{stat.value}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop: Horizontal layout */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsData.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div key={index} className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg mr-3 bg-${stat.color}-100`}>
                    <IconComponent className={`w-5 h-5 text-${stat.color}-600`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                    <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Mobile-first empty state
  function EmptyState() {
    const hasFilters = searchQuery || statusFilter !== 'all';
    
    if (hasFilters) {
      return (
        <div className="bg-white rounded-lg shadow">
          <div className="text-center py-12 px-4">
            <div className="mx-auto w-16 h-16 sm:w-24 sm:h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
            <p className="text-gray-500 mb-6 text-sm sm:text-base max-w-sm mx-auto">
              No payments match your current search criteria. Try adjusting your filters.
            </p>
            <button 
              onClick={clearFilters}
              className="inline-flex items-center px-4 py-2 sm:px-6 sm:py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm sm:text-base"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Clear Filters
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow">
        <div className="text-center py-12 px-4">
          <div className="mx-auto w-16 h-16 sm:w-24 sm:h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Receipt className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No payments yet</h3>
          <p className="text-gray-500 mb-6 text-sm sm:text-base max-w-sm mx-auto">
            {userRole === 'tenant' 
              ? 'No payment records available yet.'
              : userRole === 'landlord'
              ? 'No payments found for your properties.'
              : hasSystemWideAccess
              ? 'No payments found in the system.'
              : 'Get started by recording your first payment.'
            }
          </p>
          {canRecordPayments && (
            <Link 
              href="/payments/record" 
              className="inline-flex items-center px-4 py-2 sm:px-6 sm:py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm sm:text-base"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Record First Payment
            </Link>
          )}
        </div>
      </div>
    );
  }

  // Payment card component for mobile
  function PaymentCard({ payment }) {
    const statusConfig = getStatusConfig(payment.status);
    const tenantName = getTenantName(payment.tenant);
    const propertyName = payment.property?.address || payment.property?.name || 'Unknown Property';

    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4 hover:shadow-md transition-shadow">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 truncate">
              {payment.receiptNumber || payment.referenceNumber || 'N/A'}
            </h3>
            <p className="text-xs text-gray-500">
              {formatDate(payment.paymentDate)}
            </p>
          </div>
          <div className="flex items-center ml-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
              {statusConfig.icon}
              <span className="ml-1">{statusConfig.label}</span>
            </span>
          </div>
        </div>

        {/* Tenant Info */}
        <div className="mb-3">
          <div className="flex items-center text-sm text-gray-900 mb-1">
            <User className="w-3 h-3 mr-2 text-gray-400 flex-shrink-0" />
            <span className="font-medium truncate">{tenantName}</span>
          </div>
          {payment.tenant?.email && (
            <div className="flex items-center text-sm text-gray-600">
              <Mail className="w-3 h-3 mr-2 text-gray-400 flex-shrink-0" />
              <span className="truncate">{payment.tenant.email}</span>
            </div>
          )}
        </div>

        {/* Property Info */}
        <div className="bg-gray-50 rounded-lg p-3 mb-3">
          <div className="flex items-center text-sm font-medium text-gray-900 mb-1">
            <Building className="w-3 h-3 mr-1 text-gray-400 flex-shrink-0" />
            <span className="truncate">{propertyName}</span>
          </div>
        </div>

        {/* Amount and Method */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-600">Amount:</span>
            <span className="font-semibold text-gray-900">{formatCurrency(payment.amount)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Method:</span>
            <span className="text-gray-700">{getPaymentMethodLabel(payment.paymentMethod)}</span>
          </div>
        </div>

        {/* Receipt indicator */}
        {payment.receiptUrl && (
          <div className="flex items-center text-sm text-green-600 mb-3">
            <FileText className="w-3 h-3 mr-2" />
            <span>Receipt available</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            ID: {payment._id.slice(-8)}
          </div>
          <div className="flex items-center space-x-2">
            <Link
              href={`/payments/${payment._id}`}
              className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
            >
              <Eye className="w-3 h-3 mr-1" />
              View
            </Link>
            
            {canEditPayments && payment.status !== 'cancelled' && (
              <Link
                href={`/payments/${payment._id}/edit`}
                className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                <Edit className="w-3 h-3 mr-1" />
                Edit
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Desktop table component
  function PaymentsTable({ payments }) {
    return (
      <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
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
              {payments.map((payment) => {
                const statusConfig = getStatusConfig(payment.status);
                const tenantName = getTenantName(payment.tenant);
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
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
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
                        {canEditPayments && payment.status !== 'cancelled' && (
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
      </div>
    );
  }

  // Pagination component
  function PaginationControls() {
    const { totalItems, totalPages, startItem, endItem } = paginationInfo;
    
    if (totalPages <= 1) return null;

    const getVisiblePages = () => {
      const delta = 2;
      const range = [];
      const rangeWithDots = [];

      for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
        range.push(i);
      }

      if (currentPage - delta > 2) {
        rangeWithDots.push(1, '...');
      } else {
        rangeWithDots.push(1);
      }

      rangeWithDots.push(...range);

      if (currentPage + delta < totalPages - 1) {
        rangeWithDots.push('...', totalPages);
      } else if (totalPages > 1) {
        rangeWithDots.push(totalPages);
      }

      return rangeWithDots;
    };

    return (
      <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
        <div className="flex items-center justify-between">
          {/* Mobile pagination */}
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <div className="flex items-center">
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
            </div>
            <button
              onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>

          {/* Desktop pagination */}
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">{startItem}</span>
                {' '}to{' '}
                <span className="font-medium">{endItem}</span>
                {' '}of{' '}
                <span className="font-medium">{totalItems}</span>
                {' '}results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Previous</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {getVisiblePages().map((page, index) => {
                  if (page === '...') {
                    return (
                      <span
                        key={`ellipsis-${index}`}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                      >
                        ...
                      </span>
                    );
                  }
                  
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
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
                  onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Next</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 py-6 sm:container sm:mx-auto sm:p-4">
        {/* Mobile-first Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
                <Receipt className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 text-blue-600 flex-shrink-0" />
                <span className="truncate">
                  {hasSystemWideAccess ? 'Payment Management' : 'Payments'}
                </span>
              </h1>
              <p className="text-gray-600 text-sm sm:text-base mt-1 hidden sm:block">
                {userRole === 'tenant' && `Your payment history and records`}
                {userRole === 'landlord' && `Track payments for your properties`}
                {userRole === 'manager' && `System-wide payment management and oversight`}
                {userRole === 'admin' && `Complete payment system administration`}
                {pagination.total > 0 && ` (${pagination.total} total)`}
              </p>
            </div>
            <div className="ml-4">
              {canRecordPayments && (
                <Link
                  href="/payments/record"
                  className="inline-flex items-center px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Record Payment</span>
                  <span className="sm:hidden">Record</span>
                </Link>
              )}
            </div>
          </div>
          
          {/* Mobile description */}
          <p className="text-gray-600 text-sm sm:hidden">
            {userRole === 'tenant' && `Your payment history`}
            {userRole === 'landlord' && `Track property payments`}
            {userRole === 'manager' && `System-wide management`}
            {userRole === 'admin' && `Complete system admin`}
          </p>
        </div>

        {/* Search and Filter Section */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search payments by reference, tenant, property, or amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-9 sm:pl-10 pr-12 sm:pr-16 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {(searchQuery || statusFilter !== 'all') && (
              <button
                onClick={clearFilters}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>

          {/* Filters Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 overflow-x-auto">
              {/* Time Filter */}
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 whitespace-nowrap"
              >
                {timeFilterOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 whitespace-nowrap"
              >
                <option value="all">All Status</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
                <option value="disputed">Disputed</option>
                <option value="cancelled">Cancelled</option>
              </select>

              {/* Advanced Filters Toggle for System-wide Access */}
              {hasSystemWideAccess && (
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="inline-flex items-center px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 whitespace-nowrap"
                >
                  <SlidersHorizontal className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Advanced</span>
                  <span className="sm:hidden">More</span>
                </button>
              )}

              {/* Mobile filter toggle for non-managers */}
              {!hasSystemWideAccess && (
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="sm:hidden inline-flex items-center px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 whitespace-nowrap"
                >
                  <SlidersHorizontal className="w-4 h-4 mr-1" />
                  More
                </button>
              )}
            </div>

            {/* Results count */}
            <div className="text-sm text-gray-500">
              {filteredPayments.length} of {payments.length} payments
              {paginationInfo.totalPages > 1 && (
                <span className="hidden sm:inline">
                  {' '}• Page {currentPage} of {paginationInfo.totalPages}
                </span>
              )}
            </div>
          </div>

          {/* Active filters display */}
          {(searchQuery || statusFilter !== 'all' || timeFilter !== 'all' ||
            (hasSystemWideAccess && (tenantFilter || propertyFilter || dateFromFilter || dateToFilter))) && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-500">Active filters:</span>
              {searchQuery && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                  Search: `${searchQuery}`
                  <button
                    onClick={() => setSearchQuery('')}
                    className="ml-1 inline-flex items-center p-0.5 rounded-full hover:bg-blue-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {timeFilter !== 'all' && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-indigo-100 text-indigo-800">
                  Time: {timeFilterOptions.find(opt => opt.value === timeFilter)?.label}
                  <button
                    onClick={() => setTimeFilter('all')}
                    className="ml-1 inline-flex items-center p-0.5 rounded-full hover:bg-indigo-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {statusFilter !== 'all' && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                  Status: {statusFilter}
                  <button
                    onClick={() => setStatusFilter('all')}
                    className="ml-1 inline-flex items-center p-0.5 rounded-full hover:bg-green-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {hasSystemWideAccess && tenantFilter && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                  Tenant: {filterOptions?.tenants?.find(t => t._id === tenantFilter)?.name || 'Selected'}
                  <button
                    onClick={() => setTenantFilter('')}
                    className="ml-1 inline-flex items-center p-0.5 rounded-full hover:bg-purple-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {hasSystemWideAccess && propertyFilter && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                  Property: {filterOptions?.properties?.find(p => p._id === propertyFilter)?.address || 'Selected'}
                  <button
                    onClick={() => setPropertyFilter('')}
                    className="ml-1 inline-flex items-center p-0.5 rounded-full hover:bg-orange-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {hasSystemWideAccess && (dateFromFilter || dateToFilter) && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                  Custom Date: {dateFromFilter || '...'} to {dateToFilter || '...'}
                  <button
                    onClick={() => {
                      setDateFromFilter('');
                      setDateToFilter('');
                    }}
                    className="ml-1 inline-flex items-center p-0.5 rounded-full hover:bg-gray-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Advanced Filters for System-wide Access */}
          {hasSystemWideAccess && showFilters && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <h4 className="text-sm font-medium text-gray-900 flex items-center">
                <Filter className="w-4 h-4 mr-2" />
                Advanced Filters (Manager/Admin)
              </h4>
              
              <div className="text-xs text-gray-500 mb-4">
                Note: Custom date range will override the time filter above when both dates are set.
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Tenant Filter */}
                {canViewTenantFilters && filterOptions?.tenants && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tenant
                    </label>
                    <select
                      value={tenantFilter}
                      onChange={(e) => setTenantFilter(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Tenants</option>
                      {filterOptions.tenants.map(tenant => (
                        <option key={tenant._id} value={tenant._id}>
                          {getTenantName(tenant)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Property Filter */}
                {canViewPropertyFilters && filterOptions?.properties && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Property
                    </label>
                    <select
                      value={propertyFilter}
                      onChange={(e) => setPropertyFilter(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Properties</option>
                      {filterOptions.properties.map(property => (
                        <option key={property._id} value={property._id}>
                          {property.address || property.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Date From Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={dateFromFilter}
                    onChange={(e) => setDateFromFilter(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Date To Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={dateToFilter}
                    onChange={(e) => setDateToFilter(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        {payments.length > 0 && <PaymentsStats />}
        
        {/* Content */}
        {loading ? (
          <div className="bg-white rounded-lg shadow">
            <div className="flex justify-center items-center py-12">
              <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
              <span className="ml-3 text-gray-600">Loading payments...</span>
            </div>
          </div>
        ) : filteredPayments.length === 0 ? (
          <EmptyState />
        ) : (
          <div>
            {/* Mobile: Cards */}
            <div className="space-y-4 lg:hidden">
              {paginatedPayments.map((payment) => (
                <PaymentCard key={payment._id} payment={payment} />
              ))}
            </div>

            {/* Desktop: Table */}
            <div className="lg:block">
              <PaymentsTable payments={paginatedPayments} />
              
              {/* Pagination for both mobile and desktop */}
              <PaginationControls />
            </div>
            
            {/* Footer Info */}
            <div className="mt-6 text-center text-xs sm:text-sm text-gray-500">
              Showing {paginationInfo.startItem} to {paginationInfo.endItem} of {filteredPayments.length} {filteredPayments.length === 1 ? 'payment' : 'payments'}
              <span className="hidden sm:inline"> • Last updated: {new Date().toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Summary Statistics */}
        {!loading && paginatedPayments.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
              Payment Summary {paginationInfo.totalPages > 1 && `(All ${filteredPayments.length} payments)`}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-green-600">
                  {formatCurrency(
                    filteredPayments
                      .filter(p => p.status === 'verified' || p.status === 'completed')
                      .reduce((sum, p) => sum + (p.amount || 0), 0)
                  )}
                </div>
                <div className="text-sm text-gray-500">Total Verified</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-yellow-600">
                  {formatCurrency(
                    filteredPayments
                      .filter(p => p.status === 'pending')
                      .reduce((sum, p) => sum + (p.amount || 0), 0)
                  )}
                </div>
                <div className="text-sm text-gray-500">Pending Verification</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-blue-600">
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