// app/tenant/payments/new/page.js
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  DollarSign,
  CreditCard,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Receipt,
  Building,
  User,
  FileText,
  Upload,
  X,
  Loader2,
  Info
} from 'lucide-react';

export default function TenantMakePaymentPage() {
  const { data: session } = useSession();
  const router = useRouter();
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Tenant data
  const [tenantData, setTenantData] = useState(null);
  const [upcomingPayments, setUpcomingPayments] = useState([]);
  
  // Form data
  const [formData, setFormData] = useState({
    amount: '',
    paymentType: 'rent',
    paymentMethod: 'bank_transfer',
    reference: '',
    description: '',
    receiptFile: null
  });
  
  const [errors, setErrors] = useState({});
  const [receiptPreview, setReceiptPreview] = useState(null);

  // Check authorization
  useEffect(() => {
    if (session && session.user.role !== 'tenant') {
      router.push('/dashboard');
    }
  }, [session, router]);

  // Fetch tenant data
  useEffect(() => {
    if (session?.user?.role === 'tenant') {
      fetchTenantData();
    }
  }, [session]);

  const fetchTenantData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/tenant/payment-info');
      const data = await response.json();
      
      if (data.success) {
        setTenantData(data.data);
        setUpcomingPayments(data.data.upcomingPayments || []);
        
        // Set default amount to monthly rent if available
        if (data.data.lease?.monthlyRent) {
          setFormData(prev => ({
            ...prev,
            amount: data.data.lease.monthlyRent.toString()
          }));
        }
        
        setError('');
      } else {
        setError(data.error || 'Failed to load payment information');
      }
    } catch (error) {
      console.error('Error fetching tenant data:', error);
      setError('Failed to load payment information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, files } = e.target;
    
    if (type === 'file') {
      const file = files[0];
      setFormData(prev => ({ ...prev, [name]: file }));
      
      // Create preview for receipt
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setReceiptPreview(e.target.result);
        reader.readAsDataURL(file);
      } else {
        setReceiptPreview(null);
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const removeReceiptFile = () => {
    setFormData(prev => ({ ...prev, receiptFile: null }));
    setReceiptPreview(null);
    const fileInput = document.getElementById('receiptFile');
    if (fileInput) fileInput.value = '';
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Valid payment amount is required';
    }
    
    if (!formData.paymentMethod) {
      newErrors.paymentMethod = 'Payment method is required';
    }
    
    if (!formData.reference.trim()) {
      newErrors.reference = 'Payment reference is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    
    try {
      // Create FormData for file upload
      const submitData = new FormData();
      
      // Add form fields
      submitData.append('amount', parseFloat(formData.amount));
      submitData.append('paymentType', formData.paymentType);
      submitData.append('paymentMethod', formData.paymentMethod);
      submitData.append('reference', formData.reference);
      submitData.append('description', formData.description);
      
      // Add file if provided
      if (formData.receiptFile) {
        submitData.append('receiptFile', formData.receiptFile);
      }
      
      const response = await fetch('/api/tenant/payments', {
        method: 'POST',
        body: submitData
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSuccess('Payment submitted successfully! You will be redirected to the payment details.');
        setTimeout(() => {
          router.push(`/tenant/payments/${result.data._id}`);
        }, 2000);
      } else {
        setError(result.error || 'Failed to submit payment');
      }
    } catch (error) {
      console.error('Error submitting payment:', error);
      setError('Failed to submit payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const paymentMethods = [
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'mobile_money', label: 'Mobile Money (MTN/Airtel)' },
    { value: 'card', label: 'Credit/Debit Card' },
    { value: 'cash', label: 'Cash' },
    { value: 'cheque', label: 'Cheque' }
  ];

  const paymentTypes = [
    { value: 'rent', label: 'Monthly Rent' },
    { value: 'deposit', label: 'Security Deposit' },
    { value: 'utilities', label: 'Utilities' },
    { value: 'maintenance', label: 'Maintenance Fee' },
    { value: 'fees', label: 'Late Fees/Penalties' },
    { value: 'other', label: 'Other' }
  ];

  if (session?.user?.role !== 'tenant') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">This page is only accessible to tenants.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading payment information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/tenant/payments"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Payments
          </Link>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
              <CreditCard className="w-8 h-8 mr-3 text-blue-600" />
              Make Payment
            </h1>
            <p className="text-gray-600">
              Submit a payment for your rental
            </p>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-400 mr-3" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Payment Details */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                    Payment Details
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Amount ($) *
                      </label>
                      <input
                        type="number"
                        name="amount"
                        value={formData.amount}
                        onChange={handleInputChange}
                        step="0.01"
                        min="0"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.amount ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="1500.00"
                      />
                      {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount}</p>}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Type *
                      </label>
                      <select
                        name="paymentType"
                        value={formData.paymentType}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {paymentTypes.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Method *
                      </label>
                      <select
                        name="paymentMethod"
                        value={formData.paymentMethod}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.paymentMethod ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        {paymentMethods.map(method => (
                          <option key={method.value} value={method.value}>
                            {method.label}
                          </option>
                        ))}
                      </select>
                      {errors.paymentMethod && <p className="text-red-500 text-sm mt-1">{errors.paymentMethod}</p>}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Reference *
                      </label>
                      <input
                        type="text"
                        name="reference"
                        value={formData.reference}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.reference ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Transaction ID, cheque number, etc."
                      />
                      {errors.reference && <p className="text-red-500 text-sm mt-1">{errors.reference}</p>}
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description / Notes (Optional)
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Additional notes about this payment..."
                    />
                  </div>
                </div>

                {/* Receipt Upload */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Upload className="w-5 h-5 mr-2 text-purple-600" />
                    Payment Proof (Optional)
                  </h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload Receipt or Payment Proof
                    </label>
                    <input
                      type="file"
                      id="receiptFile"
                      name="receiptFile"
                      onChange={handleInputChange}
                      accept="image/*,.pdf"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Accepted formats: Images (JPG, PNG) or PDF files
                    </p>
                    
                    {/* File Preview */}
                    {formData.receiptFile && (
                      <div className="mt-3 p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <FileText className="w-4 h-4 text-gray-500 mr-2" />
                            <span className="text-sm text-gray-700">{formData.receiptFile.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={removeReceiptFile}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        
                        {receiptPreview && (
                          <div className="mt-2">
                            <img 
                              src={receiptPreview} 
                              alt="Receipt preview" 
                              className="max-w-xs max-h-32 object-contain border rounded"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <Link
                    href="/tenant/payments"
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Receipt className="w-4 h-4 mr-2" />
                        Submit Payment
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Property Information */}
            {tenantData?.property && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Building className="w-5 h-5 mr-2 text-blue-600" />
                  Your Property
                </h3>
                
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-600">Address</p>
                    <p className="font-medium text-gray-900">{tenantData.property.address}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Property Type</p>
                    <p className="font-medium text-gray-900">{tenantData.property.type}</p>
                  </div>
                  {tenantData.lease?.monthlyRent && (
                    <div>
                      <p className="text-gray-600">Monthly Rent</p>
                      <p className="font-medium text-gray-900">${tenantData.lease.monthlyRent.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Upcoming Payments */}
            {upcomingPayments.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-orange-600" />
                  Upcoming Payments
                </h3>
                
                <div className="space-y-3">
                  {upcomingPayments.slice(0, 3).map((payment, index) => (
                    <div key={index} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-orange-900">{payment.type}</p>
                          <p className="text-sm text-orange-700">
                            Due: {new Date(payment.dueDate).toLocaleDateString()}
                          </p>
                        </div>
                        <p className="font-bold text-orange-900">${payment.amount}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Guidelines */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Info className="w-5 h-5 mr-2 text-blue-600" />
                Payment Guidelines
              </h3>
              
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <p>All payments will be reviewed by management</p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <p>Upload proof of payment for faster processing</p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <p>Use a clear reference number for tracking</p>
                </div>
                <div className="flex items-start">
                  <Clock className="w-4 h-4 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                  <p>Processing typically takes 1-2 business days</p>
                </div>
              </div>
            </div>

            {/* Quick Amounts */}
            {tenantData?.lease?.monthlyRent && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Amounts</h3>
                
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, amount: tenantData.lease.monthlyRent.toString(), paymentType: 'rent' }))}
                    className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <div className="font-medium text-gray-900">Monthly Rent</div>
                    <div className="text-sm text-gray-600">${tenantData.lease.monthlyRent.toLocaleString()}</div>
                  </button>
                  
                  {tenantData.balanceDue > 0 && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, amount: tenantData.balanceDue.toString(), paymentType: 'rent' }))}
                      className="w-full text-left p-3 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <div className="font-medium text-red-900">Outstanding Balance</div>
                      <div className="text-sm text-red-700">${tenantData.balanceDue.toLocaleString()}</div>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}