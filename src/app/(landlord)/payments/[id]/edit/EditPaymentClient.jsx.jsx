'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Save, 
  X,
  AlertTriangle,
  Upload,
  Eye,
  Trash2,
  Calendar,
  DollarSign,
  CreditCard,
  FileText,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { formatDate, getCurrentDate } from 'utils/date';

export default function EditPaymentClient({ payment }) {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    amount: payment.amount?.toString() || '',
    paymentDate: payment.paymentDate ? formatDate(payment.paymentDate, 'input') : '',
    paymentMethod: payment.paymentMethod || 'bank_transfer',
    reference: payment.reference || '',
    description: payment.description || '',
    status: payment.status || 'pending',
    receiptFile: null
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [removeExistingReceipt, setRemoveExistingReceipt] = useState(false);

  // Format date for input field (YYYY-MM-DD)
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  // Initialize form with existing payment data
  useEffect(() => {
    setFormData({
      amount: payment.amount?.toString() || '',
      paymentDate: formatDateForInput(payment.paymentDate),
      paymentMethod: payment.paymentMethod || 'bank_transfer',
      reference: payment.reference || '',
      description: payment.description || '',
      status: payment.status || 'pending',
      receiptFile: null
    });
  }, [payment]);

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
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Valid payment amount is required';
    }
    if (!formData.paymentDate) {
      newErrors.paymentDate = 'Payment date is required';
    }
    if (!formData.paymentMethod) {
      newErrors.paymentMethod = 'Payment method is required';
    }
    if (!formData.reference.trim()) {
      newErrors.reference = 'Payment reference is required';
    }
    
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
      submitData.append('id', payment._id);
      submitData.append('amount', parseFloat(formData.amount));
      submitData.append('paymentDate', formData.paymentDate);
      submitData.append('paymentMethod', formData.paymentMethod);
      submitData.append('reference', formData.reference);
      submitData.append('description', formData.description);
      submitData.append('status', formData.status);
      submitData.append('removeExistingReceipt', removeExistingReceipt);
      
      // Add file if provided
      if (formData.receiptFile) {
        submitData.append('receiptFile', formData.receiptFile);
      }
      
      const response = await fetch('/api/payments', {
        method: 'PUT',
        body: submitData
      });
      
      if (response.ok) {
        const result = await response.json();
        alert('Payment updated successfully!');
        router.push(`/payments/${result._id}`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update payment');
      }
    } catch (error) {
      console.error('Error updating payment:', error);
      alert(`Failed to update payment: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch(`/api/payments?id=${payment._id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        alert('Payment cancelled successfully!');
        router.push('/payments');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel payment');
      }
    } catch (error) {
      console.error('Error cancelling payment:', error);
      alert(`Failed to cancel payment: ${error.message}`);
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
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

  const statusOptions = [
    { value: 'pending', label: 'Pending Verification', icon: <Clock className="w-4 h-4" />, color: 'text-yellow-600' },
    { value: 'verified', label: 'Verified/Approved', icon: <CheckCircle className="w-4 h-4" />, color: 'text-green-600' },
    { value: 'disputed', label: 'Disputed', icon: <AlertTriangle className="w-4 h-4" />, color: 'text-red-600' },
    { value: 'cancelled', label: 'Cancelled', icon: <XCircle className="w-4 h-4" />, color: 'text-gray-600' }
  ];

  const propertyName = payment.propertyId?.address || payment.propertyId?.name || 'Unknown Property';
  const tenantName = payment.tenantId?.name || 
    `${payment.tenantId?.firstName} ${payment.tenantId?.lastName}` || 
    'Unknown Tenant';

  const canEdit = payment.status !== 'cancelled';
  const isVerified = payment.status === 'verified';

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href={`/payments/${payment._id}`}
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Payment Details
          </Link>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
              <FileText className="w-6 h-6 mr-3 text-blue-600" />
              Edit Payment
            </h1>
            <p className="text-gray-600">
              Reference: <span className="font-mono font-medium">{payment.reference}</span>
            </p>
            <p className="text-gray-600">
              {propertyName} - {tenantName}
            </p>
            
            {!canEdit && (
              <div className="mt-4 p-3 bg-gray-100 border border-gray-300 rounded-md">
                <p className="text-sm text-gray-700 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2 text-gray-500" />
                  This payment cannot be edited because it has been cancelled.
                </p>
              </div>
            )}
            
            {isVerified && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2 text-yellow-600" />
                  This payment has been verified. Changes may affect the lease balance.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
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
                        disabled={!canEdit}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.amount ? 'border-red-500' : 'border-gray-300'
                        } ${!canEdit ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
                        disabled={!canEdit}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.paymentDate ? 'border-red-500' : 'border-gray-300'
                        } ${!canEdit ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
                        disabled={!canEdit}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.paymentMethod ? 'border-red-500' : 'border-gray-300'
                        } ${!canEdit ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
                        disabled={!canEdit}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.reference ? 'border-red-500' : 'border-gray-300'
                        } ${!canEdit ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
                      disabled={!canEdit}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        !canEdit ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                      placeholder="Additional notes about this payment..."
                    />
                  </div>
                </div>

                {/* Status Selection */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Status</h3>
                  
                  <div className="space-y-3">
                    {statusOptions.map(status => (
                      <div key={status.value} className="flex items-center space-x-3">
                        <input
                          type="radio"
                          id={status.value}
                          name="status"
                          value={status.value}
                          checked={formData.status === status.value}
                          onChange={handleInputChange}
                          disabled={!canEdit}
                          className="text-blue-600"
                        />
                        <label htmlFor={status.value} className={`flex items-center text-sm ${status.color} ${!canEdit ? 'opacity-50' : ''}`}>
                          {status.icon}
                          <span className="ml-2">{status.label}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Receipt Upload */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Upload className="w-5 h-5 mr-2 text-purple-600" />
                    Receipt/Proof
                  </h3>
                  
                  {/* Existing Receipt */}
                  {payment.receiptUrl && !removeExistingReceipt && (
                    <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <FileText className="w-5 h-5 text-gray-500 mr-3" />
                          <div>
                            <p className="font-medium text-gray-900">Current Receipt</p>
                            <p className="text-sm text-gray-500">Uploaded receipt file</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => window.open(payment.receiptUrl, '_blank')}
                            className="inline-flex items-center px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </button>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => setRemoveExistingReceipt(true)}
                              className="inline-flex items-center px-3 py-2 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Upload New Receipt */}
                  {canEdit && (removeExistingReceipt || !payment.receiptUrl) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {payment.receiptUrl ? 'Replace Receipt' : 'Upload Receipt or Payment Proof'}
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
                      
                      {/* New File Preview */}
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
                      
                      {removeExistingReceipt && !formData.receiptFile && (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                          <p className="text-sm text-yellow-800">
                            Current receipt will be removed. Upload a new file or cancel to keep the existing receipt.
                          </p>
                          <button
                            type="button"
                            onClick={() => setRemoveExistingReceipt(false)}
                            className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                          >
                            Keep existing receipt
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Submit Buttons */}
                {canEdit && (
                  <div className="flex justify-between items-center pt-6 border-t">
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={loading}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        showDeleteConfirm 
                          ? 'bg-red-600 text-white hover:bg-red-700' 
                          : 'border border-red-300 text-red-700 hover:bg-red-50'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {showDeleteConfirm ? 'Confirm Cancel Payment' : 'Cancel Payment'}
                    </button>
                    
                    <div className="flex space-x-3">
                      <Link
                        href={`/payments/${payment._id}`}
                        className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </Link>
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {loading ? 'Updating...' : 'Update Payment'}
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Original Payment Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Original Payment</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium">ZMW {payment.amount?.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">{formatDate(payment.paymentDate)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Method:</span>
                  <span className="font-medium">{paymentMethods.find(m => m.value === payment.paymentMethod)?.label}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-medium capitalize">{payment.status}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Created:</span>
                  <span className="font-medium">{formatDate(payment.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Edit Guidelines */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Guidelines</h3>
              
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                  <p>Changing verified payments may affect lease balance calculations.</p>
                </div>
                
                <div className="flex items-start">
                  <Calendar className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                  <p>Payment date cannot be set to a future date.</p>
                </div>
                
                <div className="flex items-start">
                  <FileText className="w-4 h-4 text-purple-500 mr-2 mt-0.5 flex-shrink-0" />
                  <p>Uploading a new receipt will replace the existing one.</p>
                </div>
                
                <div className="flex items-start">
                  <Trash2 className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <p>Cancelling a payment will reverse any balance changes.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}