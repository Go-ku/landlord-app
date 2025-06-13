import MaintenanceRequestForm from '@/components/maintenance/MaintenanceRequestForm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import Property from 'models/Property';
import Tenant from 'models/Tenant';
import dbConnect from 'lib/db';

async function getFormData() {
  await dbConnect();
  
  const [properties, tenants] = await Promise.all([
    Property.find({}).sort({ address: 1 }).lean(),
    Tenant.find({ status: 'active' }).populate('propertyId').lean()
  ]);

  return {
    properties: JSON.parse(JSON.stringify(properties)),
    tenants: JSON.parse(JSON.stringify(tenants))
  };
}

export default async function NewMaintenancePage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/auth/login');
  }

  const { properties, tenants } = await getFormData();

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Create Maintenance Request</h1>
        <p className="text-gray-600 mt-1">
          Report new maintenance issues for your properties
        </p>
      </div>
      
      <MaintenanceRequestForm 
        properties={properties} 
        tenants={tenants} 
        landlordId={session.user.id} 
      />
    </div>
  );
}