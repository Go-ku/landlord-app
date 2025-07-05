// app/dashboard/leases/create/page.js
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import CreateLeaseForm from './CreateLeaseForm';
import dbConnect from 'lib/db';
import PropertyRequest from 'models/PropertyRequest';
import User  from 'models/User';
import Property from 'models/Property';

async function getPrefilledData(searchParams) {
  const { tenant, property, requestId } = searchParams;
  
  if (!tenant && !requestId) return null;

  try {
    await dbConnect();
    
    let tenantData = null;
    let propertyData = null;
    let requestData = null;

    // Get tenant data
    if (tenant) {
      tenantData = await User.findById(tenant).select('name email phone').lean();
    }

    // Get property data
    if (property) {
      propertyData = await Property.findById(property).select('address type monthlyRent bedrooms bathrooms securityDeposit').lean();
    }

    // Get request data for additional context
    if (requestId) {
      requestData = await PropertyRequest.findById(requestId)
        .populate('tenant', 'name email phone')
        .populate('property', 'address type monthlyRent bedrooms bathrooms securityDeposit')
        .lean();
        
      if (requestData) {
        tenantData = requestData.tenant;
        propertyData = requestData.property || {
          address: requestData.requestedPropertyDetails?.address,
          type: requestData.requestedPropertyDetails?.propertyType,
          monthlyRent: requestData.requestedPropertyDetails?.estimatedRent
        };
      }
    }

    return {
      tenant: tenantData,
      property: propertyData,
      request: requestData
    };
  } catch (error) {
    console.error('Error fetching prefilled data:', error);
    return null;
  }
}

export default async function CreateLeasePage({ searchParams }) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/auth/signin');
  }

  if (session.user.role !== 'landlord') {
    redirect('/dashboard');
  }

  const prefilledData = await getPrefilledData(searchParams);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create New Lease</h1>
          <p className="text-gray-600 mt-2">
            {prefilledData ? 
              `Creating lease for ${prefilledData.tenant?.name} - ${prefilledData.property?.address || 'Property details to be confirmed'}` :
              'Set up a new lease agreement'
            }
          </p>
        </div>

        <CreateLeaseForm 
          prefilledData={prefilledData}
          landlordId={session.user.id}
        />
      </div>
    </div>
  );
}