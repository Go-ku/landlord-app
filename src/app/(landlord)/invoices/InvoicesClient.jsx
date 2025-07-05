"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import { formatDate } from "utils/date";
import { formatCurrency } from "utils/currency";
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Send,
  Eye,
  Edit,
  MoreHorizontal,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Users,
  TrendingUp,
  Loader2,
  Mail,
  CreditCard,
  RefreshCw,
  Trash2,
  X,
  SlidersHorizontal,
  MapPin,
  Building,
  ChevronDown,
  ChevronUp
} from "lucide-react";

export default function InvoicesClient({ initialData }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [invoices, setInvoices] = useState(initialData?.invoices || []);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Enhanced search and filter states
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || "all");
  const [showFilters, setShowFilters] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

  // Advanced filters
  const [advancedFilters, setAdvancedFilters] = useState({
    dateFrom: searchParams.get('dateFrom') || "",
    dateTo: searchParams.get('dateTo') || "",
    dueDateFrom: searchParams.get('dueDateFrom') || "",
    dueDateTo: searchParams.get('dueDateTo') || "",
    tenant: searchParams.get('tenant') || "",
    property: searchParams.get('property') || "",
    amountMin: searchParams.get('amountMin') || "",
    amountMax: searchParams.get('amountMax') || "",
    overdueDays: searchParams.get('overdueDays') || "",
  });

  // Search suggestions and filters
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  // Generate search suggestions based on current data
  const generateSuggestions = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];

    const query = searchQuery.toLowerCase();
    const suggestions = new Set();

    invoices.forEach(invoice => {
      // Invoice number
      if (invoice.invoiceNumber?.toLowerCase().includes(query)) {
        suggestions.add({
          type: 'invoice',
          value: invoice.invoiceNumber,
          label: `Invoice: ${invoice.invoiceNumber}`,
          icon: FileText
        });
      }

      // Tenant name
      const tenantName = getTenantName(invoice.tenantId);
      if (tenantName.toLowerCase().includes(query)) {
        suggestions.add({
          type: 'tenant',
          value: tenantName,
          label: `Tenant: ${tenantName}`,
          icon: Users
        });
      }

      // Tenant email
      if (invoice.tenantId?.email?.toLowerCase().includes(query)) {
        suggestions.add({
          type: 'email',
          value: invoice.tenantId.email,
          label: `Email: ${invoice.tenantId.email}`,
          icon: Mail
        });
      }

      // Property address
      if (invoice.propertyId?.address?.toLowerCase().includes(query)) {
        suggestions.add({
          type: 'property',
          value: invoice.propertyId.address,
          label: `Property: ${invoice.propertyId.address}`,
          icon: Building
        });
      }

      // Property name
      if (invoice.propertyId?.name?.toLowerCase().includes(query)) {
        suggestions.add({
          type: 'property',
          value: invoice.propertyId.name,
          label: `Property: ${invoice.propertyId.name}`,
          icon: MapPin
        });
      }

      // Amount
      if (invoice.total?.toString().includes(query)) {
        suggestions.add({
          type: 'amount',
          value: invoice.total.toString(),
          label: `Amount: ${formatCurrency(invoice.total)}`,
          icon: DollarSign
        });
      }
    });

    return Array.from(suggestions).slice(0, 8);
  }, [searchQuery, invoices]);

  // Update suggestions when they change
  useEffect(() => {
    setSearchSuggestions(generateSuggestions);
    setSelectedSuggestionIndex(-1);
  }, [generateSuggestions]);

  // Advanced search filters
  const quickFilters = [
    {
      label: 'Overdue',
      onClick: () => setStatusFilter('overdue'),
      active: statusFilter === 'overdue',
      color: 'red'
    },
    {
      label: 'Due This Week',
      onClick: () => {
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);
        setAdvancedFilters(prev => ({
          ...prev,
          dueDateFrom: today.toISOString().split('T')[0],
          dueDateTo: nextWeek.toISOString().split('T')[0]
        }));
      },
      active: advancedFilters.dueDateFrom && advancedFilters.dueDateTo,
      color: 'yellow'
    },
    {
      label: 'High Value (>$1000)',
      onClick: () => setAdvancedFilters(prev => ({ ...prev, amountMin: '1000' })),
      active: advancedFilters.amountMin === '1000',
      color: 'green'
    },
    {
      label: 'Recent (Last 30 days)',
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
    }
  ];

  const getStatusConfig = (status) => {
    switch (status) {
      case "draft":
        return {
          icon: <FileText className="w-3 h-3 sm:w-4 sm:h-4" />,
          color: "bg-gray-100 text-gray-800 border-gray-200",
          label: "Draft",
          value: "draft"
        };
      case "sent":
        return {
          icon: <Clock className="w-3 h-3 sm:w-4 sm:h-4" />,
          color: "bg-blue-100 text-blue-800 border-blue-200",
          label: "Sent",
          value: "sent"
        };
      case "paid":
        return {
          icon: <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />,
          color: "bg-green-100 text-green-800 border-green-200",
          label: "Paid",
          value: "paid"
        };
      case "overdue":
        return {
          icon: <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />,
          color: "bg-red-100 text-red-800 border-red-200",
          label: "Overdue",
          value: "overdue"
        };
      case "cancelled":
        return {
          icon: <XCircle className="w-3 h-3 sm:w-4 sm:h-4" />,
          color: "bg-gray-100 text-gray-800 border-gray-200",
          label: "Cancelled",
          value: "cancelled"
        };
      default:
        return {
          icon: <FileText className="w-3 h-3 sm:w-4 sm:h-4" />,
          color: "bg-gray-100 text-gray-800 border-gray-200",
          label: status || "Unknown",
          value: status || "unknown"
        };
    }
  };

  const getTenantName = (tenant) => {
    if (tenant?.name) return tenant.name;
    if (tenant?.firstName || tenant?.lastName) {
      return `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim();
    }
    return 'Unknown Tenant';
  };

  const isOverdue = (invoice) => {
    return invoice.status === 'overdue' || 
      (invoice.status === 'sent' && new Date(invoice.dueDate) < new Date());
  };

  const getDaysOverdue = (dueDate) => {
    return Math.ceil((new Date() - new Date(dueDate)) / (1000 * 60 * 60 * 24));
  };

  // Enhanced filter and search logic
  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
      const invoiceNumber = (invoice.invoiceNumber || '').toLowerCase();
      const tenantName = getTenantName(invoice.tenantId).toLowerCase();
      const tenantEmail = (invoice.tenantId?.email || '').toLowerCase();
      const propertyAddress = (invoice.propertyId?.address || '').toLowerCase();
      const propertyName = (invoice.propertyId?.name || '').toLowerCase();
      
      const searchLower = searchQuery.toLowerCase();
      
      // Search across multiple fields
      const matchesSearch = searchQuery === '' || 
        invoiceNumber.includes(searchLower) ||
        tenantName.includes(searchLower) ||
        tenantEmail.includes(searchLower) ||
        propertyAddress.includes(searchLower) ||
        propertyName.includes(searchLower) ||
        invoice._id.toLowerCase().includes(searchLower);

      // Status filter
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        matchesStatus = invoice.status === statusFilter;
      }

      // Advanced filters
      let matchesAdvanced = true;

      // Date filters
      if (advancedFilters.dateFrom) {
        matchesAdvanced = matchesAdvanced && new Date(invoice.issueDate) >= new Date(advancedFilters.dateFrom);
      }
      if (advancedFilters.dateTo) {
        matchesAdvanced = matchesAdvanced && new Date(invoice.issueDate) <= new Date(advancedFilters.dateTo);
      }

      // Due date filters
      if (advancedFilters.dueDateFrom) {
        matchesAdvanced = matchesAdvanced && new Date(invoice.dueDate) >= new Date(advancedFilters.dueDateFrom);
      }
      if (advancedFilters.dueDateTo) {
        matchesAdvanced = matchesAdvanced && new Date(invoice.dueDate) <= new Date(advancedFilters.dueDateTo);
      }

      // Tenant filter
      if (advancedFilters.tenant) {
        matchesAdvanced = matchesAdvanced && tenantName.includes(advancedFilters.tenant.toLowerCase());
      }

      // Property filter
      if (advancedFilters.property) {
        const propertyMatch = propertyAddress.includes(advancedFilters.property.toLowerCase()) ||
          propertyName.includes(advancedFilters.property.toLowerCase());
        matchesAdvanced = matchesAdvanced && propertyMatch;
      }

      // Amount filters
      if (advancedFilters.amountMin) {
        matchesAdvanced = matchesAdvanced && (invoice.total || 0) >= parseFloat(advancedFilters.amountMin);
      }
      if (advancedFilters.amountMax) {
        matchesAdvanced = matchesAdvanced && (invoice.total || 0) <= parseFloat(advancedFilters.amountMax);
      }

      // Overdue days filter
      if (advancedFilters.overdueDays && isOverdue(invoice)) {
        const daysOverdue = getDaysOverdue(invoice.dueDate);
        matchesAdvanced = matchesAdvanced && daysOverdue >= parseInt(advancedFilters.overdueDays);
      }

      return matchesSearch && matchesStatus && matchesAdvanced;
    });
  }, [invoices, searchQuery, statusFilter, advancedFilters]);

  // Stats calculation with useMemo
  const stats = useMemo(() => {
    const total = invoices.length;
    const draft = invoices.filter(inv => inv.status === 'draft').length;
    const sent = invoices.filter(inv => inv.status === 'sent').length;
    const paid = invoices.filter(inv => inv.status === 'paid').length;
    const overdue = invoices.filter(inv => inv.status === 'overdue' || isOverdue(inv)).length;
    const cancelled = invoices.filter(inv => inv.status === 'cancelled').length;
    const totalAmount = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const paidAmount = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (inv.total || 0), 0);
    const pendingAmount = invoices.filter(inv => ['sent', 'overdue'].includes(inv.status)).reduce((sum, inv) => sum + (inv.balanceDue || inv.total || 0), 0);

    return {
      total,
      draft,
      sent,
      paid,
      overdue,
      cancelled,
      totalAmount,
      paidAmount,
      pendingAmount
    };
  }, [invoices]);

  // Handle keyboard navigation for suggestions
  const handleKeyDown = (e) => {
    if (!showSuggestions || searchSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < searchSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : searchSuggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          const suggestion = searchSuggestions[selectedSuggestionIndex];
          setSearchQuery(suggestion.value);
          setShowSuggestions(false);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  // Clear search and filters
  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setAdvancedFilters({
      dateFrom: "",
      dateTo: "",
      dueDateFrom: "",
      dueDateTo: "",
      tenant: "",
      property: "",
      amountMin: "",
      amountMax: "",
      overdueDays: "",
    });
    setShowSuggestions(false);
  };

  const updateUrlParams = useCallback((params) => {
    const urlParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v && v !== 'all') urlParams.set(k, v);
    });
    
    const newUrl = `/invoices${urlParams.toString() ? `?${urlParams.toString()}` : ''}`;
    router.push(newUrl, { shallow: true });
  }, [router]);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      Object.entries(advancedFilters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });

      const response = await fetch(`/api/invoices?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch invoices');
      }

      const data = await response.json();
      setInvoices(Array.isArray(data.invoices) ? data.invoices : []);
      
      // Update URL
      updateUrlParams({
        search: searchQuery,
        status: statusFilter,
        ...advancedFilters
      });
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError(err.message);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, advancedFilters, updateUrlParams]);

  const handleInvoiceAction = async (invoiceId, action) => {
    if (!invoiceId) {
      setError('Invoice ID is required');
      return;
    }

    setActionLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/invoices/${invoiceId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to ${action} invoice`);
      }

      const result = await response.json();
      
      // Show success message
      if (action === 'send') {
        alert('Invoice sent successfully!');
      } else if (action === 'mark-paid') {
        alert('Invoice marked as paid!');
      }

      // Refresh invoices list
      await fetchInvoices();
    } catch (err) {
      console.error(`Error ${action} invoice:`, err);
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      Object.entries(advancedFilters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      params.set('export', 'true');

      const response = await fetch(`/api/invoices/export?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to export invoices');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `invoices_${new Date().toISOString().split('T')[0]}.csv`;
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

  // Mobile-first Stats component
  function InvoicesStats() {
    const statsData = [
      {
        label: 'Total',
        value: stats.total,
        icon: FileText,
        color: 'blue'
      },
      {
        label: 'Paid',
        value: `${stats.paid} (${formatCurrency(stats.paidAmount)})`,
        icon: CheckCircle,
        color: 'green'
      },
      {
        label: 'Overdue',
        value: `${stats.overdue} (${formatCurrency(stats.pendingAmount)})`,
        icon: AlertCircle,
        color: 'red'
      },
      {
        label: 'Total Value',
        value: formatCurrency(stats.totalAmount),
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

  // Enhanced Search Component
  function EnhancedSearchBar() {
    return (
      <div className="space-y-4">
        {/* Main Search Bar with Suggestions */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search invoices by number, tenant, email, property, or amount..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => {
              // Delay hiding suggestions to allow clicking
              setTimeout(() => setShowSuggestions(false), 200);
            }}
            onKeyDown={handleKeyDown}
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

          {/* Search Suggestions Dropdown */}
          {showSuggestions && searchSuggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {searchSuggestions.map((suggestion, index) => {
                const IconComponent = suggestion.icon;
                return (
                  <button
                    key={`${suggestion.type}-${suggestion.value}`}
                    onClick={() => {
                      setSearchQuery(suggestion.value);
                      setShowSuggestions(false);
                    }}
                    className={`w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center ${
                      index === selectedSuggestionIndex ? 'bg-blue-50 border-blue-500' : ''
                    }`}
                  >
                    <IconComponent className="w-4 h-4 mr-3 text-gray-400" />
                    <span className="text-sm text-gray-900">{suggestion.label}</span>
                  </button>
                );
              })}
            </div>
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

        {/* Status Filter and Advanced Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
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
            {filteredInvoices.length} of {invoices.length} invoices
          </div>
        </div>

        {/* Advanced Search Panel */}
        {showAdvancedSearch && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Advanced Filters</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Date Range */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Issue Date Range</label>
                <div className="space-y-2">
                  <input
                    type="date"
                    value={advancedFilters.dateFrom}
                    onChange={(e) => setAdvancedFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                    className="block w-full text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="From"
                  />
                  <input
                    type="date"
                    value={advancedFilters.dateTo}
                    onChange={(e) => setAdvancedFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                    className="block w-full text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="To"
                  />
                </div>
              </div>

              {/* Due Date Range */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Due Date Range</label>
                <div className="space-y-2">
                  <input
                    type="date"
                    value={advancedFilters.dueDateFrom}
                    onChange={(e) => setAdvancedFilters(prev => ({ ...prev, dueDateFrom: e.target.value }))}
                    className="block w-full text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="From"
                  />
                  <input
                    type="date"
                    value={advancedFilters.dueDateTo}
                    onChange={(e) => setAdvancedFilters(prev => ({ ...prev, dueDateTo: e.target.value }))}
                    className="block w-full text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="To"
                  />
                </div>
              </div>

              {/* Amount Range */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Amount Range</label>
                <div className="space-y-2">
                  <input
                    type="number"
                    placeholder="Min amount"
                    value={advancedFilters.amountMin}
                    onChange={(e) => setAdvancedFilters(prev => ({ ...prev, amountMin: e.target.value }))}
                    className="block w-full text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    placeholder="Max amount"
                    value={advancedFilters.amountMax}
                    onChange={(e) => setAdvancedFilters(prev => ({ ...prev, amountMax: e.target.value }))}
                    className="block w-full text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Tenant Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tenant</label>
                <input
                  type="text"
                  placeholder="Filter by tenant name"
                  value={advancedFilters.tenant}
                  onChange={(e) => setAdvancedFilters(prev => ({ ...prev, tenant: e.target.value }))}
                  className="block w-full text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Property Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Property</label>
                <input
                  type="text"
                  placeholder="Filter by property"
                  value={advancedFilters.property}
                  onChange={(e) => setAdvancedFilters(prev => ({ ...prev, property: e.target.value }))}
                  className="block w-full text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Overdue Days */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Min Overdue Days</label>
                <input
                  type="number"
                  placeholder="Days overdue"
                  value={advancedFilters.overdueDays}
                  onChange={(e) => setAdvancedFilters(prev => ({ ...prev, overdueDays: e.target.value }))}
                  className="block w-full text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
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
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}

        {/* Active Filters Display */}
        {(searchQuery || statusFilter !== 'all' || Object.values(advancedFilters).some(v => v)) && (
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
                Status: {statusFilter}
                <button
                  onClick={() => setStatusFilter('all')}
                  className="ml-1 inline-flex items-center p-0.5 rounded-full hover:bg-green-200"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {Object.entries(advancedFilters).map(([key, value]) => {
              if (!value) return null;
              return (
                <span key={key} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                  {key}: {value}
                  <button
                    onClick={() => setAdvancedFilters(prev => ({ ...prev, [key]: '' }))}
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

  // Mobile-first empty state
  function EmptyState() {
    const hasFilters = searchQuery || statusFilter !== 'all' || Object.values(advancedFilters).some(v => v);
    
    if (hasFilters) {
      return (
        <div className="bg-white rounded-lg shadow">
          <div className="text-center py-12 px-4">
            <div className="mx-auto w-16 h-16 sm:w-24 sm:h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
            <p className="text-gray-500 mb-6 text-sm sm:text-base max-w-sm mx-auto">
              No invoices match your current search criteria. Try adjusting your filters.
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
            <FileText className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices yet</h3>
          <p className="text-gray-500 mb-6 text-sm sm:text-base max-w-sm mx-auto">
            Get started by creating your first invoice for your tenants.
          </p>
          <Link 
            href="/invoices/create" 
            className="inline-flex items-center px-4 py-2 sm:px-6 sm:py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm sm:text-base"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Create Your First Invoice
          </Link>
        </div>
      </div>
    );
  }

  // Invoice card component for mobile
  function InvoiceCard({ invoice }) {
    const statusConfig = getStatusConfig(invoice.status);
    const tenantName = getTenantName(invoice.tenantId);
    const invoiceIsOverdue = isOverdue(invoice);

    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4 hover:shadow-md transition-shadow">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 truncate">
              {invoice.invoiceNumber}
            </h3>
            <p className="text-xs text-gray-500">
              Issued: {formatDate(invoice.issueDate)}
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
            <Users className="w-3 h-3 mr-2 text-gray-400 flex-shrink-0" />
            <span className="font-medium truncate">{tenantName}</span>
          </div>
          {invoice.tenantId?.email && (
            <div className="flex items-center text-sm text-gray-600">
              <Mail className="w-3 h-3 mr-2 text-gray-400 flex-shrink-0" />
              <span className="truncate">{invoice.tenantId.email}</span>
            </div>
          )}
        </div>

        {/* Property Info */}
        {invoice.propertyId && (
          <div className="bg-gray-50 rounded-lg p-3 mb-3">
            <div className="flex items-center text-sm font-medium text-gray-900 mb-1">
              <Building className="w-3 h-3 mr-1 text-gray-400 flex-shrink-0" />
              <span className="truncate">{invoice.propertyId.address || 'Unknown Property'}</span>
            </div>
            {invoice.propertyId.name && (
              <div className="text-xs text-gray-600">
                {invoice.propertyId.name}
              </div>
            )}
          </div>
        )}

        {/* Amount Info */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Total:</span>
            <span className="font-semibold text-gray-900">{formatCurrency(invoice.total || 0)}</span>
          </div>
          {invoice.amountPaid > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Paid:</span>
              <span className="text-green-600">{formatCurrency(invoice.amountPaid)}</span>
            </div>
          )}
          {invoice.balanceDue > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Due:</span>
              <span className={invoiceIsOverdue ? 'text-red-600 font-medium' : 'text-yellow-600'}>
                {formatCurrency(invoice.balanceDue)}
              </span>
            </div>
          )}
        </div>

        {/* Due Date */}
        <div className="mb-3">
          <div className="flex items-center text-sm">
            <Calendar className="w-3 h-3 mr-2 text-gray-400" />
            <span className={invoiceIsOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}>
              Due: {formatDate(invoice.dueDate)}
            </span>
          </div>
          {invoiceIsOverdue && (
            <div className="text-xs text-red-500 ml-5">
              {getDaysOverdue(invoice.dueDate)} days overdue
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            ID: {invoice._id.slice(-8)}
          </div>
          <div className="flex items-center space-x-2">
            <Link
              href={`/invoices/${invoice._id}`}
              className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
            >
              <Eye className="w-3 h-3 mr-1" />
              View
            </Link>
            
            {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
              <>
                <Link
                  href={`/invoices/${invoice._id}/edit`}
                  className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Edit
                </Link>
                
                {invoice.status === 'draft' && (
                  <button
                    onClick={() => handleInvoiceAction(invoice._id, 'send')}
                    disabled={actionLoading}
                    className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors disabled:opacity-50"
                  >
                    <Send className="w-3 h-3 mr-1" />
                    Send
                  </button>
                )}
                
                {['sent', 'overdue'].includes(invoice.status) && (
                  <button
                    onClick={() => handleInvoiceAction(invoice._id, 'mark-paid')}
                    disabled={actionLoading}
                    className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors disabled:opacity-50"
                  >
                    <CreditCard className="w-3 h-3 mr-1" />
                    Paid
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Desktop table component
  function InvoicesTable({ invoices }) {
    return (
      <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tenant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Property
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map((invoice) => {
                const statusConfig = getStatusConfig(invoice.status);
                const tenantName = getTenantName(invoice.tenantId);
                const invoiceIsOverdue = isOverdue(invoice);

                return (
                  <tr key={invoice._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {invoice.invoiceNumber}
                        </div>
                        <div className="text-sm text-gray-500">
                          Issued: {formatDate(invoice.issueDate)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <Users className="w-4 h-4 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {tenantName}
                          </div>
                          {invoice.tenantId?.email && (
                            <div className="text-sm text-gray-500">
                              {invoice.tenantId.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {invoice.propertyId?.address || 'Unknown Property'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {invoice.propertyId?.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(invoice.total || 0)}
                      </div>
                      {invoice.amountPaid > 0 && (
                        <div className="text-sm text-green-600">
                          Paid: {formatCurrency(invoice.amountPaid)}
                        </div>
                      )}
                      {invoice.balanceDue > 0 && (
                        <div className={`text-sm ${invoiceIsOverdue ? 'text-red-600' : 'text-yellow-600'}`}>
                          Due: {formatCurrency(invoice.balanceDue)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${invoiceIsOverdue ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                        {formatDate(invoice.dueDate)}
                      </div>
                      {invoiceIsOverdue && (
                        <div className="text-xs text-red-500">
                          {getDaysOverdue(invoice.dueDate)} days overdue
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color.replace('border-red-200', '').replace('border-green-200', '').replace('border-blue-200', '').replace('border-gray-200', '')}`}>
                        {statusConfig.icon}
                        <span className="ml-1">{statusConfig.label}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          href={`/invoices/${invoice._id}`}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="View Invoice"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        
                        {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                          <>
                            <Link
                              href={`/invoices/${invoice._id}/edit`}
                              className="text-gray-600 hover:text-gray-900 transition-colors"
                              title="Edit Invoice"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                            
                            {invoice.status === 'draft' && (
                              <button
                                onClick={() => handleInvoiceAction(invoice._id, 'send')}
                                disabled={actionLoading}
                                className="text-green-600 hover:text-green-900 disabled:text-green-400 transition-colors"
                                title="Send Invoice"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            )}
                            
                            {['sent', 'overdue'].includes(invoice.status) && (
                              <button
                                onClick={() => handleInvoiceAction(invoice._id, 'mark-paid')}
                                disabled={actionLoading}
                                className="text-green-600 hover:text-green-900 disabled:text-green-400 transition-colors"
                                title="Mark as Paid"
                              >
                                <CreditCard className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                        
                        <button className="text-gray-400 hover:text-gray-600 transition-colors">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
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
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 py-6 sm:container sm:mx-auto sm:p-4">
        {/* Breadcrumbs */}
        <div className="mb-6">
          <Breadcrumbs />
        </div>

        {/* Mobile-first Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 text-blue-600 flex-shrink-0" />
                <span className="truncate">Invoices</span>
              </h1>
              <p className="text-gray-600 text-sm sm:text-base mt-1 hidden sm:block">
                Manage tenant invoices and billing
              </p>
            </div>
            <div className="ml-4 flex items-center space-x-2">
              <button
                onClick={() => fetchInvoices()}
                disabled={loading}
                className="inline-flex items-center px-3 py-2 sm:px-4 sm:py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400 transition-colors text-sm whitespace-nowrap"
              >
                <RefreshCw className={`w-4 h-4 mr-1 sm:mr-2 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <Link
                href="/invoices/create"
                className="inline-flex items-center px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm whitespace-nowrap"
              >
                <Plus className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Create Invoice</span>
                <span className="sm:hidden">Create</span>
              </Link>
            </div>
          </div>
          
          {/* Mobile description */}
          <p className="text-gray-600 text-sm sm:hidden">
            Manage tenant invoices and billing
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
              <button
                onClick={() => setError("")}
                className="text-red-600 hover:text-red-800"
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
        {invoices.length > 0 && <InvoicesStats />}
        
        {/* Content */}
        {filteredInvoices.length === 0 ? (
          <EmptyState />
        ) : (
          <div>
            {/* Mobile: Cards */}
            <div className="space-y-4 lg:hidden">
              {filteredInvoices.map((invoice) => (
                <InvoiceCard key={invoice._id} invoice={invoice} />
              ))}
            </div>

            {/* Desktop: Table */}
            <InvoicesTable invoices={filteredInvoices} />
            
            {/* Footer Info */}
            <div className="mt-6 text-center text-xs sm:text-sm text-gray-500">
              Showing {filteredInvoices.length} {filteredInvoices.length === 1 ? 'invoice' : 'invoices'}
              <span className="hidden sm:inline"> • Last updated: {new Date().toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Action Loading Indicator */}
        {actionLoading && (
          <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Processing...
          </div>
        )}
      </div>
    </div>
  );
}