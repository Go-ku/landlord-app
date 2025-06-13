"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
} from "lucide-react";

export default function CreateInvoiceClient({ initialData }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tenants, properties, leases, currentUser } = initialData;
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Form state
  const [formData, setFormData] = useState({
    tenantId: searchParams.get('tenantId') || "",
    propertyId: searchParams.get('propertyId') || "",
    leaseId: searchParams.get('leaseId') || "",
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    status: "draft",
    notes: "",
  });

  const [items, setItems] = useState([
    {
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

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
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
      
      // Auto-select active lease if available
      const activeLease = filteredLeases.find(lease => lease.status === 'active');
      if (activeLease && !formData.leaseId) {
        setFormData(prev => ({ ...prev, leaseId: activeLease._id }));
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
    setSelectedTenant(tenant);
    setSelectedProperty(property);
  }, [formData.tenantId, formData.propertyId, tenants, properties]);

  // Auto-populate rent amount when lease is selected
  useEffect(() => {
    if (formData.leaseId) {
      const selectedLease = availableLeases.find(lease => lease._id === formData.leaseId);
      if (selectedLease && items.length === 1 && !items[0].description) {
        const currentDate = new Date();
        const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        const endOfMonth = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 0);
        
        setItems([{
          description: `Monthly Rent - ${selectedProperty?.address || 'Property'}`,
          amount: selectedLease.monthlyRent || "",
          taxRate: 0,
          periodStart: nextMonth.toISOString().split('T')[0],
          periodEnd: endOfMonth.toISOString().split('T')[0],
        }]);
      }
    }
  }, [formData.leaseId, availableLeases, selectedProperty]);

  const handleFormDataChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user makes changes
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, {
      description: "",
      amount: "",
      taxRate: 0,
      periodStart: "",
      periodEnd: "",
    }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Required fields
    if (!formData.tenantId) newErrors.tenantId = "Tenant is required";
    if (!formData.propertyId) newErrors.propertyId = "Property is required";
    if (!formData.dueDate) newErrors.dueDate = "Due date is required";

    // Date validation
    const issueDate = new Date(formData.issueDate);
    const dueDate = new Date(formData.dueDate);
    
    if (dueDate <= issueDate) {
      newErrors.dueDate = "Due date must be after issue date";
    }

    // Items validation
    const hasValidItems = items.some(item => 
      item.description.trim() && parseFloat(item.amount) > 0
    );
    
    if (!hasValidItems) {
      newErrors.items = "At least one item with description and amount is required";
    }

    // Individual item validation
    items.forEach((item, index) => {
      if (item.description.trim() && !parseFloat(item.amount)) {
        newErrors[`item_${index}_amount`] = "Amount is required when description is provided";
      }
      if (parseFloat(item.amount) > 0 && !item.description.trim()) {
        newErrors[`item_${index}_description`] = "Description is required when amount is provided";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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
        ...formData,
        items: validItems,
        subtotal,
        tax,
        total,
      };

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to create invoice');
      }

      const result = await response.json();
      setSuccess('Invoice created successfully!');
      
      // Redirect to the created invoice
      setTimeout(() => {
        router.push(`/invoices/${result.invoice._id}`);
      }, 1500);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getTenantName = (tenant) => {
    return tenant.name || 
      `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim() || 
      'Unknown Tenant';
  };

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
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3" />
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
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
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
                  <option value="draft">Draft</option>
                  <option value="sent">Send Immediately</option>
                </select>
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
                  <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                    <p className="font-medium">{getTenantName(selectedTenant)}</p>
                    {selectedTenant.email && <p className="text-gray-600">{selectedTenant.email}</p>}
                    {selectedTenant.phone && <p className="text-gray-600">{selectedTenant.phone}</p>}
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
                      {property.address} {property.name && `- ${property.name}`}
                      {currentUser?.role === 'manager' && property.landlord && ` (Owner: ${property.landlord.name || `${property.landlord.firstName} ${property.landlord.lastName}`})`}
                    </option>
                  ))}
                </select>
                {errors.propertyId && (
                  <p className="text-red-600 text-sm mt-1">{errors.propertyId}</p>
                )}
                {currentUser?.role === 'landlord' && (
                  <p className="text-xs text-gray-500 mt-1">
                    Showing only properties you own ({properties.length} available)
                  </p>
                )}
                {selectedProperty && (
                  <div className="mt-2 p-2 bg-green-50 rounded text-sm">
                    <p className="font-medium">{selectedProperty.address}</p>
                    <p className="text-gray-600">
                      {selectedProperty.type} 
                      {selectedProperty.bedrooms && ` • ${selectedProperty.bedrooms} bed`}
                      {selectedProperty.bathrooms && ` • ${selectedProperty.bathrooms} bath`}
                    </p>
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
                    Selecting a lease will auto-populate rent amount
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
                className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </button>
            </div>

            {errors.items && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-600 text-sm">{errors.items}</p>
              </div>
            )}

            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Period Start
                      </label>
                      <input
                        type="date"
                        value={item.periodStart}
                        onChange={(e) => handleItemChange(index, 'periodStart', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Period End
                      </label>
                      <input
                        type="date"
                        value={item.periodEnd}
                        onChange={(e) => handleItemChange(index, 'periodEnd', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
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
                  {item.amount && (
                    <div className="mt-2 text-right text-sm text-gray-600">
                      Item Total: {formatCurrency((parseFloat(item.amount) || 0) * (1 + (parseFloat(item.taxRate) || 0) / 100))}
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
              placeholder="Enter any additional notes or payment instructions..."
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
                  Create Invoice
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