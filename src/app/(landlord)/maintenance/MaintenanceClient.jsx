// src/app/maintenance/MaintenanceClient.js - Mobile-First Client Component
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  RefreshCw, 
  AlertCircle, 
  Loader2, 
  Filter,
  Search,
  Plus,
  Wrench,
  X,
  SlidersHorizontal,
  CheckCircle,
  Clock,
  XCircle,
  User,
  Home,
  Calendar,
  TrendingUp,
  Eye,
  Edit,
  MessageSquare,
  MapPin,
  Building
} from 'lucide-react';

export default function MaintenanceClient({ 
  initialRequests, 
  userRole, 
  userId,
  userName,
  canCreateRequest,
  searchParams 
}) {
  const router = useRouter();
  
  // Role-based access control
  const hasSystemWideAccess = userRole === 'manager' || userRole === 'admin';
  const canEditRequests = userRole === 'landlord' || userRole === 'manager' || userRole === 'admin';
  const canViewAllRequests = userRole === 'manager' || userRole === 'admin';
  const isTenant = userRole === 'tenant';
  const isLandlord = userRole === 'landlord';

  // State management
  const [requests, setRequests] = useState(initialRequests);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState(searchParams?.search || '');
  const [statusFilter, setStatusFilter] = useState(searchParams?.status || 'all');
  const [priorityFilter, setPriorityFilter] = useState(searchParams?.priority || 'all');
  const [showFilters, setShowFilters] = useState(false);

  // Advanced filters for managers/admins
  const [propertyFilter, setPropertyFilter] = useState(searchParams?.property || '');
  const [tenantFilter, setTenantFilter] = useState(searchParams?.tenant || '');
  const [dateFromFilter, setDateFromFilter] = useState(searchParams?.dateFrom || '');
  const [dateToFilter, setDateToFilter] = useState(searchParams?.dateTo || '');

  // Utility functions
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-ZM', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-ZM', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'pending':
        return {
          icon: <Clock className="w-3 h-3 sm:w-4 sm:h-4" />,
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          label: 'Pending',
          value: 'pending'
        };
      case 'in_progress':
        return {
          icon: <Wrench className="w-3 h-3 sm:w-4 sm:h-4" />,
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          label: 'In Progress',
          value: 'in_progress'
        };
      case 'completed':
        return {
          icon: <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />,
          color: 'bg-green-100 text-green-800 border-green-200',
          label: 'Completed',
          value: 'completed'
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

  const getPriorityConfig = (priority) => {
    switch (priority) {
      case 'low':
        return { color: 'text-green-600 bg-green-100', label: 'Low', value: 'low' };
      case 'medium':
        return { color: 'text-yellow-600 bg-yellow-100', label: 'Medium', value: 'medium' };
      case 'high':
        return { color: 'text-orange-600 bg-orange-100', label: 'High', value: 'high' };
      case 'urgent':
        return { color: 'text-red-600 bg-red-100', label: 'Urgent', value: 'urgent' };
      default:
        return { color: 'text-gray-600 bg-gray-100', label: priority || 'Unknown', value: priority || 'unknown' };
    }
  };

  const getTenantName = (tenant) => {
    if (!tenant) return 'Unknown Tenant';
    if (tenant.name) return tenant.name;
    if (tenant.firstName || tenant.lastName) {
      return `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim();
    }
    return 'Unknown Tenant';
  };

  // Filter and search logic with useMemo for performance
  const filteredRequests = useMemo(() => {
    return requests.filter(request => {
      const title = (request.title || '').toLowerCase();
      const description = (request.description || '').toLowerCase();
      const propertyAddress = (request.property?.address || '').toLowerCase();
      const tenantName = getTenantName(request.tenant).toLowerCase();
      const tenantEmail = (request.tenant?.email || '').toLowerCase();
      
      const searchLower = searchQuery.toLowerCase();
      
      // Search across multiple fields
      const matchesSearch = searchQuery === '' || 
        title.includes(searchLower) ||
        description.includes(searchLower) ||
        propertyAddress.includes(searchLower) ||
        tenantName.includes(searchLower) ||
        tenantEmail.includes(searchLower) ||
        request._id.toLowerCase().includes(searchLower);

      // Status filter
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;

      // Priority filter
      const matchesPriority = priorityFilter === 'all' || request.priority === priorityFilter;

      // Property filter (for managers/admins)
      const matchesProperty = !hasSystemWideAccess || !propertyFilter || 
        request.property?._id === propertyFilter;

      // Tenant filter (for managers/admins)
      const matchesTenant = !hasSystemWideAccess || !tenantFilter || 
        request.tenant?._id === tenantFilter;

      // Date range filter (for managers/admins)
      const requestDate = new Date(request.createdAt);
      const matchesDateFrom = !hasSystemWideAccess || !dateFromFilter || 
        requestDate >= new Date(dateFromFilter);
      const matchesDateTo = !hasSystemWideAccess || !dateToFilter || 
        requestDate <= new Date(dateToFilter + 'T23:59:59');

      // Role-based access control
      const hasAccess = isTenant 
        ? request.tenant?._id === userId || request.tenantId === userId
        : isLandlord
        ? request.property?.landlordId === userId || request.landlord === userId
        : hasSystemWideAccess; // managers and admins see all

      return matchesSearch && matchesStatus && matchesPriority && 
             matchesProperty && matchesTenant && matchesDateFrom && 
             matchesDateTo && hasAccess;
    });
  }, [requests, searchQuery, statusFilter, priorityFilter, propertyFilter, 
      tenantFilter, dateFromFilter, dateToFilter, hasSystemWideAccess, 
      userId, isTenant, isLandlord]);

  // Stats calculation with useMemo
  const stats = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter(r => r.status === 'pending').length;
    const inProgress = requests.filter(r => r.status === 'in_progress').length;
    const completed = requests.filter(r => r.status === 'completed').length;
    const urgent = requests.filter(r => r.priority === 'urgent').length;

    return {
      total,
      pending,
      inProgress,
      completed,
      urgent
    };
  }, [requests]);

  // Get unique properties and tenants for filters
  const filterOptions = useMemo(() => {
    const properties = [...new Set(requests.map(r => r.property).filter(Boolean))];
    const tenants = [...new Set(requests.map(r => r.tenant).filter(Boolean))];
    
    return {
      properties: properties.filter((p, index, arr) => 
        arr.findIndex(prop => prop._id === p._id) === index
      ),
      tenants: tenants.filter((t, index, arr) => 
        arr.findIndex(tenant => tenant._id === t._id) === index
      )
    };
  }, [requests]);

  // Clear search and filters
  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setPriorityFilter('all');
    if (hasSystemWideAccess) {
      setPropertyFilter('');
      setTenantFilter('');
      setDateFromFilter('');
      setDateToFilter('');
    }
  };

  // Update URL params
  const updateUrlParams = useCallback(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (priorityFilter !== 'all') params.set('priority', priorityFilter);
    if (hasSystemWideAccess) {
      if (propertyFilter) params.set('property', propertyFilter);
      if (tenantFilter) params.set('tenant', tenantFilter);
      if (dateFromFilter) params.set('dateFrom', dateFromFilter);
      if (dateToFilter) params.set('dateTo', dateToFilter);
    }
    
    const newUrl = `/maintenance${params.toString() ? `?${params.toString()}` : ''}`;
    router.replace(newUrl, { shallow: true });
  }, [searchQuery, statusFilter, priorityFilter, propertyFilter, tenantFilter, 
      dateFromFilter, dateToFilter, hasSystemWideAccess, router]);

  // Update URL when filters change
  useEffect(() => {
    updateUrlParams();
  }, [updateUrlParams]);

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);
      
      const response = await fetch('/api/maintenance', {
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch maintenance requests');
      }

      const data = await response.json();
      
      // Ensure data is an array
      const requestsArray = Array.isArray(data) ? data : data.requests || [];
      setRequests(requestsArray);
      
    } catch (err) {
      setError(err.message);
      console.error('Fetch error:', err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = () => {
    fetchData();
  };

  // Mobile-first Stats component
  function MaintenanceStats() {
    const statsData = [
      {
        label: 'Total Requests',
        value: stats.total,
        icon: Wrench,
        color: 'blue'
      },
      {
        label: 'Pending',
        value: stats.pending,
        icon: Clock,
        color: 'yellow'
      },
      {
        label: 'In Progress',
        value: stats.inProgress,
        icon: RefreshCw,
        color: 'blue'
      },
      {
        label: 'Urgent',
        value: stats.urgent,
        icon: AlertCircle,
        color: 'red'
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
    const hasFilters = searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' ||
      (hasSystemWideAccess && (propertyFilter || tenantFilter || dateFromFilter || dateToFilter));
    
    if (hasFilters) {
      return (
        <div className="bg-white rounded-lg shadow">
          <div className="text-center py-12 px-4">
            <div className="mx-auto w-16 h-16 sm:w-24 sm:h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No requests found</h3>
            <p className="text-gray-500 mb-6 text-sm sm:text-base max-w-sm mx-auto">
              No maintenance requests match your current search criteria. Try adjusting your filters.
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
            <Wrench className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No maintenance requests</h3>
          <p className="text-gray-500 mb-6 text-sm sm:text-base max-w-sm mx-auto">
            {isTenant 
              ? "You haven't submitted any maintenance requests yet."
              : hasSystemWideAccess
              ? "No maintenance requests have been submitted to the system."
              : "No maintenance requests for your properties."}
          </p>
          {canCreateRequest && (
            <Link 
              href="/maintenance/new" 
              className="inline-flex items-center px-4 py-2 sm:px-6 sm:py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm sm:text-base"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              {isTenant ? "Submit First Request" : "Create First Request"}
            </Link>
          )}
        </div>
      </div>
    );
  }

  // Maintenance request card component for mobile
  function MaintenanceCard({ request }) {
    const statusConfig = getStatusConfig(request.status);
    const priorityConfig = getPriorityConfig(request.priority);
    const tenantName = getTenantName(request.tenant);

    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4 hover:shadow-md transition-shadow">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 truncate">
              {request.title || 'Maintenance Request'}
            </h3>
            <p className="text-xs text-gray-500">
              ID: {request._id.slice(-8)} • {formatDate(request.createdAt)}
            </p>
          </div>
          <div className="flex items-center ml-2 space-x-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${priorityConfig.color}`}>
              {priorityConfig.label}
            </span>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
              {statusConfig.icon}
              <span className="ml-1">{statusConfig.label}</span>
            </span>
          </div>
        </div>

        {/* Description */}
        {request.description && (
          <div className="mb-3">
            <p className="text-sm text-gray-600 line-clamp-2">{request.description}</p>
          </div>
        )}

        {/* Property and Tenant Info */}
        <div className="space-y-2 mb-3">
          {request.property && (
            <div className="flex items-center text-sm text-gray-600">
              <Building className="w-3 h-3 mr-2 text-gray-400 flex-shrink-0" />
              <span className="truncate">{request.property.address || 'Unknown Property'}</span>
            </div>
          )}
          {!isTenant && request.tenant && (
            <div className="flex items-center text-sm text-gray-600">
              <User className="w-3 h-3 mr-2 text-gray-400 flex-shrink-0" />
              <span className="truncate">{tenantName}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            Updated {formatDate(request.updatedAt)}
          </div>
          <div className="flex items-center space-x-2">
            <Link
              href={`/maintenance/${request._id}`}
              className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
            >
              <Eye className="w-3 h-3 mr-1" />
              View
            </Link>
            
            {canEditRequests && request.status !== 'completed' && request.status !== 'cancelled' && (
              <Link
                href={`/maintenance/${request._id}/edit`}
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

  // Desktop table component (simplified for this example)
  function MaintenanceTable({ requests }) {
    return (
      <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Request Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Property & Tenant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requests.map((request) => {
                const statusConfig = getStatusConfig(request.status);
                const priorityConfig = getPriorityConfig(request.priority);
                const tenantName = getTenantName(request.tenant);
                
                return (
                  <tr key={request._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {request.title || 'Maintenance Request'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {request.description ? 
                            (request.description.length > 50 ? 
                              request.description.substring(0, 50) + '...' : 
                              request.description
                            ) : 'No description'
                          }
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {request.property?.address || 'Unknown Property'}
                        </div>
                        {!isTenant && (
                          <div className="text-sm text-gray-500">
                            {tenantName}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${priorityConfig.color}`}>
                        {priorityConfig.label}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                        {statusConfig.icon}
                        <span className="ml-1">{statusConfig.label}</span>
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(request.createdAt)}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/maintenance/${request._id}`}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                          title="View request"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        
                        {canEditRequests && request.status !== 'completed' && request.status !== 'cancelled' && (
                          <Link
                            href={`/maintenance/${request._id}/edit`}
                            className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-50 transition-colors"
                            title="Edit request"
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

  return (
    <>
      {/* Mobile-first Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
              <Wrench className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 text-blue-600 flex-shrink-0" />
              <span className="truncate">Maintenance</span>
            </h1>
            <p className="text-gray-600 text-sm sm:text-base mt-1 hidden sm:block">
              {isTenant && "Track your maintenance requests and their status"}
              {isLandlord && "Manage maintenance requests for your properties"}
              {hasSystemWideAccess && "System-wide maintenance request management"}
            </p>
          </div>
          <div className="ml-4 flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center px-3 py-2 sm:px-4 sm:py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400 transition-colors text-sm whitespace-nowrap"
            >
              <RefreshCw className={`w-4 h-4 mr-1 sm:mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            {canCreateRequest && (
              <Link
                href="/maintenance/new"
                className="inline-flex items-center px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm whitespace-nowrap"
              >
                <Plus className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">New Request</span>
                <span className="sm:hidden">New</span>
              </Link>
            )}
          </div>
        </div>
        
        {/* Mobile description */}
        <p className="text-gray-600 text-sm sm:hidden">
          {isTenant && "Your maintenance requests"}
          {isLandlord && "Property maintenance"}
          {hasSystemWideAccess && "System maintenance"}
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Search and Filter Section */}
      <div className="mb-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search requests by title, description, property, or tenant..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-9 sm:pl-10 pr-12 sm:pr-16 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {(searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' ||
            (hasSystemWideAccess && (propertyFilter || tenantFilter || dateFromFilter || dateToFilter))) && (
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
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 whitespace-nowrap"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 whitespace-nowrap"
            >
              <option value="all">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
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
          <div className="text-sm text-gray-500 whitespace-nowrap">
            {filteredRequests.length} of {requests.length} requests
          </div>
        </div>

        {/* Active filters display */}
        {(searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' ||
          (hasSystemWideAccess && (propertyFilter || tenantFilter || dateFromFilter || dateToFilter))) && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500">Active filters:</span>
            {searchQuery && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                Search: "{searchQuery}"
                <button
                  onClick={() => setSearchQuery('')}
                  className="ml-1 inline-flex items-center p-0.5 rounded-full hover:bg-blue-200"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                Status: {statusFilter.replace('_', ' ')}
                <button
                  onClick={() => setStatusFilter('all')}
                  className="ml-1 inline-flex items-center p-0.5 rounded-full hover:bg-green-200"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {priorityFilter !== 'all' && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                Priority: {priorityFilter}
                <button
                  onClick={() => setPriorityFilter('all')}
                  className="ml-1 inline-flex items-center p-0.5 rounded-full hover:bg-purple-200"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {/* Add other filter badges for advanced filters */}
          </div>
        )}

        {/* Advanced Filters for System-wide Access */}
        {hasSystemWideAccess && showFilters && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <h4 className="text-sm font-medium text-gray-900 flex items-center">
              <Filter className="w-4 h-4 mr-2" />
              Advanced Filters (Manager/Admin)
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Property Filter */}
              {filterOptions.properties.length > 0 && (
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
                        {property.address || 'Unknown Address'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Tenant Filter */}
              {filterOptions.tenants.length > 0 && (
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
      {requests.length > 0 && <MaintenanceStats />}

      {/* Quick Actions Bar for Tenants */}
      {isTenant && filteredRequests.length > 0 && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-blue-900">Need to report an issue?</h4>
              <p className="text-sm text-blue-700">Submit a new maintenance request for your property</p>
            </div>
            <Link
              href="/maintenance/new"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Request
            </Link>
          </div>
        </div>
      )}
      
      {/* Content */}
      {filteredRequests.length === 0 ? (
        <EmptyState />
      ) : (
        <div>
          {/* Mobile: Cards */}
          <div className="space-y-4 lg:hidden">
            {filteredRequests.map((request) => (
              <MaintenanceCard key={request._id} request={request} />
            ))}
          </div>

          {/* Desktop: Table */}
          <MaintenanceTable requests={filteredRequests} />
          
          {/* Footer Info */}
          <div className="mt-6 text-center text-xs sm:text-sm text-gray-500">
            Showing {filteredRequests.length} {filteredRequests.length === 1 ? 'request' : 'requests'}
            <span className="hidden sm:inline"> • Last updated: {new Date().toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Loading Overlay for Refresh */}
      {refreshing && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          Refreshing...
        </div>
      )}
    </>
  );
}