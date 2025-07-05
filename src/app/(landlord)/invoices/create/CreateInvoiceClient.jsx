"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import { formatDate } from "utils/date";
import { formatCurrency } from "utils/currency";
import {
  ArrowLeft,
  FileText,
  Save,
  X,
  Plus,
  Trash2,
  Calculator,
  Users,
  Home,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Loader2,
  Info,
  Mail,
} from "lucide-react";

export default function CreateInvoiceClient({ initialData, searchParams }) {
  const router = useRouter();
  const { tenants = [], properties = [], leases = [], currentUser } = initialData || {};
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Form state
  const [formData, setFormData] = useState({
    tenantId: searchParams?.tenantId || "",
    propertyId: searchParams?.propertyId || "",
    leaseId: searchParams?.leaseId || "",
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    status: "draft",
    notes: "",
  });

  const [items, setItems] = useState([
    {
      id: Date.now(), // Add unique ID for better key management
      description: "",
      amount: "",
      taxRate: 0,
      periodStart: "",
      periodEnd: "",
    }
  ]);

  const [errors, setErrors] = useState({});
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [availableLeases, setAvailableLeases] = useState([]);

  // Calculate totals with better number handling
  const subtotal = items.reduce((sum, item) => {
    const amount = parseFloat(item.amount) || 0;
    return sum + amount;
  }, 0);
  
  const tax = items.reduce((sum, item) => {
    const amount = parseFloat(item.amount) || 0;
    const taxRate = parseFloat(item.taxRate) || 0;
    return sum + (amount * taxRate / 100);
  }, 0);
  
  const total = subtotal + tax;

  // Update available leases when tenant or property changes
  useEffect(() => {
    if (formData.tenantId && formData.propertyId) {
      const filteredLeases = leases.filter(lease => 
        lease.tenantId === formData.tenantId && lease.propertyId === formData.propertyId
      );
      setAvailableLeases(filteredLeases);
      
      // Auto-select active lease if available and no lease is currently selected
      const activeLease = filteredLeases.find(lease => lease.status === 'active');
      if (activeLease && !formData.leaseId) {
        setFormData(prev => ({ ...prev, leaseId: activeLease._id }));
      } else if (filteredLeases.length === 0) {
        setFormData(prev => ({ ...prev, leaseId: "" }));
      }
    } else {
      setAvailableLeases([]);
      setFormData(prev => ({ ...prev, leaseId: "" }));
    }
  }, [formData.tenantId, formData.propertyId, leases]);

  // Update selected tenant and property objects
  useEffect(() => {
    const tenant = tenants.find(t => t._id === formData.tenantId);
    const property = properties.find(p => p._id === formData.propertyId);
    setSelectedTenant(tenant || null);
    setSelectedProperty(property || null);
  }, [formData.tenantId, formData.propertyId, tenants, properties]);

  // Auto-populate rent amount when lease is selected
  useEffect(() => {
    if (formData.leaseId && availableLeases.length > 0) {
      const selectedLease = availableLeases.find(lease => lease._id === formData.leaseId);
      if (selectedLease && items.length === 1 && !items[0].description && !items[0].amount) {
        const currentDate = new Date();
        const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        const endOfMonth = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0);
        
        setItems([{
          id: items[0].id,
          description: `Monthly Rent - ${selectedProperty?.address || 'Property'}`,
          amount: selectedLease.monthlyRent?.toString() || "",
          taxRate: 0,
          periodStart: nextMonth.toISOString().split('T')[0],
          periodEnd: endOfMonth.toISOString().split('T')[0],
        }]);
      }
    }
  }, [formData.leaseId, availableLeases, selectedProperty, items]);

  const handleFormDataChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user makes changes
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }

    // Clear general error when user makes changes
    if (error) {
      setError("");
    }
  }, [errors, error]);

  const handleItemChange = useCallback((index, field, value) => {
    setItems(prevItems => {
      const newItems = [...prevItems];
      newItems[index] = { ...newItems[index], [field]: value };
      return newItems;
    });

    // Clear item-specific errors
    const errorKey = `item_${index}_${field}`;
    if (errors[errorKey]) {
      setErrors(prev => ({ ...prev, [errorKey]: "" }));
    }
  }, [errors]);

  const addItem = useCallback(() => {
    setItems(prev => [...prev, {
      id: Date.now() + Math.random(), // Ensure unique ID
      description: "",
      amount: "",
      taxRate: 0,
      periodStart: "",
      periodEnd: "",
    }]);
  }, []);

  const removeItem = useCallback((index) => {
    if (items.length > 1) {
      setItems(prev => prev.filter((_, i) => i !== index));
      
      // Clear errors for removed item
      setErrors(prev => {
        const newErrors = { ...prev };
        Object.keys(newErrors).forEach(key => {
          if (key.startsWith(`item_${index}_`)) {
            delete newErrors[key];
          }
        });
        return newErrors;
      });
    }
  }, [items.length]);

  const validateForm = useCallback(() => {
    const newErrors = {};

    // Required fields
    if (!formData.tenantId) newErrors.tenantId = "Tenant is required";
    if (!formData.propertyId) newErrors.propertyId = "Property is required";
    if (!formData.issueDate) newErrors.issueDate = "Issue date is required";
    if (!formData.dueDate) newErrors.dueDate = "Due date is required";

    // Date validation
    const issueDate = new Date(formData.issueDate);
    const dueDate = new Date(formData.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (issueDate < today) {
      newErrors.issueDate = "Issue date cannot be in the past";
    }
    
    if (dueDate <= issueDate) {
      newErrors.dueDate = "Due date must be after issue date";
    }

    // Items validation
    const validItems = items.filter(item => 
      item.description.trim() && parseFloat(item.amount) > 0
    );
    
    if (validItems.length === 0) {
      newErrors.items = "At least one item with description and amount is required";
    }

    // Individual item validation
    items.forEach((item, index) => {
      const description = item.description.trim();
      const amount = parseFloat(item.amount);
      const taxRate = parseFloat(item.taxRate);

      if (description && (!amount || amount <= 0)) {
        newErrors[`item_${index}_amount`] = "Amount must be greater than 0 when description is provided";
      }
      if (amount > 0 && !description) {
        newErrors[`item_${index}_description`] = "Description is required when amount is provided";
      }
      if (taxRate < 0 || taxRate > 100) {
        newErrors[`item_${index}_taxRate`] = "Tax rate must be between 0 and 100";
      }
      
      // Period validation
      if (item.periodStart && item.periodEnd) {
        const startDate = new Date(item.periodStart);
        const endDate = new Date(item.periodEnd);
        if (endDate <= startDate) {
          newErrors[`item_${index}_periodEnd`] = "Period end must be after period start";
        }
      } else if (item.periodStart && !item.periodEnd) {
        newErrors[`item_${index}_periodEnd`] = "Period end is required when period start is provided";
      } else if (!item.periodStart && item.periodEnd) {
        newErrors[`item_${index}_periodStart`] = "Period start is required when period end is provided";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, items]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setError("Please fix the errors below");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const validItems = items.filter(item => 
        item.description.trim() && parseFloat(item.amount) > 0
      ).map(item => ({
        description: item.description.trim(),
        amount: parseFloat(item.amount),
        taxRate: parseFloat(item.taxRate) || 0,
        periodStart: item.periodStart || null,
        periodEnd: item.periodEnd || null,
      }));

      const invoiceData = {
        tenantId: formData.tenantId,
        propertyId: formData.propertyId,
        leaseId: formData.leaseId || null,
        issueDate: formData.issueDate,
        dueDate: formData.dueDate,
        status: formData.status,
        notes: formData.notes?.trim() || "",
        items: validItems,
        subtotal: Math.round(subtotal * 100) / 100, // Round to 2 decimal places
        tax: Math.round(tax * 100) / 100,
        total: Math.round(total * 100) / 100,
      };

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({ error: 'Failed to create invoice' }));
        throw new Error(result.error || result.message || 'Failed to create invoice');
      }

      const result = await response.json();
      setSuccess(`Invoice created successfully! ${formData.status === 'sent' ? 'Email sent to tenant.' : ''}`);
      
      // Redirect to the created invoice
      setTimeout(() => {
        router.push(`/invoices/${result.invoice._id || result._id}`);
      }, 2000);

    } catch (err) {
      console.error('Error creating invoice:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getTenantName = (tenant) => {
    if (!tenant) return 'Unknown Tenant';
    return tenant.name || 
      `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim() || 
      'Unknown Tenant';
  };

  const getPropertyDisplayName = (property) => {
    if (!property) return 'Unknown Property';
    return property.address || property.name || 'Unknown Property';
  };

  // Loading state
  if (!initialData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 max-w-5xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="mb-4 sm:mb-0">
            <Link
              href="/invoices"
              className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Invoices
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <FileText className="w-8 h-8 mr-3 text-blue-600" />
              Create Invoice
            </h1>
            <p className="text-gray-600 mt-1">
              Generate a new invoice for tenant billing
              {currentUser?.role === 'landlord' && (
                <span className="block text-sm text-blue-600 mt-1">
                  Showing your properties and tenants only
                </span>
              )}
            </p>
          </div>
        </div>

        <Breadcrumbs />

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
                onClick={() => setError("")}
                className="text-red-600 hover:text-red-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-green-800">Success</h3>
                <p className="text-sm text-green-700 mt-1">{success}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Invoice Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-blue-600" />
              Invoice Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Issue Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="date"
                    value={formData.issueDate}
                    onChange={(e) => handleFormDataChange('issueDate', e.target.value)}
                    className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                      errors.issueDate ? 'border-red-300' : 'border-gray-300'
                    }`}
                    required
                  />
                </div>
                {errors.issueDate && (
                  <p className="text-red-600 text-sm mt-1">{errors.issueDate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => handleFormDataChange('dueDate', e.target.value)}
                    className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                      errors.dueDate ? 'border-red-300' : 'border-gray-300'
                    }`}
                    required
                  />
                </div>
                {errors.dueDate && (
                  <p className="text-red-600 text-sm mt-1">{errors.dueDate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleFormDataChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="draft">Save as Draft</option>
                  <option value="sent">Send Immediately</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.status === 'sent' ? 'Email will be sent to tenant' : 'Save without sending'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Number
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value="Auto-generated"
                    disabled
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Will be automatically assigned
                </p>
              </div>
            </div>
          </div>

          {/* Tenant & Property Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Users className="w-5 h-5 mr-2 text-blue-600" />
              Tenant & Property
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tenant <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.tenantId}
                  onChange={(e) => handleFormDataChange('tenantId', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    errors.tenantId ? 'border-red-300' : 'border-gray-300'
                  }`}
                  required
                >
                  <option value="">Select a tenant</option>
                  {tenants.map(tenant => (
                    <option key={tenant._id} value={tenant._id}>
                      {getTenantName(tenant)} {tenant.email && `(${tenant.email})`}
                    </option>
                  ))}
                </select>
                {errors.tenantId && (
                  <p className="text-red-600 text-sm mt-1">{errors.tenantId}</p>
                )}
                {selectedTenant && (
                  <div className="mt-2 p-3 bg-blue-50 rounded text-sm">
                    <p className="font-medium text-blue-900">{getTenantName(selectedTenant)}</p>
                    {selectedTenant.email && <p className="text-blue-700">{selectedTenant.email}</p>}
                    {selectedTenant.phone && <p className="text-blue-700">{selectedTenant.phone}</p>}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.propertyId}
                  onChange={(e) => handleFormDataChange('propertyId', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    errors.propertyId ? 'border-red-300' : 'border-gray-300'
                  }`}
                  required
                >
                  <option value="">Select a property</option>
                  {properties.map(property => (
                    <option key={property._id} value={property._id}>
                      {getPropertyDisplayName(property)} {property.name && `- ${property.name}`}
                      {currentUser?.role === 'manager' && property.landlord && 
                        ` (Owner: ${property.landlord.name || `${property.landlord.firstName} ${property.landlord.lastName}`})`}
                    </option>
                  ))}
                </select>
                {errors.propertyId && (
                  <p className="text-red-600 text-sm mt-1">{errors.propertyId}</p>
                )}
                {currentUser?.role === 'landlord' && properties.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Showing only properties you own ({properties.length} available)
                  </p>
                )}
                {selectedProperty && (
                  <div className="mt-2 p-3 bg-green-50 rounded text-sm">
                    <p className="font-medium text-green-900">{getPropertyDisplayName(selectedProperty)}</p>
                    <p className="text-green-700">
                      {selectedProperty.type} 
                      {selectedProperty.bedrooms && ` • ${selectedProperty.bedrooms} bed`}
                      {selectedProperty.bathrooms && ` • ${selectedProperty.bathrooms} bath`}
                    </p>
                    {selectedProperty.monthlyRent && (
                      <p className="text-green-700">Rent: {formatCurrency(selectedProperty.monthlyRent)}/month</p>
                    )}
                  </div>
                )}
              </div>

              {availableLeases.length > 0 && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Associated Lease (Optional)
                  </label>
                  <select
                    value={formData.leaseId}
                    onChange={(e) => handleFormDataChange('leaseId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">No lease association</option>
                    {availableLeases.map(lease => (
                      <option key={lease._id} value={lease._id}>
                        Lease: {formatDate(lease.startDate)} - {formatDate(lease.endDate)} 
                        ({formatCurrency(lease.monthlyRent)}/month) - {lease.status}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Selecting a lease will auto-populate rent amount in the first item
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Invoice Items */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Calculator className="w-5 h-5 mr-2 text-blue-600" />
                Invoice Items
              </h2>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </button>
            </div>

            {errors.items && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-600 text-sm flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  {errors.items}
                </p>
              </div>
            )}

            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                          errors[`item_${index}_description`] ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="e.g., Monthly Rent, Utility Fee"
                      />
                      {errors[`item_${index}_description`] && (
                        <p className="text-red-600 text-xs mt-1">{errors[`item_${index}_description`]}</p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <DollarSign className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.amount}
                          onChange={(e) => handleItemChange(index, 'amount', e.target.value)}
                          className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                            errors[`item_${index}_amount`] ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder="0.00"
                        />
                      </div>
                      {errors[`item_${index}_amount`] && (
                        <p className="text-red-600 text-xs mt-1">{errors[`item_${index}_amount`]}</p>
                      )}
                    </div>

                    <div className="md:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tax %
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={item.taxRate}
                        onChange={(e) => handleItemChange(index, 'taxRate', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                          errors[`item_${index}_taxRate`] ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="0"
                      />
                      {errors[`item_${index}_taxRate`] && (
                        <p className="text-red-600 text-xs mt-1">{errors[`item_${index}_taxRate`]}</p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Period Start
                      </label>
                      <input
                        type="date"
                        value={item.periodStart}
                        onChange={(e) => handleItemChange(index, 'periodStart', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                          errors[`item_${index}_periodStart`] ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {errors[`item_${index}_periodStart`] && (
                        <p className="text-red-600 text-xs mt-1">{errors[`item_${index}_periodStart`]}</p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Period End
                      </label>
                      <input
                        type="date"
                        value={item.periodEnd}
                        onChange={(e) => handleItemChange(index, 'periodEnd', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                          errors[`item_${index}_periodEnd`] ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {errors[`item_${index}_periodEnd`] && (
                        <p className="text-red-600 text-xs mt-1">{errors[`item_${index}_periodEnd`]}</p>
                      )}
                    </div>

                    <div className="md:col-span-1 flex items-end">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                        className="w-full px-3 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 disabled:bg-gray-50 disabled:text-gray-400 transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4 mx-auto" />
                      </button>
                    </div>
                  </div>

                  {/* Item total display */}
                  {item.amount && parseFloat(item.amount) > 0 && (
                    <div className="mt-3 text-right text-sm">
                      <span className="text-gray-600">Item Total: </span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency((parseFloat(item.amount) || 0) * (1 + (parseFloat(item.taxRate) || 0) / 100))}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Invoice Totals */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Invoice Totals</h2>
            
            <div className="flex justify-end">
              <div className="w-full max-w-sm space-y-3">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal:</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Tax:</span>
                  <span className="font-medium">{formatCurrency(tax)}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg">
                    <span className="font-semibold">Total:</span>
                    <span className="font-bold text-blue-600">{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Additional Notes</h2>
            <textarea
              value={formData.notes}
              onChange={(e) => handleFormDataChange('notes', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter any additional notes, payment instructions, or terms..."
            />
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <button
              type="submit"
              disabled={loading || total <= 0}
              className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Invoice...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {formData.status === 'sent' ? 'Create & Send Invoice' : 'Create Invoice'}
                </>
              )}
            </button>

            <Link
              href="/invoices"
              className="inline-flex items-center justify-center px-6 py-3 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors font-medium"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Link>

            {total > 0 && (
              <div className="sm:ml-auto flex items-center text-sm text-gray-600">
                <Info className="w-4 h-4 mr-1" />
                Invoice total: {formatCurrency(total)}
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}