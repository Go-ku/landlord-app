// components/landlord/InvoiceDetails.jsx
'use client';
import { FiPrinter, FiSend, FiMail, FiDollarSign } from 'react-icons/fi';
import { formatCurrency } from '@/utils/currency';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

export default function InvoiceDetails({ invoice }) {
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isSending, setIsSending] = useState(false);

  const sendInvoice = async () => {
    setIsSending(true);
    try {
      await fetch(`/api/invoices/${invoice._id}/send`, { method: 'POST' });
      // Refresh data or show success message
    } finally {
      setIsSending(false);
    }
  };

  const recordPayment = async () => {
    if (!paymentAmount || paymentAmount <= 0) return;
    
    try {
      await fetch(`/api/invoices/${invoice._id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: paymentAmount })
      });
      // Refresh data or show success message
      setPaymentAmount('');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold">Invoice #{invoice.invoiceNumber}</h1>
            <p className="text-gray-500">
              Issued: {new Date(invoice.issueDate).toLocaleDateString()}
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={sendInvoice}
              disabled={invoice.status !== 'draft' || isSending}
              className="p-2 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 disabled:bg-gray-100 disabled:text-gray-400"
              title="Send to Tenant"
            >
              <FiSend size={20} />
            </button>
            <a
              href={`/api/invoices/${invoice._id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-green-100 text-green-600 rounded hover:bg-green-200"
              title="Print"
            >
              <FiPrinter size={20} />
            </a>
            <button
              className="p-2 bg-purple-100 text-purple-600 rounded hover:bg-purple-200"
              title="Email"
            >
              <FiMail size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="font-semibold mb-2">Landlord</h3>
            <p>Your Property Management</p>
            <p>123 Business St</p>
            <p>City, State ZIP</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Tenant</h3>
            <p>{invoice.tenantId?.name || 'N/A'}</p>
            <p>{invoice.propertyId?.address || 'N/A'}</p>
            <p>{invoice.tenantId?.email || ''}</p>
            <p>{invoice.tenantId?.phone || ''}</p>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <p><strong>Due Date:</strong> {new Date(invoice.dueDate).toLocaleDateString()}</p>
            <p><strong>Status:</strong> 
              <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {invoice.status}
              </span>
            </p>
          </div>
        </div>

        <div className="border-t border-b border-gray-200 py-4 my-4">
          <div className="grid grid-cols-5 gap-4 font-semibold mb-2">
            <div className="col-span-2">Description</div>
            <div>Amount</div>
            <div>Tax</div>
            <div>Total</div>
          </div>
          
          {invoice.items.map((item, index) => (
            <div key={index} className="grid grid-cols-5 gap-4 py-2 border-b border-gray-100">
              <div className="col-span-2">
                <p>{item.description}</p>
                {item.periodStart && (
                  <p className="text-sm text-gray-500">
                    {new Date(item.periodStart).toLocaleDateString()} - {new Date(item.periodEnd).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div>{formatCurrency(item.amount, invoice.currency)}</div>
              <div>{item.taxRate}% ({formatCurrency(item.amount * (item.taxRate / 100), invoice.currency)})</div>
              <div>{formatCurrency(item.amount * (1 + item.taxRate / 100), invoice.currency)}</div>
            </div>
          ))}
        </div>

        <div className="flex justify-end mb-8">
          <div className="w-64 space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(invoice.subtotal, invoice.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax:</span>
              <span>{formatCurrency(invoice.tax, invoice.currency)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total:</span>
              <span>{formatCurrency(invoice.total, invoice.currency)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Amount Paid:</span>
              <span>{formatCurrency(invoice.amountPaid, invoice.currency)}</span>
            </div>
            <div className="flex justify-between font-bold border-t pt-2">
              <span>Balance Due:</span>
              <span>{formatCurrency(invoice.balanceDue, invoice.currency)}</span>
            </div>
          </div>
        </div>

        {invoice.notes && (
          <div className="mb-8 p-4 bg-gray-50 rounded">
            <h3 className="font-semibold mb-2">Notes</h3>
            <p>{invoice.notes}</p>
          </div>
        )}

        <div className="mt-8">
          <h3 className="font-semibold mb-4">Payment History</h3>
          
          {invoice.paymentHistory?.length > 0 ? (
            <div className="space-y-4">
              {invoice.paymentHistory.map((payment, index) => (
                <div key={index} className="border-b pb-4">
                  <div className="flex justify-between">
                    <div>
                      <p>{new Date(payment.date).toLocaleDateString()}</p>
                      <p className="text-sm text-gray-500">
                        {payment.paymentId?.method || 'Manual entry'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {formatCurrency(payment.amount, invoice.currency)}
                      </p>
                      {payment.paymentId?.receiptUrl && (
                        <a 
                          href={payment.paymentId.receiptUrl} 
                          className="text-sm text-blue-600 hover:text-blue-800"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View Receipt
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No payments recorded yet</p>
          )}

          <div className="mt-6 p-4 bg-gray-50 rounded">
            <h3 className="font-semibold mb-2">Record Payment</h3>
            <div className="flex items-center space-x-2">
              <div className="flex-1">
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full border rounded-md p-2"
                  placeholder={`Amount in ${invoice.currency}`}
                  min="0.01"
                  step="0.01"
                  max={invoice.balanceDue}
                />
              </div>
              <button
                onClick={recordPayment}
                disabled={!paymentAmount || paymentAmount <= 0}
                className="bg-green-600 text-white px-4 py-2 rounded flex items-center disabled:bg-gray-400"
              >
                <FiDollarSign className="mr-2" /> Record
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}