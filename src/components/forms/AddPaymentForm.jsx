'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

export default function AddPaymentForm({ tenants }) {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

// src/components/forms/AddPaymentForm.jsx
const onSubmit = async (data) => {
    setIsSubmitting(true);
    setError('');
    
    try {
      console.log('Submitting payment data:', data); // Debug log
      
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
  
      const responseData = await response.json(); // Always parse JSON
      console.log('API Response:', responseData); // Debug log
  
      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to record payment');
      }
  
      router.push('/rent');
    } catch (err) {
      console.error('Payment submission error:', err); // Debug log
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && <div className="bg-red-100 text-red-700 p-2 rounded">{error}</div>}
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Tenant*</label>
        <select
          {...register('tenantId', { required: 'Tenant is required' })}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
        >
          <option value="">Select tenant</option>
          {tenants.map((tenant) => (
            <option key={tenant._id} value={tenant._id}>
              {tenant.name} - {tenant.propertyId?.address}
            </option>
          ))}
        </select>
        {errors.tenantId && <p className="text-red-500 text-sm">{errors.tenantId.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Amount ($)*</label>
        <input
          type="number"
          step="0.01"
          {...register('amount', { required: 'Amount is required', min: 0.01 })}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
        />
        {errors.amount && <p className="text-red-500 text-sm">{errors.amount.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Payment Date*</label>
        <input
          type="date"
          {...register('date', { required: 'Date is required' })}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
          defaultValue={new Date().toISOString().split('T')[0]}
        />
        {errors.date && <p className="text-red-500 text-sm">{errors.date.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Payment Method*</label>
        <select
          {...register('method', { required: 'Method is required' })}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
        >
          <option value="">Select method</option>
          <option value="Bank Transfer">Bank Transfer</option>
          <option value="Cash">Cash</option>
          <option value="Check">Check</option>
          <option value="Credit Card">Credit Card</option>
          <option value="Online">Online</option>
        </select>
        {errors.method && <p className="text-red-500 text-sm">{errors.method.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Notes</label>
        <textarea
          {...register('notes')}
          rows={3}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
        />
      </div>

      <div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isSubmitting ? 'Recording...' : 'Record Payment'}
        </button>
      </div>
    </form>
  );
}