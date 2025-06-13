// components/landlord/NewInvoiceModal.jsx
'use client';
import { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useSession } from 'next-auth/react';

export default function NewInvoiceModal({ isOpen, onClose, propertyId, tenantId, onSuccess }) {
  const { data: session } = useSession();
  const [formData, setFormData] = useState({
    tenantId: tenantId || '',
    propertyId: propertyId || '',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default: 7 days from now
    items: [{
      description: 'Monthly Rent',
      amount: 0,
      taxRate: 0,
      periodStart: new Date(),
      periodEnd: new Date(new Date().setMonth(new Date().getMonth() + 1))
    }],
    notes: ''
  });
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (session?.user?.id) {
      fetchProperties();
      fetchTenants();
    }
  }, [session]);

  const fetchProperties = async () => {
    const res = await fetch('/api/properties?landlordOnly=true');
    const data = await res.json();
    setProperties(data);
    if (data.length > 0 && !propertyId) {
      setFormData(prev => ({ ...prev, propertyId: data[0]._id }));
    }
  };

  const fetchTenants = async () => {
    const res = await fetch('/api/tenants');
    const data = await res.json();
    setTenants(data);
    if (data.length > 0 && !tenantId) {
      setFormData(prev => ({ ...prev, tenantId: data[0]._id }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Calculate totals
      const subtotal = formData.items.reduce((sum, item) => sum + item.amount, 0);
      const tax = formData.items.reduce((sum, item) => sum + (item.amount * (item.taxRate / 100)), 0);
      const total = subtotal + tax;

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          subtotal,
          tax,
          total,
          balanceDue: total
        })
      });

      if (!response.ok) throw new Error('Failed to create invoice');
      
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Create New Invoice</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Property*
              </label>
              <select
                value={formData.propertyId}
                onChange={(e) => setFormData({...formData, propertyId: e.target.value})}
                className="w-full border border-gray-300 rounded-md p-2"
                required
                disabled={!!propertyId}
              >
                {properties.map(property => (
                  <option key={property._id} value={property._id}>
                    {property.address}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tenant*
              </label>
              <select
                value={formData.tenantId}
                onChange={(e) => setFormData({...formData, tenantId: e.target.value})}
                className="w-full border border-gray-300 rounded-md p-2"
                required
                disabled={!!tenantId}
              >
                {tenants.map(tenant => (
                  <option key={tenant._id} value={tenant._id}>
                    {tenant.name} ({tenant.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Due Date*
            </label>
            <DatePicker
              selected={formData.dueDate}
              onChange={(date) => setFormData({...formData, dueDate: date})}
              minDate={new Date()}
              className="w-full border border-gray-300 rounded-md p-2"
              required
            />
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="font-medium mb-2">Invoice Items</h3>
            
            {formData.items.map((item, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-4 p-2 bg-gray-50 rounded">
                <div className="md:col-span-2">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => {
                      const newItems = [...formData.items];
                      newItems[index].description = e.target.value;
                      setFormData({...formData, items: newItems});
                    }}
                    className="w-full border border-gray-300 rounded-md p-2"
                    placeholder="Description"
                    required
                  />
                </div>
                <div>
                  <input
                    type="number"
                    value={item.amount}
                    onChange={(e) => {
                      const newItems = [...formData.items];
                      newItems[index].amount = parseFloat(e.target.value) || 0;
                      setFormData({...formData, items: newItems});
                    }}
                    className="w-full border border-gray-300 rounded-md p-2"
                    placeholder="Amount"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <input
                    type="number"
                    value={item.taxRate}
                    onChange={(e) => {
                      const newItems = [...formData.items];
                      newItems[index].taxRate = parseFloat(e.target.value) || 0;
                      setFormData({...formData, items: newItems});
                    }}
                    className="w-full border border-gray-300 rounded-md p-2"
                    placeholder="Tax %"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => {
                      const newItems = [...formData.items];
                      newItems.splice(index, 1);
                      setFormData({...formData, items: newItems});
                    }}
                    className="text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => setFormData({
                ...formData,
                items: [...formData.items, {
                  description: '',
                  amount: 0,
                  taxRate: 0,
                  periodStart: new Date(),
                  periodEnd: new Date()
                }]
              })}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              + Add Item
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={2}
              className="w-full border border-gray-300 rounded-md p-2"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:bg-gray-400"
            >
              {isSubmitting ? 'Creating...' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}