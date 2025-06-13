// src/components/QuickInvoiceModal.js
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "utils/currency";
import {
  X,
  FileText,
  Calendar,
  DollarSign,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

export default function QuickInvoiceModal({ 
  isOpen, 
  onClose, 
  tenant = null, 
  property = null, 
  lease = null 
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    description: "",
    amount: "",
    notes: "",
    sendImmediately: false,
  });

  // Auto-populate when props change
  useEffect(() => {
    if (lease && property) {
      setFormData(prev => ({
        ...prev,
        description: `Monthly Rent - ${property.address}`,
        amount: lease.monthlyRent || "",
      }));
    } else if (property) {
      setFormData(prev => ({
        ...prev,
        description: `Rent - ${property.address}`,
        amount: property.monthlyRent || "",
      }));
    }
  }, [lease, property]);

  const getTenantName = () => {
    if (!tenant) return "Unknown Tenant";
    return tenant.name || 
      `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim() || 
      'Unknown Tenant';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!tenant || !property) {
      setError("Tenant and property are required");
      return;
    }

    if (!formData.description.trim() || !formData.amount) {
      setError("Description and amount are required");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const currentDate = new Date();
      const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
      const endOfMonth = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 0);

      const invoiceData = {
        tenantId: tenant._id,
        propertyId: property._id,
        leaseId: lease?._id || null,
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: formData.dueDate,
        status: formData.sendImmediately ? 'sent' : 'draft',
        items: [{
          description: formData.description.trim(),
          amount: parseFloat(formData.amount),
          taxRate: 0,
          periodStart: lease ? nextMonth.toISOString().split('T')[0] : null,
          periodEnd: lease ? endOfMonth.toISOString().split('T')[0] : null,
        }],
        subtotal: parseFloat(formData.amount),
        tax: 0,
        total: parseFloat(formData.amount),
        notes: formData.notes.trim(),
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
      setSuccess(`Invoice ${result.invoice.invoiceNumber} created successfully!`);
      
      // Redirect to the created invoice after a short delay
      setTimeout(() => {
        router.push(`/invoices/${result.invoice._id}`);
        onClose();
      }, 1500);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFullForm = () => {
    const params = new URLSearchParams();
    if (tenant) params.set('tenantId', tenant._id);
    if (property) params.set('propertyId', property._id);
    if (lease) params.set('leaseId', lease._id);
    
    router.push(`/invoices/create?${params.toString()}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-blue-600" />
            Quick Invoice
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 mr-2" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 mr-2" />
                <p className="text-sm text-green-700">{success}</p>
              </div>
            </div>
          )}

          {/* Tenant & Property Info */}
          <div className="mb-6 space-y-3">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-blue-900">Tenant</p>
              <p className="text-blue-700">{getTenantName()}</p>
              {tenant?.email && (
                <p className="text-sm text-blue-600">{tenant.email}</p>
              )}
            </div>
            
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-green-900">Property</p>
              <p className="text-green-700">{property?.address || 'Unknown Property'}</p>
              {property?.name && (
                <p className="text-sm text-green-600">{property.name}</p>
              )}
            </div>

            {lease && (
              <div className="bg-purple-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-purple-900">Active Lease</p>
                <p className="text-purple-700">
                  {formatCurrency(lease.monthlyRent || 0)}/month
                </p>
                <p className="text-sm text-purple-600">
                  Status: {lease.status}
                </p>
              </div>
            )}
          </div>

          {/* Quick Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Monthly Rent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
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
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Additional notes..."
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="sendImmediately"
                checked={formData.sendImmediately}
                onChange={(e) => setFormData(prev => ({ ...prev, sendImmediately: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="sendImmediately" className="ml-2 block text-sm text-gray-900">
                Send invoice immediately
              </label>
            </div>

            {/* Form Actions */}
            <div className="flex flex-col space-y-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Create Quick Invoice
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleFullForm}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center justify-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Use Full Form
              </button>
            </div>
          </form>

          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              Quick invoice creates a single-item invoice. Use the full form for multiple items.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}