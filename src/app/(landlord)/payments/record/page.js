// src/app/payments/record/page.js
'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  DollarSign, 
  Calendar, 
  User, 
  Home, 
  CreditCard,
  Receipt,
  AlertCircle,
  CheckCircle,
  Upload,
  X
} from 'lucide-react';
import { getCurrentDate, formatDate } from 'utils/date';
import { formatCurrency } from 'utils/currency';

export default function RecordPaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get lease ID from URL params if provided
  const leaseId = searchParams.get('leaseId');
  
  const [formData, setFormData] = useState({
    leaseId: leaseId || '',
    amount: '',
    paymentDate: getCurrentDate(),
    paymentMethod: 'bank_transfer',
    reference: '',
    description: '',
    receiptFile: null,
    status: 'pending'
  });
  
  const [leases, setLeases] = useState([]);
  const [selectedLease, setSelectedLease] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [receiptPreview, setReceiptPreview] = useState(null);

  // Fetch active leases
  useEffect(() => {
    const fetchLeases = async () => {
      setDataLoading(true);
      try {
        const response = await fetch('/api/leases?status=active');
        if (response.ok) {
          const responseText = await response.text();
          if (responseText) {
            const leasesData = JSON.parse(responseText);
            const leasesArray = Array.isArray(leasesData) ? leasesData : leasesData.data || [];
            setLeases(leasesArray);
            
            // If leaseId provided, find and set the selected lease
            if (leaseId && leasesArray.length > 0) {
              const lease = leasesArray.find(l => l._id === leaseId);
              if (lease) {
                setSelectedLease(lease);
                setFormData(prev => ({ ...prev, amount: lease.monthlyRent.toString() }));
              }
            }
          } else {
            setLeases([]);
          }
        } else {
          console.error('Failed to fetch leases');
          setLeases([]);
        }
      } catch (error) {
        console.error('Error fetching leases:', error);
        setLeases([]);
      } finally {
        setDataLoading(false);
      }
    };

    fetchLeases();
  }, [leaseId]);

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
      } else if (file) {
        setReceiptPreview(null);
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
      
      // If lease is selected, update selected lease info
      if (name === 'leaseId' && value) {
        const lease = leases.find(l => l._id === value);
        setSelectedLease(lease);
        if (lease && !formData.amount) {
          setFormData(prev => ({ ...prev, amount: lease.monthlyRent.toString() }));
        }
      }
    }
  };

  const removeReceiptFile = () => {
    setFormData(prev => ({ ...prev, receiptFile: null }));
    setReceiptPreview(null);
    // Reset file input
    const fileInput = document.getElementById('receiptFile');
    if (fileInput) fileInput.value = '';
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.leaseId) newErrors.leaseId = 'Please select a lease';
    if (!formData.amount || parseFloat(formData.amount) <= 0) newErrors.amount = 'Valid payment amount is required';
    if (!formData.paymentDate) newErrors.paymentDate = 'Payment date is required';
    if (!formData.paymentMethod) newErrors.paymentMethod = 'Payment method is required';
    if (!formData.reference.trim()) newErrors.reference = 'Payment reference is required';
    
    // Validate payment date is not in the future
    const paymentDate = new Date(formData.paymentDate);
    const today = new Date();
    if (paymentDate > today) {
      newErrors.paymentDate = 'Payment date cannot be in the future';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      // Create FormData for file upload
      const submitData = new FormData();
      
      // Add form fields
      submitData.append('leaseId', formData.leaseId);
      submitData.append('amount', parseFloat(formData.amount));
      submitData.append('paymentDate', formData.paymentDate);
      submitData.append('paymentMethod', formData.paymentMethod);
      submitData.append('reference', formData.reference);
      submitData.append('description', formData.description);
      submitData.append('status', formData.status);
      
      // Add file if provided
      if (formData.receiptFile) {
        submitData.append('receiptFile', formData.receiptFile);
      }
      
      const response = await fetch('/api/payments', {
        method: 'POST',
        body: submitData
      });
      
      if (response.ok) {
        const result = await response.json();
        alert('Payment recorded successfully!');
        router.push(`/payments/${result._id}`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to record payment');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      alert(`Failed to record payment: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const paymentMethods = [
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'mobile_money', label: 'Mobile Money (MTN/Airtel)' },
    { value: 'cash', label: 'Cash' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'card', label: 'Card Payment' },
    { value: 'other', label: 'Other' }
  ];

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading leases...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href="/payments" 
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Payments
          </Link>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
              <Receipt className="w-6 h-6 mr-3 text-blue-600" />
              Record New Payment
            </h1>
            <p className="text-gray-600">
              Record a payment received from a tenant for their lease
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Lease Selection */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Home className="w-5 h-5 mr-2 text-blue-600" />
                    Lease Selection
                  </h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Lease *
                    </label>
                    <select
                      name="leaseId"
                      value={formData.leaseId}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.leaseId ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Choose a lease...</option>
                      {leases.map(lease => (
                        <option key={lease._id} value={lease._id}>
                          {lease.propertyId?.address || 'Unknown Property'} - {lease.tenantId?.name || lease.tenantId?.firstName + ' ' + lease.tenantId?.lastName || 'Unknown Tenant'}
                        </option>
                      ))}
                    </select>
                    {errors.leaseId && <p className="text-red-500 text-sm mt-1">{errors.leaseId}</p>}
                  </div>

                  {/* Selected Lease Info */}
                  {selectedLease && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-md">
                      <h4 className="font-medium text-blue-900 mb-2">Selected Lease Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-blue-700 font-medium">Property:</span>
                          <p className="text-blue-800">{selectedLease.propertyId?.address}</p>
                        </div>
                        <div>
                          <span className="text-blue-700 font-medium">Tenant:</span>
                          <p className="text-blue-800">
                            {selectedLease.tenantId?.name || 
                             `${selectedLease.tenantId?.firstName} ${selectedLease.tenantId?.lastName}`}
                          </p>
                        </div>
                        <div>
                          <span className="text-blue-700 font-medium">Monthly Rent:</span>
                          <p className="text-blue-800">{formatCurrency(selectedLease.monthlyRent)}</p>
                        </div>
                        <div>
                          <span className="text-blue-700 font-medium">Balance Due:</span>
                          <p className="text-blue-800">{formatCurrency(selectedLease.balanceDue || 0)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Payment Details */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                    Payment Details
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Amount (ZMW) *
                      </label>
                      <input
                        type="number"
                        name="amount"
                        value={formData.amount}
                        onChange={handleInputChange}
                        step="0.01"
                        min="0"
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.amount ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="1500.00"
                      />
                      {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount}</p>}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Date *
                      </label>
                      <input
                        type="date"
                        name="paymentDate"
                        value={formData.paymentDate}
                        onChange={handleInputChange}
                        max={getCurrentDate()}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.paymentDate ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.paymentDate && <p className="text-red-500 text-sm mt-1">{errors.paymentDate}</p>}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Method *
                      </label>
                      <select
                        name="paymentMethod"
                        value={formData.paymentMethod}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Reference *
                      </label>
                      <input
                        type="text"
                        name="reference"
                        value={formData.reference}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.reference ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Transaction ID, cheque number, etc."
                      />
                      {errors.reference && <p className="text-red-500 text-sm mt-1">{errors.reference}</p>}
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description / Notes
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Additional notes about this payment..."
                    />
                  </div>
                </div>

                {/* Receipt Upload */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Upload className="w-5 h-5 mr-2 text-purple-600" />
                    Receipt/Proof (Optional)
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Accepted formats: Images (JPG, PNG) or PDF files
                    </p>
                    
                    {/* File Preview */}
                    {formData.receiptFile && (
                      <div className="mt-3 p-3 border border-gray-200 rounded-md">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <CreditCard className="w-4 h-4 text-gray-500 mr-2" />
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

                {/* Submit Buttons */}
                <div className="flex justify-end space-x-4 pt-6 border-t">
                  <Link
                    href="/payments"
                    className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Recording Payment...' : 'Record Payment'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Payment Status */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2 text-yellow-600" />
                Payment Status
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="pending"
                    name="status"
                    value="pending"
                    checked={formData.status === 'pending'}
                    onChange={handleInputChange}
                    className="text-blue-600"
                  />
                  <label htmlFor="pending" className="text-sm text-gray-700">
                    Pending Verification
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="verified"
                    name="status"
                    value="verified"
                    checked={formData.status === 'verified'}
                    onChange={handleInputChange}
                    className="text-blue-600"
                  />
                  <label htmlFor="verified" className="text-sm text-gray-700">
                    Verified/Approved
                  </label>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-yellow-50 rounded-md">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Payments marked as Pending will require manual verification before being applied to the lease balance.
                </p>
              </div>
            </div>

            {/* Quick Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Info</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Todays Date:</span>
                  <span className="font-medium">{formatDate(getCurrentDate())}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Currency:</span>
                  <span className="font-medium">Zambian Kwacha (ZMW)</span>
                </div>
                
                {selectedLease && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Expected Rent:</span>
                      <span className="font-medium">{formatCurrency(selectedLease.monthlyRent)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Current Balance:</span>
                      <span className="font-medium text-red-600">{formatCurrency(selectedLease.balanceDue || 0)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}