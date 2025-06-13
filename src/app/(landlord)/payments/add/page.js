'use client';
import { useState, useEffect } from 'react';
import AddPaymentForm from '@/components/forms/AddPaymentForm';

export default function AddPaymentPage() {
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Fetch tenants
        const tenantsRes = await fetch('/api/tenants');
        let tenantsData = [];
        if (tenantsRes.ok) {
          const result = await tenantsRes.json();
          tenantsData = result.data || result || [];
        }

        // Fetch properties
        const propertiesRes = await fetch('/api/properties');
        let propertiesData = [];
        if (propertiesRes.ok) {
          const result = await propertiesRes.json();
          propertiesData = result.data || result || [];
        }

        setTenants(Array.isArray(tenantsData) ? tenantsData : []);
        setProperties(Array.isArray(propertiesData) ? propertiesData : []);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Add Payment</h1>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Add Payment</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Error loading data: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Add Payment</h1>
      <AddPaymentForm tenants={tenants} properties={properties} />
    </div>
  );
}