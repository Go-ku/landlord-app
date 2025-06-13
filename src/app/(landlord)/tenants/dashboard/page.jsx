'use client';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import TenantOverview from '@/components/tenant/TenantOverview';
import RecentPayments from '@/components/tenant/RecentPayments';
import MaintenanceRequests from '@/components/tenant/MaintenanceRequests';
import { useRouter } from 'next/navigation';

export default function TenantDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tenantData, setTenantData] = useState(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated' && session?.user?.role === 'tenant') {
      fetchTenantData();
    }
  }, [status, session]);

  const fetchTenantData = async () => {
    try {
      const res = await fetch('/api/tenant', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!res.ok) throw new Error('Failed to fetch tenant data');
      
      const data = await res.json();
      setTenantData(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || status === 'loading') {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  if (!tenantData) {
    return <div className="container mx-auto p-4">Error loading tenant data</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Tenant Dashboard</h1>
      
      <TenantOverview 
        property={tenantData.property} 
        lease={tenantData.lease} 
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <RecentPayments 
          payments={tenantData.payments} 
          onPaymentSubmit={fetchTenantData} 
        />
        <MaintenanceRequests 
          requests={tenantData.maintenanceRequests} 
          propertyId={tenantData.property?._id} 
          onNewRequest={fetchTenantData} 
        />
      </div>
    </div>
  );
}