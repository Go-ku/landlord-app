// components/payments/MoMoPaymentForm.js - Updated with enhanced features
"use client";
import { useState, useEffect, useRef } from "react";
import {
  Smartphone,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader,
  Phone,
  Shield,
  Info,
  RefreshCw,
  Copy,
  ArrowLeft,
} from "lucide-react";
import { formatCurrency } from "utils/currency";

export default function MoMoPaymentForm({
  lease,
  paymentAmount: initialAmount,
  paymentType: initialPaymentType = "rent",
  onSuccess,
  onCancel,
}) {
  const [formData, setFormData] = useState({
    phoneNumber: "",
    amount: initialAmount?.toString() || lease?.monthlyRent?.toString() || "",
    paymentType: initialPaymentType,
  });

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("form"); // form, processing, success, failed, timeout
  const [paymentData, setPaymentData] = useState(null);
  const [errors, setErrors] = useState({});
  const [statusCheckInterval, setStatusCheckInterval] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes
  const [retryCount, setRetryCount] = useState(0);
  const [copiedReference, setCopiedReference] = useState(false);
const intervalRef = useRef(null);
const timerRef = useRef(null);

  const paymentTypes = [
    {
      value: "first_payment",
      label: "First Payment (Deposit + Rent)",
      description: "Security deposit and first month rent",
      disabled: lease?.firstPaymentMade || lease?.status !== "signed",
    },
    {
      value: "rent",
      label: "Monthly Rent Payment",
      description: "Regular monthly rent payment",
      disabled: false,
    },
    {
      value: "partial",
      label: "Partial Payment",
      description: "Pay part of outstanding balance",
      disabled: false,
    },
  ];

  // Update amount when payment type changes
  useEffect(() => {
    if (
      formData.paymentType === "first_payment" &&
      lease?.firstPaymentRequired
    ) {
      setFormData((prev) => ({
        ...prev,
        amount: lease.firstPaymentRequired.toString(),
      }));
    } else if (formData.paymentType === "rent" && lease?.monthlyRent) {
      setFormData((prev) => ({
        ...prev,
        amount: lease.monthlyRent.toString(),
      }));
    }
  }, [formData.paymentType, lease]);

  // Countdown timer for payment processing
  useEffect(() => {
  if (step === "processing" && timeRemaining > 0) {
    timerRef.current = setTimeout(() => {
      setTimeRemaining((prev) => prev - 1);
    }, 1000);
  } else if (step === "processing" && timeRemaining === 0) {
    setStep("timeout");
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  return () => clearTimeout(timerRef.current);
}, [step, timeRemaining]);



  const validateForm = () => {
    const newErrors = {};

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = "Phone number is required";
    } else if (
      !validateZambianPhone(formData.cleanPhoneNumber || formData.phoneNumber)
    ) {
      newErrors.phoneNumber =
        "Please enter a valid MTN number (096xxxxxxx or 076xxxxxxx)";
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = "Valid payment amount is required";
    } else if (parseFloat(formData.amount) < 5) {
      newErrors.amount = "Minimum payment amount is ZMW 5";
    } else if (parseFloat(formData.amount) > 50000) {
      newErrors.amount = "Maximum payment amount is ZMW 50,000";
    }

    // Validate first payment amount
    if (
      formData.paymentType === "first_payment" &&
      lease?.firstPaymentRequired
    ) {
      if (parseFloat(formData.amount) < lease.firstPaymentRequired) {
        newErrors.amount = `First payment must be at least ${formatCurrency(lease.firstPaymentRequired)}`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateZambianPhone = (phone) => {
    // MTN Zambia numbers: 097, 076
    const zambianPhoneRegex = /^(\+260|260)?[79]\d{8}$/;
    return zambianPhoneRegex.test(phone);
  };

  const formatPhoneInput = (value) => {
    // Remove all non-digits
    // Remove any spaces, dashes, or other characters
    let cleaned = value.replace(/\D/g, '');
    
    // If it starts with +260 or 260, remove the country code
    if (cleaned.startsWith('260')) {
      cleaned = cleaned.substring(3);
    }
    
    // Add 260 country code
    return `260${cleaned}`;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "phoneNumber") {
      const formatted = formatPhoneInput(value);
      setFormData((prev) => ({ ...prev, [name]: formatted }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const checkPaymentStatus = async (referenceId) => {
  try {
    const response = await fetch(`/api/payments/momo/status/${referenceId}`);
    if (!response.ok) throw new Error("Status check failed");

    const result = await response.json();
    const { momoStatus, payment } = result.data || {};

    if (momoStatus === "COMPLETED" || momoStatus === "SUCCESSFUL") {
      setStep("success");
      setPaymentData((prev) => ({ ...prev, ...payment }));
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    } else if (momoStatus === "FAILED" || momoStatus === "CANCELLED") {
      setStep("failed");
      setErrors({ submit: result.message || "Payment failed or cancelled" });
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  } catch (err) {
    console.error("Polling error:", err);
  }
};

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setStep("processing");
    setTimeRemaining(300); // Reset timer

    try {
      const response = await fetch("/api/tenant/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leaseId: lease._id,
          amount: parseFloat(formData.amount),
          paymentMethod: "mobile_money",
          paymentType: formData.paymentType,
          momoPhoneNumber:
            formData.cleanPhoneNumber ||
            formData.phoneNumber.replace(/\D/g, ""), // Send clean number
          momoTransactionId: `MOMO_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setPaymentData({
          ...result.payment,
          momoReferenceId: result.payment.referenceNumber,
          phoneNumber: formData.phoneNumber,
          amount: parseFloat(formData.amount),
        });

        // Start checking payment status every 3 seconds
       intervalRef.current = setInterval(() => {
  checkPaymentStatus(result.payment.referenceNumber);
}, 3000);
        
      } else {
        setStep("failed");
        setErrors({ submit: result.error || "Failed to initiate payment" });
      }
    } catch (error) {
      console.error("Error initiating payment:", error);
      setStep("failed");
      setErrors({
        submit: "Network error. Please check your connection and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep("form");
    setErrors({});
    setPaymentData(null);
    setTimeRemaining(300);
    setRetryCount(0);
    if (intervalRef.current) {
  clearInterval(intervalRef.current);
  intervalRef.current = null;
}

  };

  const retryPayment = () => {
    setRetryCount((prev) => prev + 1);
    resetForm();
  };

  const copyReference = () => {
    if (paymentData?.momoReferenceId) {
      navigator.clipboard.writeText(paymentData.momoReferenceId);
      setCopiedReference(true);
      setTimeout(() => setCopiedReference(false), 2000);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Form Step
  if (step === "form") {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center mb-6">
          <div className="bg-orange-100 p-3 rounded-lg mr-4">
            <Smartphone className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              MTN Mobile Money Payment
            </h3>
            <p className="text-gray-600">
              Pay securely using your MTN Mobile Money account
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Payment Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Payment Type *
            </label>
            <div className="space-y-2">
              {paymentTypes.map((type) => (
                <label
                  key={type.value}
                  className={`flex items-start p-3 border rounded-lg cursor-pointer transition-all ${
                    type.disabled
                      ? "opacity-50 cursor-not-allowed bg-gray-50"
                      : formData.paymentType === type.value
                        ? "border-orange-500 bg-orange-50"
                        : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentType"
                    value={type.value}
                    checked={formData.paymentType === type.value}
                    onChange={handleInputChange}
                    disabled={type.disabled}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <span className="font-medium text-gray-900">
                      {type.label}
                    </span>
                    <p className="text-sm text-gray-600">{type.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Amount (ZMW) *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                step="5"
                min="5"
                max="50000"
                className={`w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-lg font-medium ${
                  errors.amount ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="1500.00"
              />
            </div>
            {errors.amount && (
              <p className="text-red-500 text-sm mt-1">{errors.amount}</p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              Amount will be:{" "}
              {formData.amount
                ? formatCurrency(parseFloat(formData.amount))
                : "ZMW 0.00"}
            </p>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              MTN Mobile Money Number *
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                className={`w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                  errors.phoneNumber ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="096 123 456 or +260 96 123 456"
              />
            </div>
            {errors.phoneNumber && (
              <p className="text-red-500 text-sm mt-1">{errors.phoneNumber}</p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              Enter your MTN number (096xxxxxxx or 076xxxxxxx)
            </p>
          </div>

          {/* Lease Information */}
          {lease && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">
                Payment Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Property:</span>
                  <p className="font-medium">
                    {lease.propertyId?.address || "Property Address"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Monthly Rent:</span>
                  <p className="font-medium">
                    {formatCurrency(lease.monthlyRent)}
                  </p>
                </div>
                {lease.balanceDue > 0 && (
                  <div>
                    <span className="text-gray-600">Outstanding Balance:</span>
                    <p className="font-medium text-red-600">
                      {formatCurrency(lease.balanceDue)}
                    </p>
                  </div>
                )}
                {formData.paymentType === "first_payment" && (
                  <div>
                    <span className="text-gray-600">
                      First Payment Required:
                    </span>
                    <p className="font-medium text-blue-600">
                      {formatCurrency(lease.firstPaymentRequired)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Display */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <XCircle className="w-5 h-5 text-red-500 mr-2" />
                <p className="text-red-700">{errors.submit}</p>
              </div>
            </div>
          )}

          {/* Retry Notice */}
          {retryCount > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <RefreshCw className="w-5 h-5 text-yellow-600 mr-2" />
                <p className="text-yellow-700">
                  Retry attempt #{retryCount}. Please ensure your phone has
                  network coverage.
                </p>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <Info className="w-5 h-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-2">Payment Instructions:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    Ensure your MTN Mobile Money account has sufficient balance
                  </li>
                  <li>
                    You will receive a USSD prompt on your phone to authorize
                    payment
                  </li>
                  <li>Enter your Mobile Money PIN when prompted</li>
                  <li>
                    Keep your phone nearby and ensure good network coverage
                  </li>
                  <li>Do not close this page until payment is complete</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <Shield className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-green-700">
                <p className="font-medium mb-1">Secure Payment</p>
                <p>
                  This payment is processed securely through MTN's official
                  Mobile Money gateway. Your PIN and personal information are
                  never shared with us.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2 inline" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Initiating...
                </>
              ) : (
                <>
                  <Smartphone className="w-4 h-4 mr-2" />
                  Pay{" "}
                  {formData.amount
                    ? formatCurrency(parseFloat(formData.amount))
                    : ""}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Processing Step
  if (step === "processing") {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="mb-6">
          <div className="bg-yellow-100 p-4 rounded-full inline-block mb-4">
            <Clock className="w-8 h-8 text-yellow-600 animate-pulse" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Processing Payment
          </h3>
          <p className="text-gray-600 mb-4">
            Please check your phone and authorize the payment using your MTN
            Mobile Money PIN
          </p>
          <div className="text-lg font-semibold text-yellow-600">
            Time remaining: {formatTime(timeRemaining)}
          </div>
        </div>

        {paymentData && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Amount:</span>
                <p className="font-medium">
                  {formatCurrency(paymentData.amount)}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Phone Number:</span>
                <p className="font-medium">{paymentData.phoneNumber}</p>
              </div>
              <div className="md:col-span-2">
                <span className="text-gray-600">Reference ID:</span>
                <div className="flex items-center justify-center mt-1">
                  <p className="font-medium font-mono text-xs mr-2">
                    {paymentData.momoReferenceId}
                  </p>
                  <button
                    onClick={copyReference}
                    className="text-blue-600 hover:text-blue-800"
                    title="Copy reference"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  {copiedReference && (
                    <span className="text-green-600 text-xs ml-2">Copied!</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 mb-6">
          <Loader className="w-4 h-4 animate-spin" />
          <span>Waiting for payment confirmation...</span>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">What to do now:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Check your phone for USSD prompt (*182#)</li>
              <li>Follow the prompts to authorize payment</li>
              <li>Enter your Mobile Money PIN</li>
              <li>Wait for confirmation SMS</li>
            </ol>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => checkPaymentStatus(paymentData?.momoReferenceId)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <RefreshCw className="w-4 h-4 mr-2 inline" />
            Check Status Now
          </button>
          <button
            onClick={resetForm}
            className="block mx-auto px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm"
          >
            Cancel Payment
          </button>
        </div>
      </div>
    );
  }

  // Success Step
  if (step === "success") {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="mb-6">
          <div className="bg-green-100 p-4 rounded-full inline-block mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Payment Successful!
          </h3>
          <p className="text-gray-600">
            Your payment has been processed successfully via MTN Mobile Money
          </p>
        </div>

        {paymentData && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-green-700">Amount Paid:</span>
                <p className="font-medium text-green-800">
                  {formatCurrency(paymentData.amount)}
                </p>
              </div>
              <div>
                <span className="text-green-700">Payment Method:</span>
                <p className="font-medium text-green-800">MTN Mobile Money</p>
              </div>
              <div className="md:col-span-2">
                <span className="text-green-700">Reference ID:</span>
                <p className="font-medium font-mono text-xs text-green-800">
                  {paymentData.momoReferenceId}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="text-sm text-gray-600 mb-6">
          <p>You should receive a confirmation SMS from MTN shortly.</p>
          <p>Save the reference ID for your records.</p>
        </div>

        <button
          onClick={() => onSuccess && onSuccess(paymentData)}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          Continue to Dashboard
        </button>
      </div>
    );
  }

  // Failed Step
  if (step === "failed") {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="mb-6">
          <div className="bg-red-100 p-4 rounded-full inline-block mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Payment Failed
          </h3>
          <p className="text-gray-600">
            Your MTN Mobile Money payment could not be processed
          </p>
        </div>

        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700 text-sm">{errors.submit}</p>
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="text-sm text-yellow-700">
            <p className="font-medium mb-1">Common issues:</p>
            <ul className="list-disc list-inside space-y-1 text-left">
              <li>Insufficient Mobile Money balance</li>
              <li>Network connectivity issues</li>
              <li>Incorrect PIN entered</li>
              <li>Transaction timeout</li>
            </ul>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={retryPayment}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <RefreshCw className="w-4 h-4 mr-2 inline" />
            Try Again
          </button>
          <button
            onClick={onCancel}
            className="w-full px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Use Different Payment Method
          </button>
        </div>
      </div>
    );
  }

  // Timeout Step
  if (step === "timeout") {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="mb-6">
          <div className="bg-yellow-100 p-4 rounded-full inline-block mb-4">
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Payment Timeout
          </h3>
          <p className="text-gray-600">
            The payment session has expired. Please try again.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-700 text-sm">
            If you completed the payment on your phone, please check your SMS
            for confirmation and contact support if the payment was deducted but
            not reflected here.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={retryPayment}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Start New Payment
          </button>
          <button
            onClick={() => checkPaymentStatus(paymentData?.momoReferenceId)}
            className="w-full px-6 py-3 border border-blue-300 rounded-lg text-blue-700 hover:bg-blue-50 transition-colors"
          >
            Check Payment Status
          </button>
          <button
            onClick={onCancel}
            className="w-full px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return null;
}
