'use client';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { useState } from 'react';

export default function CheckoutForm({ amount, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    try {
      // 1. Create payment intent
      const res = await fetch('/api/payment/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amount * 100 }) // Convert to cents
      });
      
      if (!res.ok) throw new Error('Failed to create payment intent');
      
      const { clientSecret } = await res.json();

      
      // 2. Confirm payment
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: elements.getElement(CardElement),
          }
        }
      );

      if (stripeError) throw stripeError;
      if (paymentIntent.status === 'succeeded') {
        onSuccess();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const [currency, setCurrency] = useState('USD');
  const [exchangeRate, setExchangeRate] = useState(1);
  const [convertedAmount, setConvertedAmount] = useState(amount);

  const handleCurrencyChange = async (e) => {
    const newCurrency = e.target.value;
    if (newCurrency === 'ZMW') {
      const rate = await fetch('/api/exchange-rate').then(res => res.json());
      setExchangeRate(rate);
      setConvertedAmount((amount * rate).toFixed(2));
    } else {
      setExchangeRate(1);
      setConvertedAmount(amount);
    }
    setCurrency(newCurrency);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Currency
        </label>
        <select
          value={currency}
          onChange={handleCurrencyChange}
          className="w-full border rounded-md p-2"
        >
          <option value="USD">USD ($)</option>
          <option value="ZMW">Zambian Kwacha (ZMW)</option>
        </select>
      </div>

      <div className="mb-4 bg-blue-50 p-3 rounded">
        <p className="text-sm">
          {currency === 'ZMW' ? (
            <>${amount} USD ≈ {convertedAmount} ZMW (Rate: {exchangeRate})</>
          ) : (
            <>Payment will be processed in USD</>
          )}
        </p>
      </div>


      <div className="border rounded-lg p-4">
        <CardElement options={{
          style: {
            base: {
              fontSize: '16px',
              color: '#424770',
              '::placeholder': { color: '#aab7c4' }
            },
            invalid: { color: '#9e2146' }
          }
        }} />
      </div>
      
      {error && <div className="text-red-500 text-sm">{error}</div>}
      
      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-gray-400"
      >
        {processing ? 'Processing...' : `Pay $${amount.toFixed(2)}`}
      </button>
    </form>
  );
}