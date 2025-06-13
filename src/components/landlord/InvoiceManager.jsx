// components/landlord/InvoiceManager.jsx
'use client';
import { useState, useEffect } from 'react';
import { FiPlus, FiSend, FiDownload, FiEye } from 'react-icons/fi';
import NewInvoiceModal from './NewInvoiceModal';

export default function InvoiceManager({ propertyId, tenantId }) {
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, [propertyId, tenantId]);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      let url = '/api/invoices';
      if (propertyId || tenantId) {
        const params = new URLSearchParams();
        if (propertyId) params.append('propertyId', propertyId);
        if (tenantId) params.append('tenantId', tenantId);
        url += `?${params.toString()}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      setInvoices(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const sendInvoice = async (invoiceId) => {
    try {
      await fetch(`/api/invoices/${invoiceId}/send`, { method: 'POST' });
      fetchInvoices();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Rent Invoices</h2>
        <button
          onClick={() => setShowNewModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded flex items-center"
        >
          <FiPlus className="mr-2" /> New Invoice
        </button>
      </div>

      {isLoading ? (
        <div>Loading invoices...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <tr key={invoice._id}>
                  <td className="px-6 py-4 whitespace-nowrap">{invoice.invoiceNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {invoice.tenantId?.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(invoice.dueDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    ${invoice.total.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                      invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                      invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap flex space-x-2">
                    <button
                      onClick={() => sendInvoice(invoice._id)}
                      disabled={invoice.status !== 'draft'}
                      className="text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                      title="Send to Tenant"
                    >
                      <FiSend />
                    </button>
                    <a
                      href={`/api/invoices/${invoice._id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 hover:text-green-800"
                      title="Download PDF"
                    >
                      <FiDownload />
                    </a>
                    <button
                      onClick={() => router.push(`/landlord/invoices/${invoice._id}`)}
                      className="text-purple-600 hover:text-purple-800"
                      title="View Details"
                    >
                      <FiEye />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NewInvoiceModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        propertyId={propertyId}
        tenantId={tenantId}
        onSuccess={fetchInvoices}
      />
    </div>
  );
}