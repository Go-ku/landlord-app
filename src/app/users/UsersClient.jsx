// src/app/users/UsersClient.js
'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import { 
  Users, 
  Search, 
  Filter,
  Plus,
  Edit,
  Shield,
  User as UserIcon,
  Building,
  Crown,
  CheckCircle,
  XCircle,
  Eye,
  AlertCircle,
  Loader2,
  RefreshCw,
  SortAsc,
  SortDesc,
  Calendar,
  Mail,
  Phone,
  MoreVertical,
  X,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Download
} from 'lucide-react';

export default function UsersClient({ initialData, userRole, searchParams }) {
  const router = useRouter();
  
  // State
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialData?.error || '');
  const [success, setSuccess] = useState('');
  
  // Enhanced filters state - initialize from server data
  const [filters, setFilters] = useState({
    search: initialData?.filters?.search || '',
    role: initialData?.filters?.role || 'all',
    status: initialData?.filters?.status || 'all',
    sortBy: initialData?.filters?.sortBy || 'createdAt',
    sortOrder: initialData?.filters?.sortOrder || 'desc',
    page: initialData?.filters?.page || 1
  });

  // Advanced filters - initialize from URL params
  const [advancedFilters, setAdvancedFilters] = useState({
    dateFrom: searchParams?.dateFrom || '',
    dateTo: searchParams?.dateTo || '',
    lastLoginFrom: searchParams?.lastLoginFrom || '',
    lastLoginTo: searchParams?.lastLoginTo || '',
    company: searchParams?.company || '',
    hasPhone: searchParams?.hasPhone || 'all',
    adminLevel: searchParams?.adminLevel || 'all'
  });

  // UI State
  const [showFilters, setShowFilters] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);

  // Role configuration
  const roleConfig = {
    landlord: { label: 'Landlord', icon: Building, color: 'blue' },
    manager: { label: 'Manager', icon: Crown, color: 'purple' },
    admin: { label: 'Admin', icon: Shield, color: 'red' },
    tenant: { label: 'Tenant', icon: UserIcon, color: 'green' }
  };

  // Quick filters
  const quickFilters = [
    {
      label: 'Active Users',
      onClick: () => setFilters(prev => ({ ...prev, status: 'active' })),
      active: filters.status === 'active',
      color: 'green'
    },
    {
      label: 'Recent Users (30 days)',
      onClick: () => {
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        setAdvancedFilters(prev => ({
          ...prev,
          dateFrom: thirtyDaysAgo.toISOString().split('T')[0],
          dateTo: today.toISOString().split('T')[0]
        }));
      },
      active: advancedFilters.dateFrom && advancedFilters.dateTo,
      color: 'blue'
    },
    {
      label: 'Admins Only',
      onClick: () => setFilters(prev => ({ ...prev, role: 'admin' })),
      active: filters.role === 'admin',
      color: 'red'
    },
    {
      label: 'Has Phone',
      onClick: () => setAdvancedFilters(prev => ({ ...prev, hasPhone: 'yes' })),
      active: advancedFilters.hasPhone === 'yes',
      color: 'purple'
    }
  ];

  // Filter users based on search and advanced filters (client-side filtering for advanced features)
  const filteredUsers = useMemo(() => {
    if (!data?.users) return [];
    
    return data.users.filter(user => {
      // Advanced filters (client-side only for features not handled by server)
      let matchesAdvanced = true;

      // Company filter (client-side)
      if (advancedFilters.company) {
        const userCompany = (user.company || '').toLowerCase();
        matchesAdvanced = matchesAdvanced && userCompany.includes(advancedFilters.company.toLowerCase());
      }

      // Phone filter (client-side)
      if (advancedFilters.hasPhone === 'yes') {
        matchesAdvanced = matchesAdvanced && user.phone && user.phone.trim() !== '';
      } else if (advancedFilters.hasPhone === 'no') {
        matchesAdvanced = matchesAdvanced && (!user.phone || user.phone.trim() === '');
      }

      // Admin level filter (client-side)
      if (advancedFilters.adminLevel !== 'all' && user.role === 'admin') {
        matchesAdvanced = matchesAdvanced && user.adminLevel === advancedFilters.adminLevel;
      }

      // Date filters (client-side for more precise filtering)
      if (advancedFilters.dateFrom) {
        matchesAdvanced = matchesAdvanced && new Date(user.createdAt) >= new Date(advancedFilters.dateFrom);
      }
      if (advancedFilters.dateTo) {
        matchesAdvanced = matchesAdvanced && new Date(user.createdAt) <= new Date(advancedFilters.dateTo);
      }

      // Last login filters (client-side)
      if (advancedFilters.lastLoginFrom && user.lastLogin) {
        matchesAdvanced = matchesAdvanced && new Date(user.lastLogin) >= new Date(advancedFilters.lastLoginFrom);
      }
      if (advancedFilters.lastLoginTo && user.lastLogin) {
        matchesAdvanced = matchesAdvanced && new Date(user.lastLogin) <= new Date(advancedFilters.lastLoginTo);
      }

      return matchesAdvanced;
    });
  }, [data?.users, advancedFilters]);

  // Stats calculation - use server stats when available, fall back to calculated stats
  const stats = useMemo(() => {
    if (data?.stats) {
      return {
        total: data.users?.length || 0,
        active: data.stats.status?.active || 0,
        inactive: data.stats.status?.inactive || 0,
        byRole: {
          admin: data.stats.roles?.admin || 0,
          landlord: data.stats.roles?.landlord || 0,
          manager: data.stats.roles?.manager || 0,
          tenant: data.stats.roles?.tenant || 0
        }
      };
    }

    // Fallback to client-side calculation
    const users = data?.users || [];
    const total = users.length;
    const active = users.filter(user => user.isActive).length;
    const inactive = users.filter(user => !user.isActive).length;
    const byRole = {
      admin: users.filter(user => user.role === 'admin').length,
      landlord: users.filter(user => user.role === 'landlord').length,
      manager: users.filter(user => user.role === 'manager').length,
      tenant: users.filter(user => user.role === 'tenant').length
    };

    return { total, active, inactive, byRole };
  }, [data]);

  // Update URL with current filters
  const updateURL = useCallback((newFilters, newAdvancedFilters = advancedFilters) => {
    const params = new URLSearchParams();
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value && value !== 'all' && value !== '') {
        params.append(key, value.toString());
      }
    });
    
    Object.entries(newAdvancedFilters).forEach(([key, value]) => {
      if (value && value !== 'all' && value !== '') {
        params.append(key, value.toString());
      }
    });
    
    const newURL = `/users${params.toString() ? `?${params.toString()}` : ''}`;
    router.replace(newURL, { shallow: true });
  }, [router, advancedFilters]);

  // Fetch users data - modified to work with server-side filtering
  const fetchUsers = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setLoading(true);
      }
      
      const params = new URLSearchParams();
      
      // Core filters handled by server
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all' && value !== '') {
          params.append(key, value.toString());
        }
      });

      // Only send advanced filters that the server can handle
      // For now, we'll handle most advanced filters client-side
      // but you can extend server-side filtering later
      if (advancedFilters.dateFrom) params.append('dateFrom', advancedFilters.dateFrom);
      if (advancedFilters.dateTo) params.append('dateTo', advancedFilters.dateTo);

      // Use Next.js navigation to update the page
      const newURL = `/users${params.toString() ? `?${params.toString()}` : ''}`;
      router.push(newURL);
      
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [filters, advancedFilters, router]);

  // Handle filter changes - navigate to new URL
  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value, page: 1 };
    setFilters(newFilters);
    
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v && v !== 'all' && v !== '') {
        params.append(k, v.toString());
      }
    });
    
    const newURL = `/users${params.toString() ? `?${params.toString()}` : ''}`;
    router.push(newURL);
  };

  // Handle sort
  const handleSort = (field) => {
    const newOrder = filters.sortBy === field && filters.sortOrder === 'asc' ? 'desc' : 'asc';
    handleFilterChange('sortBy', field);
    handleFilterChange('sortOrder', newOrder);
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    const newFilters = { ...filters, page: newPage };
    setFilters(newFilters);
    
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v && v !== 'all' && v !== '') {
        params.append(k, v.toString());
      }
    });
    
    const newURL = `/users${params.toString() ? `?${params.toString()}` : ''}`;
    router.push(newURL);
  };

  // Clear filters
  const clearFilters = () => {
    const clearedFilters = {
      search: '',
      role: 'all',
      status: 'all',
      sortBy: 'createdAt',
      sortOrder: 'desc',
      page: 1
    };
    const clearedAdvancedFilters = {
      dateFrom: '',
      dateTo: '',
      lastLoginFrom: '',
      lastLoginTo: '',
      company: '',
      hasPhone: 'all',
      adminLevel: 'all'
    };
    setFilters(clearedFilters);
    setAdvancedFilters(clearedAdvancedFilters);
    router.push('/users');
  };

  // Toggle user active status
  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: !currentStatus
        })
      });

      const result = await response.json();
      if (result.success) {
        setSuccess(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
        
        // Update the user in the current data
        setData(prevData => ({
          ...prevData,
          users: prevData.users.map(user => 
            user._id === userId ? { ...user, isActive: !currentStatus } : user
          )
        }));
        
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Failed to update user status');
      }
    } catch (err) {
      console.error('Error updating user status:', err);
      setError('Failed to update user status');
    } finally {
      setLoading(false);
    }
  };

  // Handle export
  const handleExport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') params.set(key, value);
      });
      Object.entries(advancedFilters).forEach(([key, value]) => {
        if (value && value !== 'all') params.set(key, value);
      });
      params.set('export', 'true');

      const response = await fetch(`/api/users/export?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to export users');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Remove the useEffect that fetches data on filter changes
  // The server component handles the initial data fetching

  // Clear error messages after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Role badge component
  const RoleBadge = ({ role, adminLevel }) => {
    const config = roleConfig[role] || roleConfig.tenant;
    const IconComponent = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${config.color}-100 text-${config.color}-800`}>
        <IconComponent className="w-3 h-3 mr-1" />
        {config.label}
        {role === 'admin' && adminLevel && (
          <span className="ml-1 opacity-75">({adminLevel})</span>
        )}
      </span>
    );
  };

  // Get user display name
  const getUserDisplayName = (user) => {
    if (user.name) return user.name;
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    return 'Unknown User';
  };

  // Stats component
  function UsersStats() {
    const statsData = [
      {
        label: 'Total Users',
        value: stats.total,
        icon: Users,
        color: 'blue'
      },
      {
        label: 'Active',
        value: `${stats.active} (${stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%)`,
        icon: CheckCircle,
        color: 'green'
      },
      {
        label: 'Inactive',
        value: `${stats.inactive} (${stats.total > 0 ? Math.round((stats.inactive / stats.total) * 100) : 0}%)`,
        icon: XCircle,
        color: 'red'
      },
      {
        label: 'Admins',
        value: stats.byRole.admin,
        icon: Shield,
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

  // Enhanced Search Component
  function EnhancedSearchBar() {
    return (
      <div className="space-y-4">
        {/* Main Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search users by name, email, company, or phone..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="block w-full pl-9 sm:pl-10 pr-12 sm:pr-16 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
          {(filters.search || filters.role !== 'all' || filters.status !== 'all' || Object.values(advancedFilters).some(v => v && v !== 'all')) && (
            <button
              onClick={clearFilters}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2">
          {quickFilters.map((filter, index) => (
            <button
              key={index}
              onClick={filter.onClick}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter.active
                  ? `bg-${filter.color}-100 text-${filter.color}-800 border border-${filter.color}-200`
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Filter Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <select
              value={filters.role}
              onChange={(e) => handleFilterChange('role', e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admins</option>
              <option value="landlord">Landlords</option>
              <option value="manager">Managers</option>
              <option value="tenant">Tenants</option>
            </select>

            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <button
              onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
              className="inline-flex items-center px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <SlidersHorizontal className="w-4 h-4 mr-1" />
              Advanced
              {showAdvancedSearch ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
            </button>

            <button 
              onClick={handleExport}
              disabled={loading}
              className="hidden sm:inline-flex items-center px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              <Download className="w-4 h-4 mr-1" />
              Export
            </button>
          </div>

          <div className="text-sm text-gray-500">
            {filteredUsers.length} of {data?.users?.length || 0} users
          </div>
        </div>

        {/* Advanced Search Panel */}
        {showAdvancedSearch && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Advanced Filters</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Created Date Range */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Created Date Range</label>
                <div className="space-y-2">
                  <input
                    type="date"
                    value={advancedFilters.dateFrom}
                    onChange={(e) => setAdvancedFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                    className="block w-full text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    placeholder="From"
                  />
                  <input
                    type="date"
                    value={advancedFilters.dateTo}
                    onChange={(e) => setAdvancedFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                    className="block w-full text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    placeholder="To"
                  />
                </div>
              </div>

              {/* Last Login Range */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Last Login Range</label>
                <div className="space-y-2">
                  <input
                    type="date"
                    value={advancedFilters.lastLoginFrom}
                    onChange={(e) => setAdvancedFilters(prev => ({ ...prev, lastLoginFrom: e.target.value }))}
                    className="block w-full text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    placeholder="From"
                  />
                  <input
                    type="date"
                    value={advancedFilters.lastLoginTo}
                    onChange={(e) => setAdvancedFilters(prev => ({ ...prev, lastLoginTo: e.target.value }))}
                    className="block w-full text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    placeholder="To"
                  />
                </div>
              </div>

              {/* Company Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Company</label>
                <input
                  type="text"
                  placeholder="Filter by company"
                  value={advancedFilters.company}
                  onChange={(e) => setAdvancedFilters(prev => ({ ...prev, company: e.target.value }))}
                  className="block w-full text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              {/* Has Phone Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number</label>
                <select
                  value={advancedFilters.hasPhone}
                  onChange={(e) => setAdvancedFilters(prev => ({ ...prev, hasPhone: e.target.value }))}
                  className="block w-full text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="all">All Users</option>
                  <option value="yes">Has Phone</option>
                  <option value="no">No Phone</option>
                </select>
              </div>

              {/* Admin Level Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Admin Level</label>
                <select
                  value={advancedFilters.adminLevel}
                  onChange={(e) => setAdvancedFilters(prev => ({ ...prev, adminLevel: e.target.value }))}
                  className="block w-full text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="all">All Levels</option>
                  <option value="super">Super Admin</option>
                  <option value="standard">Standard Admin</option>
                  <option value="limited">Limited Admin</option>
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Sort By</label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="block w-full text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="createdAt">Date Created</option>
                  <option value="name">Name</option>
                  <option value="email">Email</option>
                  <option value="role">Role</option>
                  <option value="lastLogin">Last Login</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={clearFilters}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
              >
                Clear All
              </button>
              <button
                onClick={() => setShowAdvancedSearch(false)}
                className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}

        {/* Active Filters Display */}
        {(filters.search || filters.role !== 'all' || filters.status !== 'all' || Object.values(advancedFilters).some(v => v && v !== 'all')) && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500">Active filters:</span>
            {filters.search && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                Search: "{filters.search}"
                <button
                  onClick={() => handleFilterChange('search', '')}
                  className="ml-1 inline-flex items-center p-0.5 rounded-full hover:bg-blue-200"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.role !== 'all' && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                Role: {filters.role}
                <button
                  onClick={() => handleFilterChange('role', 'all')}
                  className="ml-1 inline-flex items-center p-0.5 rounded-full hover:bg-green-200"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.status !== 'all' && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                Status: {filters.status}
                <button
                  onClick={() => handleFilterChange('status', 'all')}
                  className="ml-1 inline-flex items-center p-0.5 rounded-full hover:bg-yellow-200"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {Object.entries(advancedFilters).map(([key, value]) => {
              if (!value || value === 'all') return null;
              return (
                <span key={key} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                  {key}: {value}
                  <button
                    onClick={() => setAdvancedFilters(prev => ({ ...prev, [key]: key.includes('hasPhone') || key.includes('adminLevel') ? 'all' : '' }))}
                    className="ml-1 inline-flex items-center p-0.5 rounded-full hover:bg-purple-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // User card component for mobile
  function UserCard({ user }) {
    const displayName = getUserDisplayName(user);

    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4 hover:shadow-md transition-shadow">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center flex-1 min-w-0">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-gray-600" />
              </div>
            </div>
            <div className="ml-3 min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-gray-900 truncate">
                {displayName}
              </h3>
              <p className="text-xs text-gray-500 truncate">
                {user.email}
              </p>
            </div>
          </div>
          <div className="ml-2">
            <RoleBadge role={user.role} adminLevel={user.adminLevel} />
          </div>
        </div>

        {/* Contact Info */}
        <div className="mb-3 space-y-1">
          <div className="flex items-center text-xs text-gray-600">
            <Mail className="w-3 h-3 mr-2 text-gray-400 flex-shrink-0" />
            <span className="truncate">{user.email}</span>
          </div>
          {user.phone && (
            <div className="flex items-center text-xs text-gray-600">
              <Phone className="w-3 h-3 mr-2 text-gray-400 flex-shrink-0" />
              <span className="truncate">{user.phone}</span>
            </div>
          )}
          {user.company && (
            <div className="flex items-center text-xs text-gray-600">
              <Building className="w-3 h-3 mr-2 text-gray-400 flex-shrink-0" />
              <span className="truncate">{user.company}</span>
            </div>
          )}
        </div>

        {/* Dates */}
        <div className="mb-3 space-y-1">
          <div className="flex items-center text-xs text-gray-500">
            <Calendar className="w-3 h-3 mr-2 text-gray-400" />
            <span>Created: {new Date(user.createdAt).toLocaleDateString()}</span>
          </div>
          {user.lastLogin && (
            <div className="flex items-center text-xs text-gray-500">
              <Clock className="w-3 h-3 mr-2 text-gray-400" />
              <span>Last login: {new Date(user.lastLogin).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Status and Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <button
            onClick={() => toggleUserStatus(user._id, user.isActive)}
            disabled={loading}
            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-50 ${
              user.isActive
                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                : 'bg-red-100 text-red-800 hover:bg-red-200'
            }`}
          >
            {user.isActive ? (
              <>
                <CheckCircle className="w-3 h-3 mr-1" />
                Active
              </>
            ) : (
              <>
                <XCircle className="w-3 h-3 mr-1" />
                Inactive
              </>
            )}
          </button>

          <div className="flex items-center space-x-2">
            <Link
              href={`/users/${user._id}`}
              className="inline-flex items-center px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
            >
              <Eye className="w-3 h-3 mr-1" />
              View
            </Link>
            <Link
              href={`/users/${user._id}/edit`}
              className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
            >
              <Edit className="w-3 h-3 mr-1" />
              Edit
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Empty state component
  function EmptyState() {
    const hasFilters = filters.search || filters.role !== 'all' || filters.status !== 'all' || Object.values(advancedFilters).some(v => v && v !== 'all');
    
    if (hasFilters) {
      return (
        <div className="bg-white rounded-lg shadow">
          <div className="text-center py-12 px-4">
            <div className="mx-auto w-16 h-16 sm:w-24 sm:h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-500 mb-6 text-sm sm:text-base max-w-sm mx-auto">
              No users match your current search criteria. Try adjusting your filters.
            </p>
            <button 
              onClick={clearFilters}
              className="inline-flex items-center px-4 py-2 sm:px-6 sm:py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors font-medium text-sm sm:text-base"
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">No users yet</h3>
          <p className="text-gray-500 mb-6 text-sm sm:text-base max-w-sm mx-auto">
            Get started by creating your first user account.
          </p>
          <Link 
            href="/users/create" 
            className="inline-flex items-center px-4 py-2 sm:px-6 sm:py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors font-medium text-sm sm:text-base"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Create Your First User
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 py-6 sm:container sm:mx-auto sm:p-4">
        {/* Breadcrumbs */}
        <div className="mb-6">
          <Breadcrumbs />
        </div>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 text-purple-600 flex-shrink-0" />
                <span className="truncate">Users</span>
              </h1>
              <p className="text-gray-600 text-sm sm:text-base mt-1 hidden sm:block">
                Manage user accounts and permissions
              </p>
            </div>
            <div className="ml-4 flex items-center space-x-2">
              <button
                onClick={() => fetchUsers(true)}
                disabled={loading}
                className="inline-flex items-center px-3 py-2 sm:px-4 sm:py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400 transition-colors text-sm whitespace-nowrap"
              >
                <RefreshCw className={`w-4 h-4 mr-1 sm:mr-2 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <Link
                href="/users/create"
                className="inline-flex items-center px-3 py-2 sm:px-4 sm:py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors font-medium text-sm whitespace-nowrap"
              >
                <Plus className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Add User</span>
                <span className="sm:hidden">Add</span>
              </Link>
            </div>
          </div>
          
          {/* Mobile description */}
          <p className="text-gray-600 text-sm sm:hidden">
            Manage user accounts and permissions
          </p>
        </div>

        {/* Messages */}
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
                onClick={() => setError('')}
                className="text-red-600 hover:text-red-800"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-green-800">Success</h3>
                  <p className="text-sm text-green-700 mt-1">{success}</p>
                </div>
              </div>
              <button
                onClick={() => setSuccess('')}
                className="text-green-600 hover:text-green-800"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Enhanced Search and Filter Section */}
        <div className="mb-6">
          <EnhancedSearchBar />
        </div>

        {/* Stats */}
        {data?.users?.length > 0 && <UsersStats />}

        {/* Content */}
        {filteredUsers.length === 0 ? (
          <EmptyState />
        ) : (
          <div>
            {/* Mobile: Cards */}
            <div className="space-y-4 lg:hidden">
              {filteredUsers.map((user) => (
                <UserCard key={user._id} user={user} />
              ))}
            </div>

            {/* Desktop: Table */}
            <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
              {loading && (
                <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                </div>
              )}
              
              <div className="overflow-x-auto relative">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center">
                          User Details
                          {filters.sortBy === 'name' && (
                            filters.sortOrder === 'asc' ? <SortAsc className="w-3 h-3 ml-1" /> : <SortDesc className="w-3 h-3 ml-1" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('role')}
                      >
                        <div className="flex items-center">
                          Role
                          {filters.sortBy === 'role' && (
                            filters.sortOrder === 'asc' ? <SortAsc className="w-3 h-3 ml-1" /> : <SortDesc className="w-3 h-3 ml-1" />
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('createdAt')}
                      >
                        <div className="flex items-center">
                          Created
                          {filters.sortBy === 'createdAt' && (
                            filters.sortOrder === 'asc' ? <SortAsc className="w-3 h-3 ml-1" /> : <SortDesc className="w-3 h-3 ml-1" />
                          )}
                        </div>
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
                    {filteredUsers.map((user) => (
                      <tr key={user._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                <UserIcon className="w-5 h-5 text-gray-600" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {getUserDisplayName(user)}
                              </div>
                              <div className="text-sm text-gray-500">
                                {user.email}
                              </div>
                              {user.company && (
                                <div className="text-xs text-gray-400">
                                  {user.company}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <RoleBadge role={user.role} adminLevel={user.adminLevel} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="space-y-1">
                            <div className="flex items-center">
                              <Mail className="w-3 h-3 mr-1" />
                              {user.email}
                            </div>
                            {user.phone && (
                              <div className="flex items-center">
                                <Phone className="w-3 h-3 mr-1" />
                                {user.phone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {new Date(user.createdAt).toLocaleDateString()}
                          </div>
                          {user.lastLogin && (
                            <div className="text-xs text-gray-400 mt-1">
                              Last: {new Date(user.lastLogin).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => toggleUserStatus(user._id, user.isActive)}
                            disabled={loading}
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-50 ${
                              user.isActive
                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                : 'bg-red-100 text-red-800 hover:bg-red-200'
                            }`}
                          >
                            {user.isActive ? (
                              <>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Active
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 mr-1" />
                                Inactive
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <Link
                              href={`/users/${user._id}`}
                              className="text-purple-600 hover:text-purple-900 p-1 rounded hover:bg-purple-50 transition-colors"
                              title="View details"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <Link
                              href={`/users/${user._id}/edit`}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                              title="Edit user"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer Info */}
            <div className="mt-6 text-center text-xs sm:text-sm text-gray-500">
              Showing {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
              <span className="hidden sm:inline"> • Last updated: {new Date().toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Pagination */}
        {data?.pagination && data.pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6 mt-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <p className="text-sm text-gray-700">
                  Showing {((data.pagination.currentPage - 1) * data.pagination.limit) + 1} to{' '}
                  {Math.min(data.pagination.currentPage * data.pagination.limit, data.pagination.totalCount)} of{' '}
                  {data.pagination.totalCount} results
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(data.pagination.currentPage - 1)}
                  disabled={data.pagination.currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                
                {Array.from({ length: Math.min(5, data.pagination.totalPages) }, (_, i) => {
                  const page = i + Math.max(1, data.pagination.currentPage - 2);
                  if (page > data.pagination.totalPages) return null;
                  
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-1 rounded-md text-sm transition-colors ${
                        page === data.pagination.currentPage
                          ? 'bg-purple-600 text-white'
                          : 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => handlePageChange(data.pagination.currentPage + 1)}
                  disabled={data.pagination.currentPage === data.pagination.totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Loading Indicator */}
        {loading && (
          <div className="fixed bottom-4 right-4 bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Processing...
          </div>
        )}
      </div>
    </div>
  );
}