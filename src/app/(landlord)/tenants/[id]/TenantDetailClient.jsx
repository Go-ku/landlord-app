"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import { formatDate } from "utils/date";
import { formatCurrency } from "utils/currency";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Home,
  FileText,
  Edit,
  Trash2,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Plus,
  CreditCard,
  Users,
  Building,
} from "lucide-react";
import QuickInvoiceModal from "@/components/QuickInvoiceModal";

export default function TenantDetailClient({ tenantData }) {
  const { tenant, leases, payments } = tenantData;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const tenantName =
    tenant.name ||
    `${tenant.firstName || ""} ${tenant.lastName || ""}`.trim() ||
    "Unknown Tenant";

  // Get current active lease
  const activeLease = leases.find((lease) => lease.status === "active");

  // Calculate statistics
  const totalLeases = leases.length;
  const totalPayments = payments.length;
  const totalPaid = payments
    .filter((payment) => payment.status === "verified")
    .reduce((sum, payment) => sum + (payment.amount || 0), 0);

  const pendingPayments = payments.filter(
    (payment) => payment.status === "pending"
  ).length;
  const overdueAmount = activeLease?.balanceDue || 0;

  const handleDeleteTenant = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this tenant? This action cannot be undone and will affect all associated leases and payments."
      )
    ) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/tenants/${tenant._id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to delete tenant");
      }

      router.push("/tenants");
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSendWhatsApp = () => {
    if (tenant.phone) {
      let formattedPhone = tenant.phone.replace(/\D/g, "");

      // Handle Zambian phone number formatting
      if (formattedPhone.startsWith("0")) {
        formattedPhone = "260" + formattedPhone.substring(1);
      } else if (formattedPhone.startsWith("260")) {
        formattedPhone = formattedPhone;
      } else if (formattedPhone.length === 9) {
        formattedPhone = "260" + formattedPhone;
      }

      if (formattedPhone.length !== 12 || !formattedPhone.startsWith("260")) {
        alert("Invalid Zambian phone number format.");
        return;
      }

      const propertyName = activeLease?.propertyId?.address || "your property";
      const message = encodeURIComponent(
        `Hello ${tenantName}! 👋\n\n` +
          `Hope you're doing well at ${propertyName}.\n\n` +
          `Please feel free to contact me if you have any questions or concerns.\n\n` +
          `Best regards`
      );

      const whatsappUrl = `https://wa.me/${formattedPhone}?text=${message}`;
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    } else {
      alert("Phone number not available");
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case "verified":
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          color: "bg-green-100 text-green-800",
          label: "Verified",
        };
      case "pending":
        return {
          icon: <Clock className="w-4 h-4" />,
          color: "bg-yellow-100 text-yellow-800",
          label: "Pending",
        };
      case "active":
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          color: "bg-green-100 text-green-800",
          label: "Active",
        };
      case "draft":
        return {
          icon: <Clock className="w-4 h-4" />,
          color: "bg-gray-100 text-gray-800",
          label: "Draft",
        };
      case "expired":
        return {
          icon: <XCircle className="w-4 h-4" />,
          color: "bg-red-100 text-red-800",
          label: "Expired",
        };
      default:
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          color: "bg-gray-100 text-gray-800",
          label: status || "Unknown",
        };
    }
  };

  const getTenantStatus = () => {
    if (activeLease) {
      if (overdueAmount > 0) {
        return {
          label: "Overdue",
          color: "bg-red-100 text-red-800",
          icon: <AlertCircle className="w-5 h-5" />,
        };
      }
      return {
        label: "Active",
        color: "bg-green-100 text-green-800",
        icon: <CheckCircle className="w-5 h-5" />,
      };
    }
    return {
      label: "Inactive",
      color: "bg-gray-100 text-gray-800",
      icon: <XCircle className="w-5 h-5" />,
    };
  };

  const tenantStatus = getTenantStatus();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="mb-4 sm:mb-0">
            <Link
              href="/tenants"
              className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Tenants
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <User className="w-8 h-8 mr-3 text-blue-600" />
              {tenantName}
            </h1>
            <div className="flex items-center mt-2 space-x-4">
              <span className="text-gray-600 flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                Joined {formatDate(tenant.createdAt)}
              </span>
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${tenantStatus.color}`}
              >
                {tenantStatus.icon}
                <span className="ml-1">{tenantStatus.label}</span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/tenants/${tenant._id}/edit`}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Tenant
            </Link>
            {activeLease && (
              <Link
                href={`/payments/record?leaseId=${activeLease._id}`}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Record Payment
              </Link>
            )}
            <button
              onClick={handleDeleteTenant}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 transition-colors"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {loading ? "Deleting..." : "Delete"}
            </button>
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building className="w-5 h-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">
                  Total Leases
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {totalLeases}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Paid</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(totalPaid)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CreditCard className="w-5 h-5 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">
                  Total Payments
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {totalPayments}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Balance Due</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(overdueAmount)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <User className="w-5 h-5 mr-2 text-blue-600" />
                Personal Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Full Name
                    </span>
                    <p className="text-gray-900">{tenantName}</p>
                  </div>

                  {tenant.email && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">
                        Email
                      </span>
                      <p className="text-gray-900 flex items-center">
                        <Mail className="w-4 h-4 mr-2 text-gray-400" />
                        <a
                          href={`mailto:${tenant.email}`}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          {tenant.email}
                        </a>
                      </p>
                    </div>
                  )}

                  {tenant.phone && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">
                        Phone
                      </span>
                      <p className="text-gray-900 flex items-center">
                        <Phone className="w-4 h-4 mr-2 text-gray-400" />
                        <a
                          href={`tel:${tenant.phone}`}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          {tenant.phone}
                        </a>
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {tenant.dateOfBirth && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">
                        Date of Birth
                      </span>
                      <p className="text-gray-900">
                        {formatDate(tenant.dateOfBirth)}
                      </p>
                    </div>
                  )}

                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Member Since
                    </span>
                    <p className="text-gray-900">
                      {formatDate(tenant.createdAt)}
                    </p>
                  </div>

                  {tenant.nationalId && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">
                        National ID
                      </span>
                      <p className="text-gray-900">{tenant.nationalId}</p>
                    </div>
                  )}
                </div>
              </div>

              {tenant.emergencyContact && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Emergency Contact
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-gray-500">
                        Name
                      </span>
                      <p className="text-gray-900">
                        {typeof tenant.emergencyContact === "object"
                          ? tenant.emergencyContact.name
                          : tenant.emergencyContact}
                      </p>
                    </div>
                    {typeof tenant.emergencyContact === "object" &&
                      tenant.emergencyContact.relationship && (
                        <div>
                          <span className="text-sm font-medium text-gray-500">
                            Relationship
                          </span>
                          <p className="text-gray-900">
                            {tenant.emergencyContact.relationship}
                          </p>
                        </div>
                      )}
                    {tenant.emergencyPhone && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">
                          Phone
                        </span>
                        <p className="text-gray-900 flex items-center">
                          <Phone className="w-4 h-4 mr-2 text-gray-400" />
                          <a
                            href={`tel:${tenant.emergencyPhone}`}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            {tenant.emergencyPhone}
                          </a>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Current Lease */}
            {activeLease && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <Home className="w-5 h-5 mr-2 text-blue-600" />
                  Current Lease
                </h2>

                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {activeLease.propertyId?.address || "Unknown Property"}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {activeLease.propertyId?.type}
                        {activeLease.propertyId?.bedrooms &&
                          ` • ${activeLease.propertyId.bedrooms} bed`}
                        {activeLease.propertyId?.bathrooms &&
                          ` • ${activeLease.propertyId.bathrooms} bath`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(activeLease.monthlyRent || 0)}/month
                      </p>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusConfig(activeLease.status).color}`}
                      >
                        {getStatusConfig(activeLease.status).icon}
                        <span className="ml-1">
                          {getStatusConfig(activeLease.status).label}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Start Date:</span>
                      <p className="text-gray-900">
                        {formatDate(activeLease.startDate)}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">End Date:</span>
                      <p className="text-gray-900">
                        {formatDate(activeLease.endDate)}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Security Deposit:</span>
                      <p className="text-gray-900">
                        {formatCurrency(activeLease.securityDeposit || 0)}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Balance Due:</span>
                      <p
                        className={`font-medium ${overdueAmount > 0 ? "text-red-600" : "text-green-600"}`}
                      >
                        {formatCurrency(overdueAmount)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center space-x-2">
                    <Link
                      href={`/leases/${activeLease._id}`}
                      className="inline-flex items-center px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View Lease
                    </Link>
                    <Link
                      href={`/properties/${activeLease.propertyId?._id}`}
                      className="inline-flex items-center px-3 py-1 text-sm bg-gray-50 text-gray-700 rounded hover:bg-gray-100 transition-colors"
                    >
                      <Home className="w-3 h-3 mr-1" />
                      View Property
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Lease History */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-blue-600" />
                Lease History ({leases.length})
              </h2>

              {leases.length > 0 ? (
                <div className="space-y-4">
                  {leases.map((lease) => {
                    const statusConfig = getStatusConfig(lease.status);

                    return (
                      <div
                        key={lease._id}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-medium text-gray-900">
                              {lease.propertyId?.address || "Unknown Property"}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {formatDate(lease.startDate)} -{" "}
                              {formatDate(lease.endDate)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900">
                              {formatCurrency(lease.monthlyRent || 0)}/month
                            </p>
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}
                            >
                              {statusConfig.icon}
                              <span className="ml-1">{statusConfig.label}</span>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          <div className="text-sm text-gray-600">
                            Created: {formatDate(lease.createdAt)}
                          </div>
                          <Link
                            href={`/leases/${lease._id}`}
                            className="inline-flex items-center px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No lease history available</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Quick Actions
              </h3>

              <div className="space-y-2">
                {tenant.email && (
                  <a
                    href={`mailto:${tenant.email}`}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md flex items-center transition-colors"
                  >
                    <Mail className="w-4 h-4 mr-3 text-gray-500" />
                    Send Email
                  </a>
                )}

                {tenant.phone && (
                  <button
                    onClick={handleSendWhatsApp}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md flex items-center transition-colors"
                  >
                    <MessageSquare className="w-4 h-4 mr-3 text-gray-500" />
                    Send WhatsApp
                  </button>
                )}

                {activeLease && (
                  <>
                    <button
                      onClick={() => setShowInvoiceModal(true)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md flex items-center transition-colors"
                    >
                      <FileText className="w-4 h-4 mr-3 text-gray-500" />
                      Quick Invoice
                    </button>

                    <Link
                      href={`/payments/record?leaseId=${activeLease._id}`}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md flex items-center block transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-3 text-gray-500" />
                      Record Payment
                    </Link>
                  </>
                )}

                <Link
                  href={`/leases/add?tenant=${tenant._id}`}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md flex items-center block transition-colors"
                >
                  <FileText className="w-4 h-4 mr-3 text-gray-500" />
                  Create New Lease
                </Link>

                <Link
                  href={`/invoices/create?tenantId=${tenant._id}${activeLease ? `&leaseId=${activeLease._id}` : ""}`}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md flex items-center block transition-colors"
                >
                  <Plus className="w-4 h-4 mr-3 text-gray-500" />
                  Create Full Invoice
                </Link>
              </div>
            </div>

            {/* Recent Payments */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <CreditCard className="w-5 h-5 mr-2 text-blue-600" />
                Recent Payments
              </h3>

              {payments.length > 0 ? (
                <div className="space-y-3">
                  {payments.slice(0, 5).map((payment) => {
                    const statusConfig = getStatusConfig(payment.status);

                    return (
                      <div
                        key={payment._id}
                        className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {formatCurrency(payment.amount || 0)}
                          </p>
                          <p className="text-xs text-gray-600">
                            {formatDate(
                              payment.paymentDate || payment.createdAt
                            )}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${statusConfig.color}`}
                        >
                          {statusConfig.icon}
                          <span className="ml-1">{statusConfig.label}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4">
                  <CreditCard className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm mb-2">
                    No payments recorded
                  </p>
                  {activeLease && (
                    <Link
                      href={`/payments/record?leaseId=${activeLease._id}`}
                      className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      Record first payment
                    </Link>
                  )}
                </div>
              )}

              {payments.length > 5 && (
                <div className="mt-4 pt-4 border-t">
                  <Link
                    href={`/payments?tenant=${tenant._id}`}
                    className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    View all payments →
                  </Link>
                </div>
              )}
            </div>

            {/* Payment Summary */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Payment Summary
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Paid</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(totalPaid)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    Pending Payments
                  </span>
                  <span className="font-medium text-yellow-600">
                    {pendingPayments}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Current Balance</span>
                  <span
                    className={`font-medium ${overdueAmount > 0 ? "text-red-600" : "text-green-600"}`}
                  >
                    {formatCurrency(overdueAmount)}
                  </span>
                </div>

                {activeLease && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Monthly Rent
                      </span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(activeLease.monthlyRent || 0)}
                      </span>
                    </div>

                    {activeLease.nextPaymentDue && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">
                          Next Payment Due
                        </span>
                        <span className="font-medium text-gray-900">
                          {formatDate(activeLease.nextPaymentDue)}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Account Status */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Account Status
              </h3>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Status</span>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${tenantStatus.color}`}
                  >
                    {tenantStatus.icon}
                    <span className="ml-1">{tenantStatus.label}</span>
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Account Type</span>
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {tenant.role || "Tenant"}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Verified</span>
                  <span
                    className={`text-sm font-medium ${tenant.isVerified ? "text-green-600" : "text-yellow-600"}`}
                  >
                    {tenant.isVerified ? "Yes" : "Pending"}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Active Since</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatDate(tenant.createdAt)}
                  </span>
                </div>

                {tenant.lastLoginAt && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Last Login</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatDate(tenant.lastLoginAt)}
                    </span>
                  </div>
                )}
              </div>

              {overdueAmount > 0 && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-start">
                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-red-800">
                        Payment Overdue
                      </p>
                      <p className="text-xs text-red-600 mt-1">
                        Outstanding balance of {formatCurrency(overdueAmount)}{" "}
                        requires attention.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Landlord Information */}
            {activeLease?.landlordId && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Landlord
                </h3>

                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Name
                    </span>
                    <p className="text-gray-900">
                      {activeLease.landlordId.name ||
                        `${activeLease.landlordId.firstName || ""} ${activeLease.landlordId.lastName || ""}`.trim() ||
                        "Unknown Landlord"}
                    </p>
                  </div>

                  {activeLease.landlordId.email && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">
                        Email
                      </span>
                      <p className="text-gray-900 flex items-center">
                        <Mail className="w-4 h-4 mr-2 text-gray-400" />
                        <a
                          href={`mailto:${activeLease.landlordId.email}`}
                          className="text-blue-600 hover:text-blue-800 text-sm transition-colors"
                        >
                          {activeLease.landlordId.email}
                        </a>
                      </p>
                    </div>
                  )}

                  {activeLease.landlordId.phone && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">
                        Phone
                      </span>
                      <p className="text-gray-900 flex items-center">
                        <Phone className="w-4 h-4 mr-2 text-gray-400" />
                        <a
                          href={`tel:${activeLease.landlordId.phone}`}
                          className="text-blue-600 hover:text-blue-800 text-sm transition-colors"
                        >
                          {activeLease.landlordId.phone}
                        </a>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <QuickInvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        tenant={tenant}
        property={activeLease?.propertyId}
        lease={activeLease}
      />
    </div>
  );
}
