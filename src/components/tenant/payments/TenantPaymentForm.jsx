// components/tenant/payments/TenantPaymentForm.jsx - Tenant-specific payment form
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  Smartphone,
  DollarSign,
  Home,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  Info,
  Shield,
  ArrowRight,
  Receipt
} from 'lucide-react';
import { formatCurrency } from 'utils/currency';
import { getCurrentDate } from 'utils/date';
import MoMoPaymentForm from '@/components/payments/MoMoPaymentForm';

export default function TenantPaymentForm({ lease, tenant }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('mobile_money');
  const [showMoMoForm, setShowMoMoForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentType, setPaymentType] = useState('rent');
  const [errors, setErrors] = useState({});

  // Calculate payment amounts
  const monthlyRent = lease.monthlyRent || 0;
  const balanceDue = lease.balanceDue || 0;
  const firstPaymentRequired = lease.firstPaymentRequired || (lease.securityDeposit + monthlyRent);
  const isFirstPayment = !lease.firstPaymentMade && lease.status === 'signed';
  
  // Set default payment amount based on lease status
  useEffect(() => {
    if (isFirstPayment) {
      setPaymentAmount(firstPaymentRequired.toString());
      setPaymentType('first_payment');
    } else if (balanceDue > 0) {
      setPaymentAmount(balanceDue.toString());
      setPaymentType('rent');
    } else {
      setPaymentAmount(monthlyRent.toString());
      setPaymentType('rent');
    }
  }, [isFirstPayment, firstPaymentRequired, balanceDue, monthlyRent]);

  const paymentMethods = [
    {
      value: 'mobile_money',
      label: 'MTN Mobile Money',
      icon: <Smartphone className="w-5 h-5" />,
      color: 'text-orange-600',
      description: 'Pay instantly with your MTN MoMo wallet',
      fees: 'Standard MoMo fees apply',
      recommended: true
    },
    {
      value: 'bank_transfer',
      label: 'Bank Transfer',
      icon: <CreditCard className="w-5 h-5" />,
      color: 'text-blue-600',
      description: 'Transfer directly from your bank account',
      fees: 'Bank transfer fees may apply',
      recommended: false
    },
    {
      value: 'card',
      label: 'Debit/Credit Card',
      icon: <CreditCard className="w-5 h-5" />,
      color: 'text-purple-600',
      description: 'Pay with your Visa or Mastercard',
      fees: '2.5% processing fee',
      recommended: false
    }
  ];

  const paymentTypeOptions = [
    { 
      value: 'first_payment', 
      label: 'First Payment (Deposit + Rent)', 
      disabled: !isFirstPayment,
      amount: firstPaymentRequired
    },
    { 
      value: 'rent', 
      label: 'Monthly Rent Payment', 
      disabled: false,
      amount: monthlyRent
    },
    { 
      value: 'partial', 
      label: 'Partial Payment', 
      disabled: false,
      amount: null
    }
  ];

  const validateForm = () => {
    const newErrors = {};

    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      newErrors.amount = 'Please enter a valid payment amount';
    }

    if (parseFloat(paymentAmount) > 50000) {
      newErrors.amount = 'Payment amount cannot exceed ZMW 50,000 per transaction';
    }

    if (paymentType === 'first_payment' && parseFloat(paymentAmount) < firstPaymentRequired) {
      newErrors.amount = `First payment must be at least ${formatCurrency(firstPaymentRequired)}`;
    }

    if (!paymentMethod) {
      newErrors.paymentMethod = 'Please select a payment method';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePaymentTypeChange = (type) => {
    setPaymentType(type);
    const option = paymentTypeOptions.find(opt => opt.value === type);
    if (option && option.amount) {
      setPaymentAmount(option.amount.toString());
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    // For MoMo payments, show the MoMo form
    if (paymentMethod === 'mobile_money') {
      setShowMoMoForm(true);
      return;
    }

    // For other payment methods, redirect to payment processing
    setLoading(true);
    try {
      const paymentData = {
        leaseId: lease._id,
        amount: parseFloat(paymentAmount),
        paymentMethod,
        paymentType,
        tenantId: tenant.id
      };

      // For now, redirect to a payment processing page
      // In production, this would integrate with actual payment gateways
      router.push(`/tenant/payments/process?data=${encodeURIComponent(JSON.stringify(paymentData))}`);
    } catch (error) {
      console.error('Payment initiation error:', error);
      setErrors({ submit: 'Failed to initiate payment. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleMoMoSuccess = (paymentData) => {
    router.push(`/tenant/payments/success?paymentId=${paymentData.id}`);
  };

  const handleMoMoCancel = () => {
    setShowMoMoForm(false);
  };

  // Calculate next payment due date
  const getNextPaymentInfo = () => {
    if (isFirstPayment) {
      return {
        type: 'First Payment',
        description: 'Security deposit + First month rent',
        dueDate: 'Due now to activate lease'
      };
    }

    if (lease.nextPaymentDue) {
      const dueDate = new Date(lease.nextPaymentDue);
      const today = new Date();
      const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      
      return {
        type: 'Monthly Rent',
        description: `Payment for ${dueDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        dueDate: daysUntilDue <= 0 ? 'Overdue' : `Due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}`
      };
    }

    return {
      type: 'Monthly Rent',
      description: 'Current month payment',
      dueDate: 'Due now'
    };
  };

  const nextPaymentInfo = getNextPaymentInfo();

  // Show MoMo form if selected
  if (showMoMoForm) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <button
              onClick={handleMoMoCancel}
              className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
            >
              ← Back to Payment Options
            </button>
            <div className="bg-white rounded-lg shadow p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
                <Smartphone className="w-6 h-6 mr-3 text-orange-600" />
                MTN Mobile Money Payment
              </h1>
              <p className="text-gray-600">Complete your rent payment securely</p>
            </div>
          </div>

          <MoMoPaymentForm
            lease={lease}
            paymentAmount={parseFloat(paymentAmount)}
            paymentType={paymentType}
            onSuccess={handleMoMoSuccess}
            onCancel={handleMoMoCancel}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
              <CreditCard className="w-8 h-8 mr-3 text-blue-600" />
              Make Payment
            </h1>
            <p className="text-gray-600">Pay your rent securely and conveniently</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Payment Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Lease Summary */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Home className="w-5 h-5 mr-2 text-blue-600" />
                Property & Lease Details
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-gray-700">Property Address</h3>
                  <p className="text-gray-900">{lease.propertyId?.address || 'Property Address'}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700">Monthly Rent</h3>
                  <p className="text-gray-900 font-semibold">{formatCurrency(monthlyRent)}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700">Lease Status</h3>
                  <p className={`font-medium capitalize ${
                    lease.status === 'active' ? 'text-green-600' : 
                    lease.status === 'signed' ? 'text-yellow-600' : 'text-gray-600'
                  }`}>
                    {lease.status}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700">Current Balance</h3>
                  <p className={`font-semibold ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(balanceDue)}
                  </p>
                </div>
              </div>

              {/* Payment Due Alert */}
              {(isFirstPayment || balanceDue > 0) && (
                <div className={`mt-4 p-4 rounded-lg border ${
                  isFirstPayment 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <div className="flex items-start">
                    {isFirstPayment ? (
                      <Info className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                    )}
                    <div>
                      <h4 className={`font-medium ${
                        isFirstPayment ? 'text-blue-900' : 'text-yellow-900'
                      }`}>
                        {nextPaymentInfo.type} Required
                      </h4>
                      <p className={`text-sm ${
                        isFirstPayment ? 'text-blue-800' : 'text-yellow-800'
                      }`}>
                        {nextPaymentInfo.description} - {nextPaymentInfo.dueDate}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Type Selection */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Receipt className="w-5 h-5 mr-2 text-green-600" />
                Payment Type
              </h2>

              <div className="space-y-3">
                {paymentTypeOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all ${
                      option.disabled 
                        ? 'opacity-50 cursor-not-allowed bg-gray-50' 
                        : paymentType === option.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center">
                      <input
                        type="radio"
                        name="paymentType"
                        value={option.value}
                        checked={paymentType === option.value}
                        onChange={(e) => handlePaymentTypeChange(e.target.value)}
                        disabled={option.disabled}
                        className="mr-3"
                      />
                      <div>
                        <span className="font-medium text-gray-900">{option.label}</span>
                        {option.amount && (
                          <p className="text-sm text-gray-600">{formatCurrency(option.amount)}</p>
                        )}
                      </div>
                    </div>
                    {paymentType === option.value && !option.disabled && (
                      <CheckCircle className="w-5 h-5 text-blue-500" />
                    )}
                  </label>
                ))}
              </div>

              {/* Custom Amount Input */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Amount (ZMW)
                </label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  step="5"
                  min="5"
                  max="50000"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-medium ${
                    errors.amount ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter amount"
                />
                {errors.amount && (
                  <p className="text-red-500 text-sm mt-1">{errors.amount}</p>
                )}
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <CreditCard className="w-5 h-5 mr-2 text-purple-600" />
                Payment Method
              </h2>

              <div className="space-y-4">
                {paymentMethods.map((method) => (
                  <label
                    key={method.value}
                    className={`relative flex items-start p-4 border rounded-lg cursor-pointer transition-all ${
                      paymentMethod === method.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.value}
                      checked={paymentMethod === method.value}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mt-1 mr-4"
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <span className={`${method.color} mr-2`}>{method.icon}</span>
                          <span className="font-medium text-gray-900">{method.label}</span>
                          {method.recommended && (
                            <span className="ml-2 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                              Recommended
                            </span>
                          )}
                        </div>
                        {paymentMethod === method.value && (
                          <CheckCircle className="w-5 h-5 text-blue-500" />
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-1">{method.description}</p>
                      <p className="text-xs text-gray-500">{method.fees}</p>
                    </div>
                  </label>
                ))}
              </div>

              {errors.paymentMethod && (
                <p className="text-red-500 text-sm mt-2">{errors.paymentMethod}</p>
              )}
            </div>

            {/* Submit Button */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              {errors.submit && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm">{errors.submit}</p>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading || !paymentAmount || parseFloat(paymentAmount) <= 0}
                className="w-full py-4 px-6 bg-blue-600 text-white rounded-lg font-medium text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Clock className="w-5 h-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-5 h-5 mr-2" />
                    Continue to Payment
                  </>
                )}
              </button>

              <p className="text-center text-sm text-gray-500 mt-3">
                Your payment will be processed securely. You'll receive a confirmation once completed.
              </p>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Payment Summary */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Summary</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Amount:</span>
                  <span className="font-semibold text-lg text-gray-900">
                    {paymentAmount ? formatCurrency(parseFloat(paymentAmount)) : formatCurrency(0)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Method:</span>
                  <span className="font-medium">
                    {paymentMethods.find(m => m.value === paymentMethod)?.label || 'None selected'}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium">
                    {paymentTypeOptions.find(t => t.value === paymentType)?.label || 'None selected'}
                  </span>
                </div>
                
                <hr className="my-3" />
                
                <div className="flex justify-between text-lg">
                  <span className="font-semibold text-gray-900">Total:</span>
                  <span className="font-bold text-blue-600">
                    {paymentAmount ? formatCurrency(parseFloat(paymentAmount)) : formatCurrency(0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Shield className="w-5 h-5 mr-2 text-green-600" />
                Secure Payment
              </h3>
              
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <p>256-bit SSL encryption protects your payment data</p>
                </div>
                
                <div className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <p>Your payment information is never stored on our servers</p>
                </div>
                
                <div className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <p>Instant receipt and confirmation via email/SMS</p>
                </div>
                
                <div className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <p>24/7 customer support for payment issues</p>
                </div>
              </div>
            </div>

            {/* Payment Help */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Need Help?</h3>
              
              <div className="space-y-3 text-sm">
                <div>
                  <h4 className="font-medium text-gray-700">Payment Issues</h4>
                  <p className="text-gray-600">Contact support: +260 XXX XXX XXX</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-700">MoMo Problems</h4>
                  <p className="text-gray-600">Ensure sufficient balance and active line</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-700">Landlord Contact</h4>
                  <p className="text-gray-600">{lease.landlordId?.email || 'Contact via platform'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}