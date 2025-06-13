'use client';
import { useState } from 'react';
import PaymentService from '../PaymentService';

export default function RecentPayments({ payments, onPaymentSubmit }) {
  const [showPayment, setShowPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [showPartialModal, setShowPartialModal] = useState(false);
  const [partialAmount, setPartialAmount] = useState('');
  const handlePartialPayment = async () => {
    if (!partialAmount || partialAmount <= 0) return;
    
    // Calculate balance
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const balance = lease.monthlyRent - totalPaid;
    
    // Process payment
    await processPayment(partialAmount, true, balance);
    setShowPartialModal(false);
    setPartialAmount('');
  };
  const handlePaymentClick = () => {
    setShowPayment(true);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Recent Payments</h2>
        {!showPayment ? (
          <button
            onClick={handlePaymentClick}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Make Payment
          </button>
        ) : null}
      </div>
      
      {showPayment ? (
        <div className="mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Payment Amount ($)
            </label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="w-full border rounded-lg p-2"
              placeholder="Enter amount"
            />
          </div>
          
          {paymentAmount > 0 && (
            <PaymentService
              amount={parseFloat(paymentAmount)}
              onSuccess={() => {
                onPaymentSubmit();
                setShowPayment(false);
                setPaymentAmount('');
              }}
            />
          )}
        </div>
      ) : null}
      
      {/* Rest of your existing payments display */}
      {payments.map(payment => (
  <div key={payment._id} className="border-b pb-3">
    <div className="flex justify-between">
      <div>
        <span className="font-medium">
          {new Date(payment.date).toLocaleDateString()}
        </span>
        <Link 
          href={`/tenant/payments/${payment._id}`}
          className="ml-2 text-blue-600 hover:text-blue-800 text-sm"
        >
          View Receipt
        </Link>
      </div>
      <span className="font-bold">${payment.amount.toFixed(2)}</span>
    </div>
    {/* ... rest of your payment item ... */}
    <div className="mt-4">
        <button
          onClick={() => setShowPartialModal(true)}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          Make Partial Payment
        </button>
      </div>

      {showPartialModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Partial Payment</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Amount to Pay ({lease?.currency || 'USD'})
              </label>
              <input
                type="number"
                value={partialAmount}
                onChange={(e) => setPartialAmount(e.target.value)}
                className="w-full border rounded-md p-2"
                placeholder="Enter amount"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowPartialModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handlePartialPayment}
                className="px-4 py-2 bg-blue-600 text-white rounded-md"
              >
                Confirm Partial Payment
              </button>
            </div>
          </div>
        </div>
      )}
  </div>
))}
    </div>
    
  );
}