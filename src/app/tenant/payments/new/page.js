import { auth } from 'lib/auth';
import TenantPaymentForm from '@/components/tenant/payments/TenantPaymentForm';
import { getLeasesByTenantId } from 'lib/data/leases';

export default async function TenantPaymentPage() {
  const session = await auth();

  if (!session || session.user.role !== 'tenant') {
    return <div className="p-6 text-red-600">Unauthorized. Tenants only.</div>;
  }

  const leases = await getLeasesByTenantId(session.user.id);

  const activeLease = leases.find(lease => lease.status === 'active' || lease.status === 'signed');

  if (!activeLease) {
    return (
      <div className="p-6 text-gray-700">
        You do not have an active lease at this time. Please contact your landlord for assistance.
      </div>
    );
  }

  return (
  <TenantPaymentForm 
    lease={JSON.parse(JSON.stringify(activeLease))} 
    tenant={session.user} 
  />
);

}
