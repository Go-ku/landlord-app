// src/app/tenants/tenants-client.js - Client Component
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  Users, 
  Plus, 
  Search,
  Filter,
  X,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Phone,
  Mail,
  Home,
  DollarSign,
  UserCheck,
  UserX,
  MapPin,
  CreditCard,
  SlidersHorizontal
} from "lucide-react";

export default function TenantsClient({ initialTenants = [] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Utility functions
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    if (!amount || isNaN(amount)) return 'ZMW 0';
    return `ZMW ${amount.toLocaleString()}`;
  };

  const getTenantStatus = (tenant) => {
    if (tenant.activeLease) {
      const balanceDue = tenant.activeLease.balanceDue || 0;
      if (balanceDue > 0) {
        return {
          label: 'Overdue',
          value: 'overdue',
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: <AlertCircle className="w-3 h-3" />
        };
      }
      return {
        label: 'Active',
        value: 'active',
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: <CheckCircle className="w-3 h-3" />
      };
    }
    return {
      label: 'Inactive',
      value: 'inactive',
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: <XCircle className="w-3 h-3" />
    };
  };

  // Filter and search logic
  const filteredTenants = useMemo(() => {
    return initialTenants.filter(tenant => {
      const tenantName = (tenant.name || 
        `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim() || 
        'Unknown Tenant').toLowerCase();
      
      const email = (tenant.email || '').toLowerCase();
      const phone = (tenant.phone || '').toLowerCase();
      const propertyAddress = (tenant.activeLease?.property?.address || '').toLowerCase();
      const company = (tenant.company || '').toLowerCase();
      
      const searchLower = searchQuery.toLowerCase();
      
      // Search across multiple fields
      const matchesSearch = searchQuery === '' || 
        tenantName.includes(searchLower) ||
        email.includes(searchLower) ||
        phone.includes(searchLower) ||
        propertyAddress.includes(searchLower) ||
        company.includes(searchLower) ||
        tenant._id.toLowerCase().includes(searchLower);

      // Status filter
      if (statusFilter === 'all') {
        return matchesSearch;
      }
      
      const tenantStatus = getTenantStatus(tenant);
      return matchesSearch && tenantStatus.value === statusFilter;
    });
  }, [initialTenants, searchQuery, statusFilter]);

  // Stats calculation
  const stats = useMemo(() => {
    const totalTenants = initialTenants.length;
    const activeTenants = initialTenants.filter(t => t.activeLease).length;
    const inactiveTenants = totalTenants - activeTenants;
    const overdueTenants = initialTenants.filter(t => {
      const status = getTenantStatus(t);
      return status.value === 'overdue';
    }).length;
    const totalMonthlyRent = initialTenants.reduce((sum, tenant) => {
      return sum + (tenant.activeLease?.monthlyRent || 0);
    }, 0);

    return {
      total: totalTenants,
      active: activeTenants,
      inactive: inactiveTenants,
      overdue: overdueTenants,
      monthlyRevenue: totalMonthlyRent
    };
  }, [initialTenants]);

  // Clear search and filters
  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
  };

  // Stats component
  function TenantsStats() {
    const statsData = [
      {
        label: 'Total Tenants',
        value: stats.total,
        icon: Users,
        color: 'blue'
      },
      {
        label: 'Active',
        value: stats.active,
        icon: UserCheck,
        color: 'green'
      },
      {
        label: 'Overdue',
        value: stats.overdue,
        icon: AlertCircle,
        color: 'red'
      },
      {
        label: 'Monthly Revenue',
        value: formatCurrency(stats.monthlyRevenue),
        icon: DollarSign,
        color: 'green'
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

  // Empty state
  function EmptyState() {
    const hasFilters = searchQuery || statusFilter !== 'all';
    
    if (hasFilters) {
      return (
        <div className="bg-white rounded-lg shadow">
          <div className="text-center py-12 px-4">
            <div className="mx-auto w-16 h-16 sm:w-24 sm:h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tenants found</h3>
            <p className="text-gray-500 mb-6 text-sm sm:text-base max-w-sm mx-auto">
              No tenants match your current search criteria. Try adjusting your filters.
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
            <Users className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tenants yet</h3>
          <p className="text-gray-500 mb-6 text-sm sm:text-base max-w-sm mx-auto">
            Start by adding tenants to your system to manage leases and track payments.
          </p>
          <Link 
            href="/tenants/add" 
            className="inline-flex items-center px-4 py-2 sm:px-6 sm:py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm sm:text-base"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Add Your First Tenant
          </Link>
        </div>
      </div>
    );
  }

  // Tenant card component
  function TenantCard({ tenant }) {
    const tenantStatus = getTenantStatus(tenant);
    const tenantName = tenant.name || 
      `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim() || 
      'Unknown Tenant';

    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4 hover:shadow-md transition-shadow">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 truncate">{tenantName}</h3>
            <p className="text-xs text-gray-500">ID: {tenant._id.slice(-8)}</p>
          </div>
          <div className="flex items-center ml-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${tenantStatus.color}`}>
              {tenantStatus.icon}
              <span className="ml-1">{tenantStatus.label}</span>
            </span>
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-1 mb-3">
          {tenant.email && (
            <div className="flex items-center text-sm text-gray-600">
              <Mail className="w-3 h-3 mr-2 text-gray-400 flex-shrink-0" />
              <a
                href={`mailto:${tenant.email}`}
                className="text-blue-600 hover:text-blue-800 truncate"
              >
                {tenant.email}
              </a>
            </div>
          )}
          {tenant.phone && (
            <div className="flex items-center text-sm text-gray-600">
              <Phone className="w-3 h-3 mr-2 text-gray-400 flex-shrink-0" />
              <a
                href={`tel:${tenant.phone}`}
                className="text-blue-600 hover:text-blue-800"
              >
                {tenant.phone}
              </a>
            </div>
          )}
        </div>

        {/* Property Info */}
        {tenant.activeLease ? (
          <div className="bg-gray-50 rounded-lg p-3 mb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center text-sm font-medium text-gray-900 mb-1">
                  <MapPin className="w-3 h-3 mr-1 text-gray-400 flex-shrink-0" />
                  <span className="truncate">{tenant.activeLease.property?.address || 'Unknown Property'}</span>
                </div>
                <div className="text-xs text-gray-600">
                  {formatCurrency(tenant.activeLease.monthlyRent)}/month
                </div>
                <div className="text-xs text-gray-500">
                  Ends: {formatDate(tenant.activeLease.endDate)}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-3 mb-3 text-center">
            <p className="text-sm text-gray-500">No active lease</p>
          </div>
        )}

        {/* Payment Summary */}
        <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
          <div className="flex items-center">
            <CreditCard className="w-3 h-3 mr-1" />
            <span>Paid: {formatCurrency(tenant.totalPaid || 0)}</span>
          </div>
          {tenant.activeLease && (
            <span>Balance: {formatCurrency(tenant.activeLease.balanceDue || 0)}</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            Joined {formatDate(tenant.createdAt)}
          </div>
          <div className="flex items-center space-x-2">
            <Link
              href={`/tenants/${tenant._id}`}
              className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
            >
              <Eye className="w-3 h-3 mr-1" />
              View
            </Link>
            <Link
              href={`/tenants/${tenant._id}/edit`}
              className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              <Edit className="w-3 h-3 mr-1" />
              Edit
            </Link>
            {tenant.activeLease && (
              <Link
                href={`/leases/${tenant.activeLease._id}`}
                className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
              >
                <Home className="w-3 h-3 mr-1" />
                Lease
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Desktop table component
  function TenantsTable({ tenants }) {
    return (
      <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tenant Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact Information
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Property
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Status
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
              {tenants.map((tenant) => {
                const tenantStatus = getTenantStatus(tenant);
                const tenantName = tenant.name || 
                  `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim() || 
                  'Unknown Tenant';
                
                return (
                  <tr key={tenant._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {tenantName}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {tenant._id.slice(-8)}
                        </div>
                        <div className="text-sm text-gray-500">
                          Joined: {formatDate(tenant.createdAt)}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        {tenant.email && (
                          <div className="text-sm text-gray-900 flex items-center mb-1">
                            <Mail className="w-4 h-4 mr-2 text-gray-400" />
                            <a
                              href={`mailto:${tenant.email}`}
                              className="text-blue-600 hover:text-blue-800 truncate max-w-xs"
                            >
                              {tenant.email}
                            </a>
                          </div>
                        )}
                        {tenant.phone && (
                          <div className="text-sm text-gray-900 flex items-center">
                            <Phone className="w-4 h-4 mr-2 text-gray-400" />
                            <a
                              href={`tel:${tenant.phone}`}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              {tenant.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        {tenant.activeLease ? (
                          <>
                            <div className="text-sm font-medium text-gray-900">
                              {tenant.activeLease.property?.address || 'Unknown Property'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatCurrency(tenant.activeLease.monthlyRent)}/month
                            </div>
                            <div className="text-sm text-gray-500">
                              Lease ends: {formatDate(tenant.activeLease.endDate)}
                            </div>
                          </>
                        ) : (
                          <div className="text-sm text-gray-500">
                            No active lease
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          Total Paid: {formatCurrency(tenant.totalPaid || 0)}
                        </div>
                        {tenant.activeLease && (
                          <div className="text-sm text-gray-500">
                            Balance: {formatCurrency(tenant.activeLease.balanceDue || 0)}
                          </div>
                        )}
                        <div className="text-sm text-gray-500">
                          {tenant.totalPayments} payment{tenant.totalPayments !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${tenantStatus.color.replace('border-red-200', '').replace('border-green-200', '').replace('border-gray-200', '')}`}>
                        {tenantStatus.icon}
                        <span className="ml-1">{tenantStatus.label}</span>
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/tenants/${tenant._id}`}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                          title="View tenant"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/tenants/${tenant._id}/edit`}
                          className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-50 transition-colors"
                          title="Edit tenant"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        {tenant.activeLease && (
                          <Link
                            href={`/leases/${tenant.activeLease._id}`}
                            className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50 transition-colors"
                            title="View lease"
                          >
                            <Home className="w-4 h-4" />
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
              <Users className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 text-blue-600 flex-shrink-0" />
              <span className="truncate">Tenants</span>
            </h1>
            <p className="text-gray-600 text-sm sm:text-base mt-1 hidden sm:block">
              Manage your tenants and track their lease information
            </p>
          </div>
          <div className="ml-4">
            <Link 
              href="/tenants/add" 
              className="inline-flex items-center px-3 py-2 sm:px-4 sm:py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium text-sm whitespace-nowrap"
            >
              <Plus className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Add Tenant</span>
              <span className="sm:hidden">Add</span>
            </Link>
          </div>
        </div>
        
        {/* Mobile description */}
        <p className="text-gray-600 text-sm sm:hidden">
          Manage tenants and track lease information
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
            placeholder="Search tenants by name, email, phone, or property..."
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
          <div className="flex items-center space-x-3">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="overdue">Overdue</option>
              <option value="inactive">Inactive</option>
            </select>

            {/* Mobile filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="sm:hidden inline-flex items-center px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <SlidersHorizontal className="w-4 h-4 mr-1" />
              Filters
            </button>
          </div>

          {/* Results count */}
          <div className="text-sm text-gray-500">
            {filteredTenants.length} of {initialTenants.length} tenants
          </div>
        </div>

        {/* Active filters display */}
        {(searchQuery || statusFilter !== 'all') && (
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
          </div>
        )}
      </div>

      {/* Stats */}
      {initialTenants.length > 0 && <TenantsStats />}
      
      {/* Content */}
      {filteredTenants.length === 0 ? (
        <EmptyState />
      ) : (
        <div>
          {/* Mobile: Cards */}
          <div className="space-y-4 lg:hidden">
            {filteredTenants.map((tenant) => (
              <TenantCard key={tenant._id} tenant={tenant} />
            ))}
          </div>

          {/* Desktop: Table */}
          <TenantsTable tenants={filteredTenants} />
          
          {/* Footer Info */}
          <div className="mt-6 text-center text-xs sm:text-sm text-gray-500">
            Showing {filteredTenants.length} {filteredTenants.length === 1 ? 'tenant' : 'tenants'}
            <span className="hidden sm:inline"> • Last updated: {new Date().toLocaleString()}</span>
          </div>
        </div>
      )}
    </>
  );
}