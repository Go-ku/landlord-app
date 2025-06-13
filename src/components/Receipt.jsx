// components/Receipt.jsx
'use client';
import { useState } from 'react';
import { FiDownload, FiPrinter, FiMail } from 'react-icons/fi';

export default function Receipt({ payment }) {
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState('');

  const handleSendEmail = async () => {
    setIsSending(true);
    try {
      const res = await fetch('/api/receipt/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: payment._id })
      });
      
      if (!res.ok) throw new Error('Failed to send receipt');
      setSendStatus('Receipt sent successfully!');
    } catch (err) {
      setSendStatus(err.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow max-w-2xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-bold">Payment Receipt</h2>
          <p className="text-gray-500">#{payment.receiptNumber}</p>
        </div>
        {payment.isPartial && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationIcon className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                This is a partial payment. Balance due: {payment.currency} {payment.balanceDue.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}
        <div className="flex space-x-2">
          <a 
            href={payment.receiptUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-2 text-gray-600 hover:text-blue-600"
            title="Download PDF"
          >
            <FiDownload size={20} />
          </a>
          <button 
            onClick={() => window.print()}
            className="p-2 text-gray-600 hover:text-blue-600"
            title="Print"
          >
            <FiPrinter size={20} />
          </button>
          <button 
            onClick={handleSendEmail}
            disabled={isSending}
            className="p-2 text-gray-600 hover:text-blue-600 disabled:text-gray-300"
            title="Email Receipt"
          >
            <FiMail size={20} />
          </button>
        </div>
      </div>

      {sendStatus && (
        <div className={`mb-4 p-2 rounded ${
          sendStatus.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {sendStatus}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <h3 className="font-semibold">Property</h3>
          <p>{payment.propertyId?.address || 'N/A'}</p>
        </div>
        <div>
          <h3 className="font-semibold">Tenant</h3>
          <p>{payment.tenantId?.name || 'N/A'}</p>
        </div>
        <div>
          <h3 className="font-semibold">Payment Date</h3>
          <p>{new Date(payment.date).toLocaleDateString()}</p>
        </div>
        <div>
          <h3 className="font-semibold">Payment Method</h3>
          <p>{payment.method}</p>
        </div>
      </div>

      <div className="border-t border-b border-gray-200 py-4 my-4">
        <div className="flex justify-between font-semibold">
          <span>Description</span>
          <span>Amount</span>
        </div>
        {payment.items?.map((item, index) => (
          <div key={index} className="flex justify-between py-2">
            <div>
              <p>{item.description}</p>
              {item.periodStart && (
                <p className="text-sm text-gray-500">
                  {new Date(item.periodStart).toLocaleDateString()} - {new Date(item.periodEnd).toLocaleDateString()}
                </p>
              )}
            </div>
            <p>${item.amount.toFixed(2)}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center mt-6">
        <div className="text-sm text-gray-500">
          <p>Thank you for your payment!</p>
          <p>Questions? Contact support@yourcompany.com</p>
        </div>
        <div className="text-right">
          <p className="font-semibold">Total Paid</p>
          <p className="text-2xl font-bold">${payment.amount.toFixed(2)}</p>
        </div>
      </div>
      {payment.partialPayments?.length > 0 && (
        <div className="mt-8">
          <h3 className="font-semibold mb-2">Partial Payment History</h3>
          <div className="space-y-2">
            {payment.partialPayments.map((partial, index) => (
              <div key={index} className="flex justify-between border-b pb-2">
                <div>
                  <p>{new Date(partial.date).toLocaleDateString()}</p>
                  <p className="text-sm text-gray-500">{partial.method}</p>
                </div>
                <div className="text-right">
                  <p>{payment.currency} {partial.amount.toFixed(2)}</p>
                  <a 
                    href={partial.receiptUrl} 
                    className="text-sm text-blue-600 hover:text-blue-800"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View Receipt
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    
  );
}