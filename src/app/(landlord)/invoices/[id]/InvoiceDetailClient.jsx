"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import {
  ArrowLeft,
  FileText,
  Send,
  Download,
  Edit,
  Copy,
  CreditCard,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Printer,
  MoreHorizontal,
  Users,
  Home,
  Loader2,
  Check,
  X,
  Eye,
  Activity,
  Receipt,
  Shield,
  Plus
} from "lucide-react";

// Utility functions (you can move these to separate utility files)
const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-ZM', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return 'ZMW 0.00';
  return new Intl.NumberFormat('en-ZM', {
    style: 'currency',
    currency: 'ZMW'
  }).format(amount);
};

const formatShortDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-ZM', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export default function InvoiceDetailClient({ initialData }) {
  const { invoice, payments, activities, summary, permissions, currentUser } = initialData;
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showActivities, setShowActivities] = useState(false);

  const tenantName = invoice.tenant?.name || 
    `${invoice.tenant?.firstName || ''} ${invoice.tenant?.lastName || ''}`.trim() || 
    'Unknown Tenant';

  const propertyAddress = invoice.property?.address || invoice.property?.name || 'Unknown Property';

  const getStatusConfig = (status) => {
    switch (status) {
      case "draft":
        return {
          icon: <FileText className="w-5 h-5" />,
          color: "bg-gray-100 text-gray-800 border-gray-200",
          label: "Draft",
        };
      case "sent":
        return {
          icon: <Send className="w-5 h-5" />,
          color: "bg-blue-100 text-blue-800 border-blue-200",
          label: "Sent",
        };
      case "viewed":
        return {
          icon: <Eye className="w-5 h-5" />,
          color: "bg-purple-100 text-purple-800 border-purple-200",
          label: "Viewed",
        };
      case "paid":
        return {
          icon: <CheckCircle className="w-5 h-5" />,
          color: "bg-green-100 text-green-800 border-green-200",
          label: "Paid",
        };
      case "overdue":
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          color: "bg-red-100 text-red-800 border-red-200",
          label: "Overdue",
        };
      case "cancelled":
        return {
          icon: <XCircle className="w-5 h-5" />,
          color: "bg-gray-100 text-gray-800 border-gray-200",
          label: "Cancelled",
        };
      default:
        return {
          icon: <FileText className="w-5 h-5" />,
          color: "bg-gray-100 text-gray-800 border-gray-200",
          label: status || "Unknown",
        };
    }
  };

  const getApprovalStatusConfig = (status) => {
    switch (status) {
      case "pending":
        return {
          icon: <Clock className="w-4 h-4" />,
          color: "bg-yellow-100 text-yellow-800 border-yellow-200",
          label: "Pending Approval",
        };
      case "approved":
        return {
          icon: <Check className="w-4 h-4" />,
          color: "bg-green-100 text-green-800 border-green-200",
          label: "Approved",
        };
      case "rejected":
        return {
          icon: <X className="w-4 h-4" />,
          color: "bg-red-100 text-red-800 border-red-200",
          label: "Rejected",
        };
      default:
        return {
          icon: <Shield className="w-4 h-4" />,
          color: "bg-gray-100 text-gray-800 border-gray-200",
          label: status || "Unknown",
        };
    }
  };

  const statusConfig = getStatusConfig(invoice.status);
  const approvalConfig = getApprovalStatusConfig(invoice.approvalStatus);

  const handleInvoiceAction = async (action, additionalData = {}) => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/invoices/${invoice._id}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(additionalData),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || `Failed to ${action} invoice`);
      }

      const result = await response.json();
      setSuccess(result.message);

      // Refresh the page to show updated data
      setTimeout(() => {
        router.refresh();
      }, 1500);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = () => {
    const notes = prompt("Add approval notes (optional):");
    handleInvoiceAction('approve', { notes: notes || 'Approved' });
  };

  const handleReject = () => {
    const reason = prompt("Please provide a reason for rejection:");
    if (reason) {
      handleInvoiceAction('reject', { reason });
    }
  };

  const handleMarkAsPaid = () => {
    const amount = prompt(`Enter payment amount (Outstanding: ${formatCurrency(summary.outstandingAmount)}):`);
    if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
      handleInvoiceAction('mark-paid', {
        amount: parseFloat(amount),
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'manual',
        reference: `Manual payment for ${invoice.invoiceNumber}`
      });
    }
  };

  const handleSendInvoice = () => {
    if (confirm(`Send invoice ${invoice.invoiceNumber} to ${tenantName}?`)) {
      handleInvoiceAction('send');
    }
  };

  const handleCancelInvoice = () => {
    const reason = prompt("Please provide a reason for cancellation:");
    if (reason) {
      handleInvoiceAction('cancel', { reason });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/invoices/${invoice._id}/pdf`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to download PDF: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyInvoiceNumber = () => {
    navigator.clipboard.writeText(invoice.invoiceNumber);
    setSuccess('Invoice number copied to clipboard');
    setTimeout(() => setSuccess(''), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 print:hidden">
          <div className="mb-4 sm:mb-0">
            <Link
              href="/invoices"
              className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Invoices
            </Link>
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <FileText className="w-8 h-8 mr-3 text-blue-600" />
                Invoice {invoice.invoiceNumber}
              </h1>
              <button
                onClick={copyInvoiceNumber}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Copy invoice number"
              >
                <Copy className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-wrap items-center mt-2 space-x-4">
              <span className="text-gray-600 flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                Issued {formatDate(invoice.issueDate)}
              </span>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${statusConfig.color}`}>
                {statusConfig.icon}
                <span className="ml-2">{statusConfig.label}</span>
              </span>
              {invoice.approvalStatus !== invoice.status && (
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${approvalConfig.color}`}>
                  {approvalConfig.icon}
                  <span className="ml-1">{approvalConfig.label}</span>
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {permissions.canApprove && (
              <div className="flex gap-1">
                <button
                  onClick={handleApprove}
                  disabled={loading}
                  className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 transition-colors text-sm"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Approve
                </button>
                <button
                  onClick={handleReject}
                  disabled={loading}
                  className="inline-flex items-center px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 transition-colors text-sm"
                >
                  <X className="w-4 h-4 mr-1" />
                  Reject
                </button>
              </div>
            )}

            {invoice.status === 'draft' && permissions.canEdit && (
              <button
                onClick={handleSendInvoice}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Send Invoice
              </button>
            )}

            {permissions.canMarkPaid && summary.outstandingAmount > 0 && (
              <button
                onClick={handleMarkAsPaid}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 transition-colors"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Mark as Paid
              </button>
            )}

            {permissions.canAddPayment && (
              <Link
                href={`/payments/record?invoice=${invoice._id}`}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Payment
              </Link>
            )}

            {permissions.canEdit && (
              <Link
                href={`/invoices/${invoice._id}/edit`}
                className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Link>
            )}

            {permissions.canCancel && (
              <button
                onClick={handleCancelInvoice}
                disabled={loading}
                className="inline-flex items-center px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 transition-colors text-sm"
              >
                <XCircle className="w-4 h-4 mr-1" />
                Cancel
              </button>
            )}

            <div className="flex gap-1">
              <button
                onClick={handlePrint}
                className="inline-flex items-center px-3 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </button>

              {permissions.canDownload && (
                <button
                  onClick={handleDownloadPDF}
                  disabled={loading}
                  className="inline-flex items-center px-3 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:bg-gray-400 transition-colors"
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  PDF
                </button>
              )}
            </div>

            <button
              onClick={() => setShowActivities(!showActivities)}
              className="inline-flex items-center px-3 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
              <Activity className="w-4 h-4 mr-2" />
              History
            </button>
          </div>
        </div>

        <Breadcrumbs />

        {/* Alerts */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 print:hidden">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 print:hidden">
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-green-800">Success</h3>
                <p className="text-sm text-green-700 mt-1">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Overdue Warning */}
        {summary.isOverdue && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 print:hidden">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Invoice Overdue</h3>
                <p className="text-sm text-red-700 mt-1">
                  This invoice is {summary.daysPastDue} days past due. Outstanding amount: {formatCurrency(summary.outstandingAmount)}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main Invoice Content */}
          <div className="xl:col-span-3">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              {/* Invoice Header */}
              <div className="bg-blue-600 text-white p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold">INVOICE</h2>
                    <p className="text-blue-100 mt-1">#{invoice.invoiceNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-blue-100">Issue Date</p>
                    <p className="text-lg font-semibold">{formatDate(invoice.issueDate)}</p>
                    <p className="text-sm text-blue-100 mt-2">Due Date</p>
                    <p className={`text-lg font-semibold ${summary.isOverdue ? 'text-red-200' : ''}`}>
                      {formatDate(invoice.dueDate)}
                    </p>
                    {summary.isOverdue && (
                      <p className="text-red-200 text-sm mt-1">
                        {summary.daysPastDue} days overdue
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Invoice Details */}
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                  {/* Tenant Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Users className="w-5 h-5 mr-2 text-blue-600" />
                      Bill To
                    </h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="font-semibold text-gray-900">{tenantName}</p>
                      {invoice.tenant?.email && (
                        <p className="text-gray-600 flex items-center mt-1">
                          <Mail className="w-4 h-4 mr-2" />
                          {invoice.tenant.email}
                        </p>
                      )}
                      {invoice.tenant?.phone && (
                        <p className="text-gray-600 flex items-center mt-1">
                          <Phone className="w-4 h-4 mr-2" />
                          {invoice.tenant.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Property Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Home className="w-5 h-5 mr-2 text-blue-600" />
                      Property
                    </h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="font-semibold text-gray-900">{propertyAddress}</p>
                      {invoice.property?.name && invoice.property.name !== propertyAddress && (
                        <p className="text-gray-600 mt-1">{invoice.property.name}</p>
                      )}
                      <p className="text-gray-600 flex items-center mt-1">
                        <MapPin className="w-4 h-4 mr-2" />
                        {invoice.property?.type || 'Property'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Invoice Items */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Items</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border border-gray-200 rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Description</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Qty</th>
                          <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Unit Price</th>
                          <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {invoice.items && invoice.items.length > 0 ? (
                          invoice.items.map((item, index) => (
                            <tr key={index}>
                              <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                              <td className="px-4 py-3 text-sm text-gray-600 text-center">{item.quantity || 1}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                {formatCurrency(item.unitPrice || 0)}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                                {formatCurrency(item.amount || 0)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="4" className="px-4 py-8 text-center text-gray-500">
                              No items in this invoice
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Invoice Totals */}
                <div className="flex justify-end mb-8">
                  <div className="w-full max-w-sm">
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium">{formatCurrency(summary.subtotal)}</span>
                      </div>
                      {summary.taxAmount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tax:</span>
                          <span className="font-medium">{formatCurrency(summary.taxAmount)}</span>
                        </div>
                      )}
                      <div className="border-t pt-2">
                        <div className="flex justify-between">
                          <span className="text-lg font-semibold">Total:</span>
                          <span className="text-lg font-bold">{formatCurrency(summary.totalAmount)}</span>
                        </div>
                      </div>
                      {summary.paidAmount > 0 && (
                        <>
                          <div className="flex justify-between text-green-600">
                            <span>Amount Paid:</span>
                            <span className="font-medium">-{formatCurrency(summary.paidAmount)}</span>
                          </div>
                          <div className="border-t pt-2">
                            <div className="flex justify-between">
                              <span className="font-semibold">Balance Due:</span>
                              <span className={`font-bold ${summary.outstandingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {formatCurrency(summary.outstandingAmount)}
                              </span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {invoice.notes && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
                    </div>
                  </div>
                )}

                {/* Payment Terms */}
                {invoice.paymentTerms && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Terms</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-700">{invoice.paymentTerms}</p>
                    </div>
                  </div>
                )}

                {/* Invoice Footer */}
                <div className="border-t pt-6 text-center text-sm text-gray-500">
                  <p>Thank you for your business!</p>
                  <p className="mt-1">
                    If you have any questions about this invoice, please contact us.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="xl:col-span-1">
            {/* Payment History */}
            {payments && payments.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Receipt className="w-5 h-5 mr-2 text-green-600" />
                  Payment History
                </h3>
                <div className="space-y-3">
                  {payments.map((payment, index) => (
                    <div key={index} className="flex justify-between items-start border-b border-gray-100 pb-2 last:border-b-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(payment.amount)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatShortDate(payment.paymentDate)}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">
                          {payment.paymentMethod?.replace('_', ' ')}
                        </p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        payment.status === 'completed' || payment.status === 'verified' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {payment.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Activity Timeline */}
            {showActivities && activities && activities.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-blue-600" />
                  Activity Timeline
                </h3>
                <div className="space-y-4">
                  {activities.map((activity, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        {activity.type === 'created' && <Plus className="w-4 h-4 text-blue-500" />}
                        {activity.type === 'approved' && <Check className="w-4 h-4 text-green-500" />}
                        {activity.type === 'rejected' && <X className="w-4 h-4 text-red-500" />}
                        {activity.type === 'payment' && <CreditCard className="w-4 h-4 text-green-500" />}
                        {activity.type === 'updated' && <Edit className="w-4 h-4 text-blue-500" />}
                        {activity.type === 'cancelled' && <XCircle className="w-4 h-4 text-red-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                        <p className="text-xs text-gray-500">{formatShortDate(activity.date)}</p>
                        {activity.notes && (
                          <p className="text-xs text-gray-600 mt-1">{activity.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}