// src/app/payments/record/page.js - Enhanced with MoMo Integration
"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
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
  X,
  Clock,
  XCircle,
  Smartphone,
} from "lucide-react";
import { getCurrentDate, formatDate } from "utils/date";
import { formatCurrency } from "utils/currency";
import MoMoPaymentForm from "@/components/payments/MoMoPaymentForm";

export default function RecordPaymentPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get lease ID from URL params if provided
  const leaseId = searchParams.get("leaseId");

  const [paymentMethod, setPaymentMethod] = useState("bank_transfer"); // Track selected payment method
  const [showMoMoForm, setShowMoMoForm] = useState(false);

  const [formData, setFormData] = useState({
    leaseId: leaseId || "",
    amount: "",
    paymentDate: getCurrentDate(),
    paymentMethod: "cash",
    paymentType: "rent",
    referenceNumber: "",
    description: "",
    notes: "",
    receiptFile: null,
    status: "pending",
    approvalStatus: "pending",
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
        const response = await fetch("/api/leases");
        if (response.ok) {
          const responseText = await response.text();
          if (responseText) {
            const leasesData = JSON.parse(responseText);
            const leasesArray = Array.isArray(leasesData)
              ? leasesData
              : leasesData.data || [];
            setLeases(leasesArray);

            // If leaseId provided, find and set the selected lease
            if (leaseId && leasesArray.length > 0) {
              const lease = leasesArray.find((l) => l._id === leaseId);
              if (lease) {
                setSelectedLease(lease);

                setFormData((prev) => ({
                  ...prev,
                  amount: (lease.firstPaymentMade
                    ? lease.balanceDue
                    : lease.firstPaymentRequired
                  ).toString(),
                }));
              }
            }
          } else {
            setLeases([]);
          }
        } else {
          console.error("Failed to fetch leases");
          setLeases([]);
        }
      } catch (error) {
        console.error("Error fetching leases:", error);
        setLeases([]);
      } finally {
        setDataLoading(false);
      }
    };

    fetchLeases();
  }, [leaseId]);

  const handleInputChange = (e) => {
    const { name, value, type, files } = e.target;

    if (type === "file") {
      const file = files[0];
      setFormData((prev) => ({ ...prev, [name]: file }));

      // Create preview for receipt
      if (file && file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => setReceiptPreview(e.target.result);
        reader.readAsDataURL(file);
      } else if (file) {
        setReceiptPreview(null);
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));

      // Handle payment method change
      if (name === "paymentMethod") {
        setPaymentMethod(value);
        if (value === "mobile_money") {
          setShowMoMoForm(true);
          return; // Don't proceed with normal form submission for MoMo
        } else {
          setShowMoMoForm(false);
        }
      }

      // If lease is selected, update selected lease info
      if (name === "leaseId" && value) {
        const lease = leases.find((l) => l._id === value);
        setSelectedLease(lease);
        if (lease && !formData.amount) {
          setFormData((prev) => ({
            ...prev,
            amount: lease.monthlyRent.toString(),
          }));
        }
      }
    }
  };

  const removeReceiptFile = () => {
    setFormData((prev) => ({ ...prev, receiptFile: null }));
    setReceiptPreview(null);
    // Reset file input
    const fileInput = document.getElementById("receiptFile");
    if (fileInput) fileInput.value = "";
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.leaseId) newErrors.leaseId = "Please select a lease";
    if (!formData.amount || parseFloat(formData.amount) <= 0)
      newErrors.amount = "Valid payment amount is required";
    if (!formData.paymentDate)
      newErrors.paymentDate = "Payment date is required";
    if (!formData.paymentMethod)
      newErrors.paymentMethod = "Payment method is required";
    if (!formData.paymentType)
      newErrors.paymentType = "Payment type is required";

    // Only require reference number for non-MoMo payments
    if (
      formData.paymentMethod !== "mobile_money" &&
      !formData.referenceNumber.trim()
    ) {
      newErrors.referenceNumber = "Payment reference is required";
    }

    // Validate payment date is not in the future
    const paymentDate = new Date(formData.paymentDate);
    const today = new Date();
    if (paymentDate > today) {
      newErrors.paymentDate = "Payment date cannot be in the future";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // If MoMo is selected, show the MoMo form instead
    if (formData.paymentMethod === "mobile_money") {
      setShowMoMoForm(true);
      return;
    }

    if (!validateForm()) return;

    setLoading(true);

    try {
      // Create FormData for file upload
      const submitData = new FormData();

      // Add form fields using the correct field names from the Payment model
      submitData.append("lease", formData.leaseId); // Model uses 'lease' not 'leaseId'
      submitData.append("amount", parseFloat(formData.amount));
      submitData.append("paymentDate", formData.paymentDate);
      submitData.append("paymentMethod", formData.paymentMethod);
      submitData.append("paymentType", formData.paymentType);
      submitData.append("referenceNumber", formData.referenceNumber);
      submitData.append("description", formData.description);
      submitData.append("notes", formData.notes);
      submitData.append("status", formData.status);
      submitData.append("approvalStatus", formData.approvalStatus);

      // Add file if provided
      if (formData.receiptFile) {
        submitData.append("receiptFile", formData.receiptFile);
      }

      const response = await fetch("/api/payments", {
        method: "POST",
        body: submitData,
      });

      if (response.ok) {
        const result = await response.json();
        alert("Payment recorded successfully!");
        router.push(`/payments/${result._id}`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to record payment");
      }
    } catch (error) {
      console.error("Error recording payment:", error);
      alert(`Failed to record payment: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMoMoSuccess = (paymentData) => {
    alert("MoMo payment successful!");
    router.push(`/payments/${paymentData.paymentId}`);
  };

  const handleMoMoCancel = () => {
    setShowMoMoForm(false);
    setFormData((prev) => ({ ...prev, paymentMethod: "cash" }));
    setPaymentMethod("cash");
  };

  const paymentMethods = [
    {
      value: "mobile_money",
      label: "MTN Mobile Money",
      icon: <Smartphone className="w-4 h-4" />,
      color: "text-orange-600",
    },
    {
      value: "bank_transfer",
      label: "Bank Transfer",
      icon: <CreditCard className="w-4 h-4" />,
      color: "text-blue-600",
    },
    {
      value: "cash",
      label: "Cash",
      icon: <DollarSign className="w-4 h-4" />,
      color: "text-green-600",
    },
    {
      value: "cheque",
      label: "Cheque",
      icon: <Receipt className="w-4 h-4" />,
      color: "text-purple-600",
    },
    {
      value: "card",
      label: "Card Payment",
      icon: <CreditCard className="w-4 h-4" />,
      color: "text-blue-600",
    },
    {
      value: "manual",
      label: "Manual Entry",
      icon: <Receipt className="w-4 h-4" />,
      color: "text-gray-600",
    },
  ];

  const paymentTypes = [
    { value: "rent", label: "Rent Payment" },
    { value: "deposit", label: "Security Deposit" },
    { value: "maintenance", label: "Maintenance Fee" },
    { value: "fees", label: "Other Fees" },
  ];

  const statusOptions = [
    {
      value: "pending",
      label: "Pending",
      icon: <Clock className="w-4 h-4" />,
      color: "text-yellow-600",
    },
    {
      value: "completed",
      label: "Completed",
      icon: <CheckCircle className="w-4 h-4" />,
      color: "text-green-600",
    },
    {
      value: "verified",
      label: "Verified",
      icon: <CheckCircle className="w-4 h-4" />,
      color: "text-green-600",
    },
  ];

  const approvalStatusOptions = [
    {
      value: "pending",
      label: "Pending Approval",
      icon: <Clock className="w-4 h-4" />,
      color: "text-yellow-600",
    },
    {
      value: "approved",
      label: "Pre-approved",
      icon: <CheckCircle className="w-4 h-4" />,
      color: "text-green-600",
    },
  ];

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading leases...</span>
      </div>
    );
  }

  // Show MoMo Payment Form
  if (showMoMoForm && selectedLease) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={handleMoMoCancel}
              className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Payment Methods
            </button>

            <div className="bg-white rounded-lg shadow p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
                <Smartphone className="w-6 h-6 mr-3 text-orange-600" />
                MTN Mobile Money Payment
              </h1>
              <p className="text-gray-600">
                Complete your payment securely using MTN Mobile Money
              </p>
            </div>
          </div>

          <MoMoPaymentForm
            lease={selectedLease}
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
                        errors.leaseId ? "border-red-500" : "border-gray-300"
                      }`}
                    >
                      <option value="">Choose a lease...</option>
                      {leases.map((lease) => (
                        <option key={lease._id} value={lease._id}>
                          {lease.propertyId?.address || "Unknown Property"} -{" "}
                          {lease.tenantId?.name ||
                            lease.tenantId?.firstName +
                              " " +
                              lease.tenantId?.lastName ||
                            "Unknown Tenant"}
                        </option>
                      ))}
                    </select>
                    {errors.leaseId && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.leaseId}
                      </p>
                    )}
                  </div>

                  {/* Selected Lease Info */}
                  {selectedLease && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-md">
                      <h4 className="font-medium text-blue-900 mb-2">
                        Selected Lease Details
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-blue-700 font-medium">
                            Property:
                          </span>
                          <p className="text-blue-800">
                            {selectedLease.propertyId?.address}
                          </p>
                        </div>
                        <div>
                          <span className="text-blue-700 font-medium">
                            Tenant:
                          </span>
                          <p className="text-blue-800">
                            {selectedLease.tenantId?.name ||
                              `${selectedLease.tenantId?.firstName} ${selectedLease.tenantId?.lastName}`}
                          </p>
                        </div>
                        <div>
                          <span className="text-blue-700 font-medium">
                            Monthly Rent:
                          </span>
                          <p className="text-blue-800">
                            {formatCurrency(selectedLease.monthlyRent)}
                          </p>
                        </div>
                        <div>
                          <span className="text-blue-700 font-medium">
                            Balance Due:
                          </span>
                          <p className="text-blue-800">
                            {formatCurrency(
                              selectedLease.firstPaymentMade
                                ? selectedLease.balanceDue
                                : selectedLease.firstPaymentRequired || 0
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Payment Method Selection */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <CreditCard className="w-5 h-5 mr-2 text-purple-600" />
                    Payment Method
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {paymentMethods.map((method) => (
                      <label
                        key={method.value}
                        className={`relative flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                          formData.paymentMethod === method.value
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-300 hover:border-gray-400"
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method.value}
                          checked={formData.paymentMethod === method.value}
                          onChange={handleInputChange}
                          className="sr-only"
                        />
                        <div className={`flex items-center ${method.color}`}>
                          {method.icon}
                          <span className="ml-2 text-sm font-medium text-gray-900">
                            {method.label}
                          </span>
                        </div>
                        {formData.paymentMethod === method.value && (
                          <CheckCircle className="absolute top-2 right-2 w-4 h-4 text-blue-500" />
                        )}
                      </label>
                    ))}
                  </div>
                  {errors.paymentMethod && (
                    <p className="text-red-500 text-sm mt-2">
                      {errors.paymentMethod}
                    </p>
                  )}

                  {/* MoMo Special Notice */}
                  {formData.paymentMethod === "mobile_money" && (
                    <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-start">
                        <Smartphone className="w-5 h-5 text-orange-600 mr-2 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-orange-700">
                          <p className="font-medium mb-1">
                            MTN Mobile Money Selected
                          </p>
                          <p>
                            You will be redirected to complete your payment
                            securely via MTN Mobile Money. Ensure your phone is
                            nearby and has sufficient balance.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Payment Details - Only show if not MoMo or if user wants to continue with form */}
                {formData.paymentMethod !== "mobile_money" && (
                  <>
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
                            step="5"
                            min="0"
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              errors.amount
                                ? "border-red-500"
                                : "border-gray-300"
                            }`}
                            placeholder="1500.00"
                          />
                          {errors.amount && (
                            <p className="text-red-500 text-sm mt-1">
                              {errors.amount}
                            </p>
                          )}
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
                              errors.paymentDate
                                ? "border-red-500"
                                : "border-gray-300"
                            }`}
                          />
                          {errors.paymentDate && (
                            <p className="text-red-500 text-sm mt-1">
                              {errors.paymentDate}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Payment Type *
                          </label>
                          <select
                            name="paymentType"
                            value={formData.paymentType}
                            onChange={handleInputChange}
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              errors.paymentType
                                ? "border-red-500"
                                : "border-gray-300"
                            }`}
                          >
                            {paymentTypes.map((type) => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                          {errors.paymentType && (
                            <p className="text-red-500 text-sm mt-1">
                              {errors.paymentType}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Reference Number
                          </label>
                          <input
                            type="text"
                            name="referenceNumber"
                            value={formData.referenceNumber}
                            onChange={handleInputChange}
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              errors.referenceNumber
                                ? "border-red-500"
                                : "border-gray-300"
                            }`}
                            placeholder="Transaction ID, cheque number, etc."
                          />
                          {errors.referenceNumber && (
                            <p className="text-red-500 text-sm mt-1">
                              {errors.referenceNumber}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <textarea
                          name="description"
                          value={formData.description}
                          onChange={handleInputChange}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Payment description..."
                        />
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Notes
                        </label>
                        <textarea
                          name="notes"
                          value={formData.notes}
                          onChange={handleInputChange}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Additional notes..."
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
                                <span className="text-sm text-gray-700">
                                  {formData.receiptFile.name}
                                </span>
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
                  </>
                )}

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
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {loading ? (
                      <>
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : formData.paymentMethod === "mobile_money" ? (
                      <>
                        <Smartphone className="w-4 h-4 mr-2" />
                        Continue with MoMo
                      </>
                    ) : (
                      <>
                        <Receipt className="w-4 h-4 mr-2" />
                        Record Payment
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Payment Method Info */}
            {formData.paymentMethod === "mobile_money" && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Smartphone className="w-5 h-5 mr-2 text-orange-600" />
                  MTN Mobile Money
                </h3>

                <div className="space-y-3">
                  <div className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700">
                      Instant payment processing
                    </p>
                  </div>

                  <div className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700">
                      Secure and encrypted transactions
                    </p>
                  </div>

                  <div className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700">
                      Automatic payment confirmation
                    </p>
                  </div>

                  <div className="flex items-start">
                    <AlertCircle className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700">
                      Ensure your phone has sufficient MoMo balance
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Status - Only show for non-MoMo payments */}
            {formData.paymentMethod !== "mobile_money" && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2 text-yellow-600" />
                  Payment Status
                </h3>

                <div className="space-y-4">
                  {/* Status - Only for landlords and admins */}
                  {userRole === "admin" || userRole === "landlord" ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Payment Status
                        </label>
                        <div className="space-y-2">
                          {statusOptions.map((status) => (
                            <div
                              key={status.value}
                              className="flex items-center space-x-2"
                            >
                              <input
                                type="radio"
                                id={`status_${status.value}`}
                                name="status"
                                value={status.value}
                                checked={formData.status === status.value}
                                onChange={handleInputChange}
                                className="text-blue-600"
                              />
                              <label
                                htmlFor={`status_${status.value}`}
                                className={`flex items-center text-sm ${status.color}`}
                              >
                                {status.icon}
                                <span className="ml-2">{status.label}</span>
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Approval Status
                        </label>
                        <div className="space-y-2">
                          {approvalStatusOptions.map((status) => (
                            <div
                              key={status.value}
                              className="flex items-center space-x-2"
                            >
                              <input
                                type="radio"
                                id={`approval_${status.value}`}
                                name="approvalStatus"
                                value={status.value}
                                checked={
                                  formData.approvalStatus === status.value
                                }
                                onChange={handleInputChange}
                                className="text-blue-600"
                              />
                              <label
                                htmlFor={`approval_${status.value}`}
                                className={`flex items-center text-sm ${status.color}`}
                              >
                                {status.icon}
                                <span className="ml-2">{status.label}</span>
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-600 italic">
                      Payment and approval status will be set by an
                      administrator.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Quick Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Quick Info
              </h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Today&apos;s Date:</span>
                  <span className="font-medium">
                    {formatDate(getCurrentDate())}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Currency:</span>
                  <span className="font-medium">Zambian Kwacha (ZMW)</span>
                </div>

                {selectedLease && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Expected Rent:</span>
                      <span className="font-medium">
                        {formatCurrency(selectedLease.monthlyRent)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-600">Current Balance:</span>
                      <span className="font-medium text-red-600">
                        {formatCurrency(
                          selectedLease.firstPaymentMade
                            ? selectedLease.balanceDue
                            : selectedLease.firstPaymentRequired || 0
                        )}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Payment Guidelines */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Payment Guidelines
              </h3>

              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex items-start">
                  <Calendar className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                  <p>Payment date cannot be set to a future date.</p>
                </div>

                <div className="flex items-start">
                  <Receipt className="w-4 h-4 text-purple-500 mr-2 mt-0.5 flex-shrink-0" />
                  <p>Always include a clear reference number for tracking.</p>
                </div>

                <div className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <p>
                    Upload receipt when available for better record keeping.
                  </p>
                </div>

                <div className="flex items-start">
                  <Smartphone className="w-4 h-4 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                  <p>
                    Use MTN MoMo for instant payment processing and
                    confirmation.
                  </p>
                </div>

                <div className="flex items-start">
                  <AlertCircle className="w-4 h-4 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                  <p>Verify payment details before submitting.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
