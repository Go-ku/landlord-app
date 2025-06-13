"use client";
import { useState, useEffect } from "react";
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
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Loader2,
  Info,
  Lock,
  History,
} from "lucide-react";

export default function EditInvoiceClient({ invoiceData, currentUser }) {
  const { invoice } = invoiceData;
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Check if invoice can be edited
  const canEdit = ['draft', 'sent'].includes(invoice.status);
  const isPaid = invoice.status === 'paid';
  const isCancelled = invoice.status === 'cancelled';
  
  // Form state - initialize with existing invoice data
  const [formData, setFormData] = useState({
    issueDate: invoice.issueDate.split('T')[0],
    dueDate: invoice.dueDate.split('T')[0],
    status: invoice.status,
    notes: invoice.notes || "",
  });

  const [items, setItems] = useState(
    invoice.items?.length > 0 ? invoice.items.map(item => ({
      description: item.description || "",
      amount: item.amount?.toString() || "",
      taxRate: item.taxRate || 0,
      periodStart: item.periodStart ? item.periodStart.split('T')[0] : "",
      periodEnd: item.periodEnd ? item.periodEnd.split('T')[0] : "",
    })) : [{
      description: "",
      amount: "",
      taxRate: 0,
      periodStart: "",
      periodEnd: "",
    }]
  );

  const [errors, setErrors] = useState({});

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const tax = items.reduce((sum, item) => {
    const amount = parseFloat(item.amount) || 0;
    const taxRate = parseFloat(item.taxRate) || 0;
    return sum + (amount * taxRate / 100);
  }, 0);
  const total = subtotal + tax;

  // Compare with original totals
  const originalTotal = invoice.total || 0;
  const totalChanged = Math.abs(total - originalTotal) > 0.01;

  const getTenantName = () => {
    return invoice.tenantId?.name || 
      `${invoice.tenantId?.firstName || ''} ${invoice.tenantId?.lastName || ''}`.trim() || 
      'Unknown Tenant';
  };

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

      const updateData = {
        issueDate: formData.issueDate,
        dueDate: formData.dueDate,
        status: formData.status,
        items: validItems,
        subtotal,
        tax,
        total,
        notes: formData.notes.trim(),
      };

      const response = await fetch(`/api/invoices/${invoice._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to update invoice');
      }

      const result = await response.json();
      setSuccess('Invoice updated successfully!');
      
      // Redirect to the updated invoice
      setTimeout(() => {
        router.push(`/invoices/${invoice._id}`);
      }, 1500);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // If invoice cannot be edited, show read-only view
  if (!canEdit) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto p-4 max-w-4xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <div className="mb-4 sm:mb-0">
              <Link
                href={`/invoices/${invoice._id}`}
                className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-2 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Invoice
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Lock className="w-8 h-8 mr-3 text-gray-600" />
                Cannot Edit Invoice
              </h1>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start">
              <AlertCircle className="w-8 h-8 text-yellow-600 mt-1 mr-4" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Invoice Cannot Be Modified
                </h3>
                <p className="text-gray-600 mb-4">
                  {isPaid && "This invoice has been paid and cannot be modified."}
                  {isCancelled && "This invoice has been cancelled and cannot be modified."}
                  {invoice.status === 'overdue' && "This invoice is overdue. Only draft and sent invoices can be edited."}
                </p>
                
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Invoice Details:</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Invoice Number:</span>
                      <p className="font-medium">{invoice.invoiceNumber}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Status:</span>
                      <p className="font-medium capitalize">{invoice.status}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Total Amount:</span>
                      <p className="font-medium">{formatCurrency(invoice.total)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Due Date:</span>
                      <p className="font-medium">{formatDate(invoice.dueDate)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-4">
                  <Link
                    href={`/invoices/${invoice._id}`}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    View Invoice
                  </Link>
                  
                  {invoice.status !== 'cancelled' && (
                    <Link
                      href={`/invoices/create?duplicateFrom=${invoice._id}`}
                      className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Duplicate Invoice
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
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
              href={`/invoices/${invoice._id}`}
              className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Invoice
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <FileText className="w-8 h-8 mr-3 text-blue-600" />
              Edit Invoice {invoice.invoiceNumber}
            </h1>
            <p className="text-gray-600 mt-1">
              Modify invoice details and line items
              {invoice.status === 'sent' && (
                <span className="block text-sm text-orange-600 mt-1">
                  ⚠️ This invoice has been sent to the tenant. Changes will update the invoice.
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
          {/* Invoice Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-blue-600" />
              Invoice Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Number
                </label>
                <input
                  type="text"
                  value={invoice.invoiceNumber}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                />
                <p className="text-xs text-gray-500 mt-1">Cannot be changed</p>
              </div>

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
                  <option value="sent">Sent</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Status will be updated when saved
                </p>
              </div>
            </div>
          </div>

          {/* Tenant & Property Info (Read-only) */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Tenant & Property (Cannot be changed)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Tenant</h3>
                <p className="text-blue-800 font-medium">{getTenantName()}</p>
                {invoice.tenantId?.email && (
                  <p className="text-blue-600 text-sm">{invoice.tenantId.email}</p>
                )}
                {invoice.tenantId?.phone && (
                  <p className="text-blue-600 text-sm">{invoice.tenantId.phone}</p>
                )}
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-medium text-green-900 mb-2">Property</h3>
                <p className="text-green-800 font-medium">
                  {invoice.propertyId?.address || 'Unknown Property'}
                </p>
                {invoice.propertyId?.name && (
                  <p className="text-green-600 text-sm">{invoice.propertyId.name}</p>
                )}
                <p className="text-green-600 text-sm">
                  {invoice.propertyId?.type}
                  {invoice.propertyId?.bedrooms && ` • ${invoice.propertyId.bedrooms} bed`}
                  {invoice.propertyId?.bathrooms && ` • ${invoice.propertyId.bathrooms} bath`}
                </p>
              </div>
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Current Totals */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Updated Totals</h3>
                <div className="space-y-3">
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
                      <span className="font-semibold">New Total:</span>
                      <span className={`font-bold ${totalChanged ? 'text-orange-600' : 'text-blue-600'}`}>
                        {formatCurrency(total)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Original Totals */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Original Totals</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-gray-600">
                    <span>Original Subtotal:</span>
                    <span className="font-medium">{formatCurrency(invoice.subtotal || 0)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Original Tax:</span>
                    <span className="font-medium">{formatCurrency(invoice.tax || 0)}</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between text-lg">
                      <span className="font-semibold">Original Total:</span>
                      <span className="font-bold text-gray-600">{formatCurrency(originalTotal)}</span>
                    </div>
                  </div>
                </div>

                {totalChanged && (
                  <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
                    <div className="flex items-start">
                      <Info className="w-4 h-4 text-orange-600 mt-0.5 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-orange-800">Total Amount Changed</p>
                        <p className="text-sm text-orange-700 mt-1">
                          Difference: {total > originalTotal ? '+' : ''}{formatCurrency(total - originalTotal)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Payment History */}
          {invoice.paymentHistory && invoice.paymentHistory.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <History className="w-5 h-5 mr-2 text-blue-600" />
                Payment History (Read-only)
              </h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="space-y-2">
                  {invoice.paymentHistory.map((payment, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-gray-600">
                        Payment received on {formatDate(payment.date)}
                      </span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(payment.amount)}
                      </span>
                    </div>
                  ))}
                  {invoice.amountPaid > 0 && (
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between items-center font-semibold">
                        <span className="text-gray-700">Total Paid:</span>
                        <span className="text-green-600">{formatCurrency(invoice.amountPaid)}</span>
                      </div>
                      <div className="flex justify-between items-center font-semibold">
                        <span className="text-gray-700">Balance Due:</span>
                        <span className="text-red-600">{formatCurrency(invoice.balanceDue || 0)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

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
                  Updating Invoice...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Update Invoice
                </>
              )}
            </button>

            <Link
              href={`/invoices/${invoice._id}`}
              className="inline-flex items-center justify-center px-6 py-3 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors font-medium"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Link>

            {totalChanged && (
              <div className="sm:ml-auto flex items-center text-sm text-orange-600">
                <Info className="w-4 h-4 mr-1" />
                Total changed: {formatCurrency(total)} (was {formatCurrency(originalTotal)})
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}