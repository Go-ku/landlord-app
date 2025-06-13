"use client";
import { useState } from "react";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import { formatDate } from "utils/date";
import { formatCurrency } from "utils/currency";
import {
  ArrowLeft,
  Play,
  Calendar,
  DollarSign,
  Square,
  Home,
  User,
  Clock,
  FileText,
  Phone,
  Mail,
  Edit,
  Trash2,
  Download,
  AlertCircle,
  CheckCircle,
  XCircle,
  MessageSquare,
  Eye,
  CreditCard,
  Users,
  MapPin
} from "lucide-react";

export default function LeaseDetailClient({ lease }) {
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [activationLoading, setActivationLoading] = useState(false);

  // Helper function to format dates with day names
  const formatDateWithDay = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return formatDate(dateString);
    }
  };

  // Helper function to get days until a date
  const getDaysUntilDate = (dateString) => {
    if (!dateString) return null;
    try {
      const targetDate = new Date(dateString);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      targetDate.setHours(0, 0, 0, 0);
      const diffTime = targetDate - today;
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch {
      return null;
    }
  };

  // Calculate lease status and remaining time
  const isActive = new Date(lease.endDate) > new Date();
  const daysRemaining = getDaysUntilDate(lease.endDate);
  const daysUntilStart = getDaysUntilDate(lease.startDate);

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "draft":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "terminated":
        return "bg-red-100 text-red-800 border-red-200";
      case "expired":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "active":
        return <CheckCircle className="w-4 h-4" />;
      case "draft":
        return <Clock className="w-4 h-4" />;
      case "terminated":
      case "expired":
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const handleDownloadPDF = async () => {
    setPdfLoading(true);
    try {
      console.log("Attempting to download PDF for lease:", lease._id);

      const response = await fetch(`/api/leases/${lease._id}/pdf`);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Failed to generate PDF";
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (parseError) {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error("Received empty PDF file");
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // Get filename from response header or create default
      const contentDisposition = response.headers.get("content-disposition");
      let filename = "lease-agreement.pdf";
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(
          /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
        );
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, "");
        }
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PDF download error:", error);
      alert(`Failed to download lease PDF: ${error.message}`);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleEmailTenant = () => {
    const tenantEmail = lease.tenantId?.email;
    if (tenantEmail) {
      const subject = encodeURIComponent(
        `Regarding your lease at ${propertyName}`
      );
      const body = encodeURIComponent(
        `Dear ${tenantName},\n\n` +
          `I hope this email finds you well.\n\n` +
          `I am writing to you regarding your lease at ${propertyName}.\n\n` +
          `Lease Details:\n` +
          `• Property: ${propertyName}\n` +
          `• Lease Period: ${formatDate(lease.startDate)} - ${formatDate(lease.endDate)}\n` +
          `• Monthly Rent: ${formatCurrency(lease.monthlyRent)}\n` +
          `• Status: ${lease.status}\n\n` +
          `Please feel free to contact me if you have any questions or concerns.\n\n` +
          `Best regards,\n` +
          `${landlordName}`
      );

      const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(tenantEmail)}&su=${subject}&body=${body}`;
      window.open(gmailComposeUrl, "_blank", "noopener,noreferrer");
    } else {
      alert("Tenant email not available");
    }
  };

  const handleScheduleInspection = () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 7);
    const endDate = new Date(startDate);
    endDate.setHours(startDate.getHours() + 1);

    const formatCalendarDate = (date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    const eventTitle = encodeURIComponent(
      `Property Inspection - ${propertyName}`
    );
    const eventDetails = encodeURIComponent(
      `Inspection scheduled for property: ${propertyName}\nTenant: ${tenantName}`
    );

    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${formatCalendarDate(startDate)}/${formatCalendarDate(endDate)}&details=${eventDetails}`;

    window.open(googleCalendarUrl, "_blank");
  };

  // Manual lease activation handler
  const handleLeaseActivation = async (action) => {
    const confirmMessage = action === 'activate' 
      ? 'Are you sure you want to manually activate this lease?' 
      : 'Are you sure you want to deactivate this lease? This will set it back to draft status.';
    
    if (!confirm(confirmMessage)) return;
    
    const reason = prompt(`Please provide a reason for ${action}ing this lease:`);
    if (!reason) return;
    
    setActivationLoading(true);
    try {
      const response = await fetch(`/api/leases/${lease._id}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action,
          reason,
          activatedBy: 'current-user-id'
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`Lease ${action}d successfully! ${result.message}`);
        window.location.reload();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${action} lease`);
      }
    } catch (error) {
      console.error(`Error ${action}ing lease:`, error);
      alert(`Failed to ${action} lease: ${error.message}`);
    } finally {
      setActivationLoading(false);
    }
  };

  const handleDeleteLease = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this lease? This action cannot be undone."
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/leases/${lease._id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        alert("Lease deleted successfully");
        window.location.href = "/leases";
      } else {
        throw new Error("Failed to delete lease");
      }
    } catch (error) {
      console.error("Error deleting lease:", error);
      alert("Failed to delete lease. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendWhatsApp = () => {
    const tenantPhone = lease.tenantId?.phone;
    if (tenantPhone) {
      let formattedPhone = tenantPhone.replace(/\D/g, "");

      if (formattedPhone.startsWith("0")) {
        formattedPhone = "260" + formattedPhone.substring(1);
      } else if (formattedPhone.startsWith("260")) {
        formattedPhone = formattedPhone;
      } else if (formattedPhone.length === 9) {
        formattedPhone = "260" + formattedPhone;
      }

      if (formattedPhone.length !== 12 || !formattedPhone.startsWith("260")) {
        alert(
          "Invalid Zambian phone number format. Please check the tenant's phone number."
        );
        return;
      }

      const daysUntilPayment = lease.nextPaymentDue
        ? getDaysUntilDate(lease.nextPaymentDue)
        : null;

      let message = "";

      if (
        daysUntilPayment !== null &&
        daysUntilPayment <= 3 &&
        daysUntilPayment > 0
      ) {
        message =
          `Hello ${tenantName}! 👋\n\n` +
          `This is a friendly reminder that your rent payment for ${propertyName} is due in ${daysUntilPayment} day${daysUntilPayment > 1 ? "s" : ""}.\n\n` +
          `💰 Amount: ${formatCurrency(lease.monthlyRent)}\n` +
          `📅 Due Date: ${formatDate(lease.nextPaymentDue)}\n\n` +
          `Please ensure payment is made on time to avoid any late fees.\n\n` +
          `Thank you! 🏠\n` +
          `${landlordName}`;
      } else if (daysUntilPayment !== null && daysUntilPayment < 0) {
        const daysOverdue = Math.abs(daysUntilPayment);
        message =
          `Hello ${tenantName},\n\n` +
          `Your rent payment for ${propertyName} was due ${daysOverdue} day${daysOverdue > 1 ? "s" : ""} ago.\n\n` +
          `💰 Amount Due: ${formatCurrency(lease.balanceDue || lease.monthlyRent)}\n` +
          `📅 Original Due Date: ${formatDate(lease.nextPaymentDue)}\n\n` +
          `Please contact me to arrange payment as soon as possible.\n\n` +
          `Thank you,\n` +
          `${landlordName}`;
      } else if (lease.balanceDue > 0) {
        message =
          `Hello ${tenantName},\n\n` +
          `You have an outstanding balance for your lease at ${propertyName}.\n\n` +
          `💰 Outstanding Amount: ${formatCurrency(lease.balanceDue)}\n` +
          `🏠 Property: ${propertyName}\n\n` +
          `Please contact me to discuss payment arrangements.\n\n` +
          `Thank you,\n` +
          `${landlordName}`;
      } else {
        message =
          `Hello ${tenantName}! 👋\n\n` +
          `I hope you're doing well at ${propertyName}.\n\n` +
          `📋 Lease Details:\n` +
          `🏠 Property: ${propertyName}\n` +
          `💰 Monthly Rent: ${formatCurrency(lease.monthlyRent)}\n` +
          `📅 Lease End: ${formatDate(lease.endDate)}\n\n` +
          `Please don't hesitate to contact me if you have any questions or concerns.\n\n` +
          `Best regards,\n` +
          `${landlordName}`;
      }

      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    } else {
      alert("Tenant phone number not available");
    }
  };

  const propertyName =
    lease.propertyId?.address || lease.propertyId?.name || "Unknown Property";
  const tenantName =
    lease.tenantId?.name ||
    `${lease.tenantId?.firstName} ${lease.tenantId?.lastName}` ||
    "Unknown Tenant";
  const landlordName =
    lease.landlordId?.name ||
    `${lease.landlordId?.firstName} ${lease.landlordId?.lastName}` ||
    "Unknown Landlord";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/leases"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Leases
          </Link>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
                <FileText className="w-8 h-8 mr-3 text-blue-600" />
                Lease Agreement
              </h1>
              <p className="text-gray-600">
                Created on {formatDate(lease.createdAt)}
              </p>
            </div>

            <div className="flex items-center space-x-3 mt-4 md:mt-0">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(lease.status)}`}
              >
                {getStatusIcon(lease.status)}
                <span className="ml-2 capitalize">{lease.status}</span>
              </span>

              <div className="flex space-x-2">
                <Link
                  href={`/leases/${lease._id}/edit`}
                  className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Link>

                <button
                  onClick={handleDeleteLease}
                  disabled={loading}
                  className="inline-flex items-center px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>

        <Breadcrumbs />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Monthly Rent</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(lease.monthlyRent || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Days Remaining</p>
                <p className="text-xl font-bold text-gray-900">
                  {daysRemaining > 0 ? daysRemaining : 'Expired'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <CreditCard className="w-5 h-5 text-red-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Balance Due</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(lease.balanceDue || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Security Deposit</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(lease.securityDeposit || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Lease Overview */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-blue-600" />
                Lease Overview
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                    Lease Period
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Start Date</span>
                      <p className="text-gray-900">{formatDateWithDay(lease.startDate)}</p>
                    </div>
                </div>

                {(lease.tenantId?.emergencyContact ||
                  lease.tenantId?.emergencyPhone) && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-4">Emergency Contact</h3>
                    <div className="space-y-3">
                      {lease.tenantId?.emergencyContact && (
                        <div>
                          <span className="text-sm font-medium text-gray-500">Name</span>
                          <p className="text-gray-900">
                            {typeof lease.tenantId.emergencyContact === "object"
                              ? lease.tenantId.emergencyContact.name || "Not specified"
                              : lease.tenantId.emergencyContact}
                          </p>
                        </div>
                      )}
                      {lease.tenantId?.emergencyContact &&
                        typeof lease.tenantId.emergencyContact === "object" &&
                        lease.tenantId.emergencyContact.relationship && (
                          <div>
                            <span className="text-sm font-medium text-gray-500">Relationship</span>
                            <p className="text-gray-900">
                              {lease.tenantId.emergencyContact.relationship}
                            </p>
                          </div>
                        )}
                      {lease.tenantId?.emergencyPhone && (
                        <div>
                          <span className="text-sm font-medium text-gray-500">Phone</span>
                          <p className="text-gray-900 flex items-center">
                            <Phone className="w-4 h-4 mr-2 text-gray-400" />
                            <a
                              href={`tel:${
                                typeof lease.tenantId.emergencyPhone === "object"
                                  ? lease.tenantId.emergencyPhone.phone ||
                                    lease.tenantId.emergencyPhone
                                  : lease.tenantId.emergencyPhone
                              }`}
                              className="text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              {typeof lease.tenantId.emergencyPhone === "object"
                                ? lease.tenantId.emergencyPhone.phone ||
                                  lease.tenantId.emergencyPhone
                                : lease.tenantId.emergencyPhone}
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

          {/* Sidebar */}
          {/* Tenant Information */}
          <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <User className="w-5 h-5 mr-2 text-blue-600" />
                Tenant Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-4">Primary Contact</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Name</span>
                      <p className="text-gray-900">{tenantName}</p>
                    </div>
                    {lease.tenantId?.email && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">Email</span>
                        <p className="text-gray-900 flex items-center">
                          <Mail className="w-4 h-4 mr-2 text-gray-400" />
                          <a
                            href={`mailto:${lease.tenantId.email}`}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            {lease.tenantId.email}
                          </a>
                        </p>
                      </div>
                    )}
                    {lease.tenantId?.phone && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">Phone</span>
                        <p className="text-gray-900 flex items-center">
                          <Phone className="w-4 h-4 mr-2 text-gray-400" />
                          <a
                            href={`tel:${lease.tenantId.phone}`}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            {lease.tenantId.phone}
                          </a>
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {(lease.tenantId?.emergencyContact ||
                  lease.tenantId?.emergencyPhone) && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-4">Emergency Contact</h3>
                    <div className="space-y-3">
                      {lease.tenantId?.emergencyContact && (
                        <div>
                          <span className="text-sm font-medium text-gray-500">Name</span>
                          <p className="text-gray-900">
                            {typeof lease.tenantId.emergencyContact === "object"
                              ? lease.tenantId.emergencyContact.name || "Not specified"
                              : lease.tenantId.emergencyContact}
                          </p>
                        </div>
                      )}
                      {lease.tenantId?.emergencyContact &&
                        typeof lease.tenantId.emergencyContact === "object" &&
                        lease.tenantId.emergencyContact.relationship && (
                          <div>
                            <span className="text-sm font-medium text-gray-500">Relationship</span>
                            <p className="text-gray-900">
                              {lease.tenantId.emergencyContact.relationship}
                            </p>
                          </div>
                        )}
                      {lease.tenantId?.emergencyPhone && (
                        <div>
                          <span className="text-sm font-medium text-gray-500">Phone</span>
                          <p className="text-gray-900 flex items-center">
                            <Phone className="w-4 h-4 mr-2 text-gray-400" />
                            <a
                              href={`tel:${
                                typeof lease.tenantId.emergencyPhone === "object"
                                  ? lease.tenantId.emergencyPhone.phone ||
                                    lease.tenantId.emergencyPhone
                                  : lease.tenantId.emergencyPhone
                              }`}
                              className="text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              {typeof lease.tenantId.emergencyPhone === "object"
                                ? lease.tenantId.emergencyPhone.phone ||
                                  lease.tenantId.emergencyPhone
                                : lease.tenantId.emergencyPhone}
                            </a>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Landlord Information - MOVED TO MAIN CONTENT */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <User className="w-5 h-5 mr-2 text-blue-600" />
                Landlord Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-4">Contact Details</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Name</span>
                      <p className="text-gray-900">{landlordName}</p>
                    </div>
                    {lease.landlordId?.email && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">Email</span>
                        <p className="text-gray-900 flex items-center">
                          <Mail className="w-4 h-4 mr-2 text-gray-400" />
                          <a
                            href={`mailto:${lease.landlordId.email}`}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            {lease.landlordId.email}
                          </a>
                        </p>
                      </div>
                    )}
                    {lease.landlordId?.phone && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">Phone</span>
                        <p className="text-gray-900 flex items-center">
                          <Phone className="w-4 h-4 mr-2 text-gray-400" />
                          <a
                            href={`tel:${lease.landlordId.phone}`}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            {lease.landlordId.phone}
                          </a>
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-4">Additional Information</h3>
                  <div className="space-y-3">
                    {lease.landlordId?.company && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">Company</span>
                        <p className="text-gray-900">{lease.landlordId.company}</p>
                      </div>
                    )}
                    {lease.landlordId?.address && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">Address</span>
                        <p className="text-gray-900">{lease.landlordId.address}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-sm font-medium text-gray-500">Lease Created</span>
                      <p className="text-gray-900">{formatDate(lease.createdAt)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - MOVED PAYMENT STATUS, LEASE STATUS, AND QUICK ACTIONS HERE */}
          <div className="space-y-6">
            {/* Payment Status - MOVED TO SIDEBAR */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                Payment Status
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Paid</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(lease.totalPaid || 0)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Balance Due</span>
                  <span className={`font-medium ${(lease.balanceDue || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(lease.balanceDue || 0)}
                  </span>
                </div>
                
                {lease.nextPaymentDue && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Next Payment</span>
                    <span className="font-medium text-gray-900">
                      {formatDate(lease.nextPaymentDue)}
                    </span>
                  </div>
                )}
                
                {lease.lastPaymentDate && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Last Payment</span>
                    <span className="font-medium text-gray-900">
                      {formatDate(lease.lastPaymentDate)}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="mt-6 pt-4 border-t">
                <Link 
                  href={`/payments/record?leaseId=${lease._id}`}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 text-sm font-medium block text-center transition-colors"
                >
                  Record Payment
                </Link>
              </div>
            </div>

            {/* Lease Activation Status - MOVED TO SIDEBAR */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Lease Status</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Current Status</span>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(lease.status)}`}>
                    {getStatusIcon(lease.status)}
                    <span className="ml-1 capitalize">{lease.status}</span>
                  </span>
                </div>
                
                {lease.status === 'draft' && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800 mb-2">
                      💡 This lease will automatically activate when the first payment is verified.
                    </p>
                    <p className="text-xs text-yellow-600">
                      Or you can manually activate it below.
                    </p>
                  </div>
                )}
                
                {lease.activatedAt && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Activated:</span> {formatDate(lease.activatedAt)}
                  </div>
                )}
                
                {/* Manual Activation Controls */}
                <div className="space-y-2">
                  {lease.status === 'draft' && (
                    <button
                      onClick={() => handleLeaseActivation('activate')}
                      disabled={activationLoading}
                      className="w-full flex items-center justify-center px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      {activationLoading ? 'Activating...' : 'Manually Activate Lease'}
                    </button>
                  )}
                  
                  {lease.status === 'active' && (
                    <button
                      onClick={() => handleLeaseActivation('deactivate')}
                      disabled={activationLoading}
                      className="w-full flex items-center justify-center px-3 py-2 bg-yellow-600 text-white text-sm font-medium rounded-md hover:bg-yellow-700 disabled:opacity-50 transition-colors"
                    >
                      <Square className="w-4 h-4 mr-2" />
                      {activationLoading ? 'Deactivating...' : 'Deactivate Lease'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions - MOVED TO SIDEBAR */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>

              <div className="space-y-2">
                <button
                  onClick={handleDownloadPDF}
                  disabled={pdfLoading}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md flex items-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Download className="w-4 h-4 mr-3 text-gray-500" />
                  {pdfLoading ? "Generating PDF..." : "Download Lease PDF"}
                </button>

                <button
                  onClick={handleEmailTenant}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md flex items-center transition-colors"
                >
                  <Mail className="w-4 h-4 mr-3 text-gray-500" />
                  Email Tenant
                </button>

                <button
                  onClick={handleSendWhatsApp}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md flex items-center transition-colors"
                >
                  <MessageSquare className="w-4 h-4 mr-3 text-gray-500" />
                  Send WhatsApp Message
                </button>

                <button
                  onClick={handleScheduleInspection}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md flex items-center transition-colors"
                >
                  <Calendar className="w-4 h-4 mr-3 text-gray-500" />
                  Schedule Inspection
                </button>

                <Link
                  href={`/leases/${lease._id}/renew`}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md flex items-center block transition-colors"
                >
                  <FileText className="w-4 h-4 mr-3 text-gray-500" />
                  Renew Lease
                </Link>
              </div>
            </div>
          </div>
        </div>
        </div>
        </div>
        
)}