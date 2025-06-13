"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import { formatDate } from "utils/date";
import { formatCurrency } from "utils/currency";
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
} from "lucide-react";

export default function InvoiceDetailClient({ invoiceData }) {
  const { invoice } = invoiceData;
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const tenantName = invoice.tenantId?.name || 
    `${invoice.tenantId?.firstName || ''} ${invoice.tenantId?.lastName || ''}`.trim() || 
    'Unknown Tenant';

  const getStatusConfig = (status) => {
    switch (status) {
      case "draft":
        return {
          icon: <FileText className="w-5 h-5" />,
          color: "bg-gray-100 text-gray-800",
          label: "Draft",
        };
      case "sent":
        return {
          icon: <Clock className="w-5 h-5" />,
          color: "bg-blue-100 text-blue-800",
          label: "Sent",
        };
      case "paid":
        return {
          icon: <CheckCircle className="w-5 h-5" />,
          color: "bg-green-100 text-green-800",
          label: "Paid",
        };
      case "overdue":
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          color: "bg-red-100 text-red-800",
          label: "Overdue",
        };
      case "cancelled":
        return {
          icon: <XCircle className="w-5 h-5" />,
          color: "bg-gray-100 text-gray-800",
          label: "Cancelled",
        };
      default:
        return {
          icon: <FileText className="w-5 h-5" />,
          color: "bg-gray-100 text-gray-800",
          label: status || "Unknown",
        };
    }
  };

  const statusConfig = getStatusConfig(invoice.status);
  const isOverdue = invoice.status === 'overdue' || 
    (invoice.status === 'sent' && new Date(invoice.dueDate) < new Date());

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
        window.location.reload();
      }, 1500);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = () => {
    const amount = prompt(`Enter payment amount (Balance: ${formatCurrency(invoice.balanceDue || invoice.total)}):`);
    if (amount && !isNaN(amount)) {
      handleInvoiceAction('mark-paid', {
        amount: parseFloat(amount),
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'other',
        reference: `Manual payment for ${invoice.invoiceNumber}`
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // This would integrate with a PDF generation service
    console.log('Download PDF functionality would be implemented here');
    alert('PDF download functionality would be implemented here');
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
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <FileText className="w-8 h-8 mr-3 text-blue-600" />
              Invoice {invoice.invoiceNumber}
            </h1>
            <div className="flex items-center mt-2 space-x-4">
              <span className="text-gray-600 flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                Issued {formatDate(invoice.issueDate)}
              </span>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusConfig.color}`}>
                {statusConfig.icon}
                <span className="ml-2">{statusConfig.label}</span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {invoice.status === 'draft' && (
              <button
                onClick={() => handleInvoiceAction('send')}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Send Invoice
              </button>
            )}

            {['sent', 'overdue'].includes(invoice.status) && (
              <button
                onClick={handleMarkAsPaid}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 transition-colors"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Mark as Paid
              </button>
            )}

            {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
              <Link
                href={`/invoices/${invoice._id}/edit`}
                className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Link>
            )}

            <button
              onClick={handlePrint}
              className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </button>

            <button
              onClick={handleDownloadPDF}
              className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              PDF
            </button>
          </div>
        </div>

        <Breadcrumbs />

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 print:hidden">
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
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 print:hidden">
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-green-800">Success</h3>
                <p className="text-sm text-green-700 mt-1">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Content */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Invoice Header */}
          <div className="bg-blue-600 text-white p-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold">INVOICE</h2>
                <p className="text-blue-100 mt-1">Invoice #{invoice.invoiceNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-blue-100">Issue Date</p>
                <p className="text-lg font-semibold">{formatDate(invoice.issueDate)}</p>
                <p className="text-sm text-blue-100 mt-2">Due Date</p>
                <p className={`text-lg font-semibold ${isOverdue ? 'text-red-200' : ''}`}>
                  {formatDate(invoice.dueDate)}
                </p>
                {isOverdue && (
                  <p className="text-red-200 text-sm mt-1">
                    {Math.ceil((new Date() - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24))} days overdue
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
                  {invoice.tenantId?.email && (
                    <p className="text-gray-600 flex items-center mt-1">
                      <Mail className="w-4 h-4 mr-2" />
                      {invoice.tenantId.email}
                    </p>
                  )}
                  {invoice.tenantId?.phone && (
                    <p className="text-gray-600 flex items-center mt-1">
                      <Phone className="w-4 h-4 mr-2" />
                      {invoice.tenantId.phone}
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
                  <p className="font-semibold text-gray-900">
                    {invoice.propertyId?.address || 'Unknown Property'}
                  </p>
                  {invoice.propertyId?.name && (
                    <p className="text-gray-600 mt-1">{invoice.propertyId.name}</p>
                  )}
                  <p className="text-gray-600 flex items-center mt-1">
                    <MapPin className="w-4 h-4 mr-2" />
                    {invoice.propertyId?.type || 'Property'}
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
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Period</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Amount</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Tax Rate</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {invoice.items && invoice.items.length > 0 ? (
                      invoice.items.map((item, index) => {
                        const itemTax = (item.amount || 0) * (item.taxRate || 0) / 100;
                        const itemTotal = (item.amount || 0) + itemTax;
                        
                        return (
                          <tr key={index}>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {item.periodStart && item.periodEnd ? (
                                `${formatDate(item.periodStart)} - ${formatDate(item.periodEnd)}`
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">
                              {formatCurrency(item.amount || 0)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 text-right">
                              {item.taxRate || 0}%
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                              {formatCurrency(itemTotal)}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
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
                    <span className="font-medium">{formatCurrency(invoice.subtotal || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax:</span>
                    <span className="font-medium">{formatCurrency(invoice.tax || 0)}</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between">
                      <span className="text-lg font-semibold">Total:</span>
                      <span className="text-lg font-bold">{formatCurrency(invoice.total || 0)}</span>
                    </div>
                  </div>
                  {invoice.amountPaid > 0 && (
                    <>
                      <div className="flex justify-between text-green-600">
                        <span>Amount Paid:</span>
                        <span className="font-medium">-{formatCurrency(invoice.amountPaid)}</span>
                      </div>
                      <div className="border-t pt-2">
                        <div className="flex justify-between">
                          <span className="font-semibold">Balance Due:</span>
                          <span className={`font-bold ${invoice.balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(invoice.balanceDue || 0)}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Payment History */}
            {invoice.paymentHistory && invoice.paymentHistory.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h3>
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
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            {invoice.notes && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
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
    </div>
  );
}