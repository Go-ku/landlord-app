    // app/tenant/payments/[id]/page.jsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Receipt from '@/components/Receipt';
import { useSession } from 'next-auth/react';

export default function PaymentReceipt({ params }) {
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    if (!session) return;

    const fetchPayment = async () => {
      try {
        const res = await fetch(`/api/payments/${params.id}`);
        if (!res.ok) throw new Error('Failed to fetch payment');
        
        const data = await res.json();
        if (data.tenantId !== session.user.id) {
          router.push('/tenant/payments');
          return;
        }
        
        setPayment(data);
      } catch (err) {
        console.error(err);
        router.push('/tenant/payments');
      } finally {
        setLoading(false);
      }
    };

    fetchPayment();
  }, [session, params.id]);

  if (loading) return <div className="p-4">Loading...</div>;
  if (!payment) return <div className="p-4">Payment not found</div>;

  return (
    <div className="container mx-auto p-4">
      <button 
        onClick={() => router.back()}
        className="mb-4 text-blue-600 hover:text-blue-800"
      >
        ← Back to Payments
      </button>
      <Receipt payment={payment} />
    </div>
  );
}