// src/app/maintenance/new/page.js
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import dbConnect from 'lib/db';
import Property from 'models/Property';
import User from 'models/User';
import Lease from 'models/Lease';
import MaintenanceRequestForm from './MaintenanceRequestForm';
import { ArrowLeft, Wrench, AlertCircle } from 'lucide-react';

// Helper function to serialize MongoDB data
function serializeData(data) {
  if (!data) return null;
  
  return JSON.parse(JSON.stringify(data, (key, value) => {
    if (value && typeof value === 'object' && value.constructor?.name === 'ObjectId') {
      return value.toString();
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  }));
}

async function getFormData(userId, userRole) {
  try {
    await dbConnect();
    
    let properties = [];
    let tenants = [];
    let leases = [];
    
    if (userRole === 'tenant') {
      // Tenants can only create requests for properties they lease
      const tenantLeases = await Lease.find({ 
        tenantId: userId, 
        status: { $in: ['active', 'draft'] }
      })
      .populate('propertyId', 'address name type')
      .populate('landlord', 'name firstName lastName email')
      .lean();
      
      properties = tenantLeases.map(lease => lease.propertyId).filter(Boolean);
      leases = tenantLeases;
      
    } else if (userRole === 'landlord') {
      // Landlords can create requests for their properties
      const landlordProperties = await Property.find({ landlord: userId })
        .select('address name type bedrooms bathrooms')
        .sort({ address: 1 })
        .lean();
      
      properties = landlordProperties;
      
      // Get tenants for landlord's properties
      const propertyIds = landlordProperties.map(p => p._id);
      const activeLeases = await Lease.find({
        propertyId: { $in: propertyIds },
        status: 'active'
      })
      .populate('tenantId', 'name firstName lastName email phone')
      .populate('propertyId', 'address name')
      .lean();
      
      tenants = activeLeases.map(lease => ({
        ...lease.tenantId,
        propertyInfo: lease.propertyId
      })).filter(Boolean);
      
      leases = activeLeases;
      
    } else if (['manager', 'admin'].includes(userRole)) {
      // Managers and admins can see all properties and tenants
      const [allProperties, allLeases] = await Promise.all([
        Property.find({})
          .populate('landlord', 'name')
          .select('address type bedrooms bathrooms landlord')
          .sort({ address: 1 })
          .lean(),
        
        Lease.find({ status: { $in: ['active', 'draft'] } })
          .populate('tenantId', 'name firstName lastName email phone')
          .populate('propertyId', 'address name')
          .populate('landlord', 'name firstName lastName')
          .lean()
      ]);
      
      properties = allProperties;
      leases = allLeases;
      tenants = allLeases.map(lease => ({
        ...lease.tenantId,
        propertyInfo: lease.propertyId,
        landlordInfo: lease.landlord
      })).filter(Boolean);
      
    } else {
      // Other roles should not access this page
      throw new Error('Unauthorized access');
    }

    return {
      properties: serializeData(properties),
      tenants: serializeData(tenants),
      leases: serializeData(leases),
      currentUser: { id: userId, role: userRole }
    };

  } catch (error) {
    console.error('Error fetching form data:', error);
    return {
      properties: [],
      tenants: [],
      leases: [],
      currentUser: { id: userId, role: userRole },
      error: error.message
    };
  }
}

export default async function NewMaintenancePage({ searchParams }) {
  // Await searchParams for Next.js 15 compatibility
  const params = await searchParams;
  
  // Check authentication
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/maintenance/new');
  }

  // Check if user has permission to create maintenance requests
  const allowedRoles = ['tenant', 'landlord', 'manager', 'admin'];
  if (!allowedRoles.includes(session.user.role)) {
    redirect('/unauthorized?reason=insufficient_permissions');
  }

  const data = await getFormData(session.user.id, session.user.role);
  
  // Handle errors
  if (data.error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Error</h2>
          <p className="text-gray-600 mb-6">{data.error}</p>
          <Link
            href="/maintenance"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Maintenance
          </Link>
        </div>
      </div>
    );
  }

  // Check if user has required data
  if (data.properties.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-6">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wrench className="w-8 h-8 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {session.user.role === 'tenant' ? 'No Active Lease Found' : 'No Properties Found'}
          </h2>
          <p className="text-gray-600 mb-6">
            {session.user.role === 'tenant' 
              ? 'You need an active lease to submit maintenance requests.'
              : session.user.role === 'landlord'
              ? 'You need to add properties before creating maintenance requests.'
              : 'There are no properties available in the system.'
            }
          </p>
          <div className="space-y-3">
            {session.user.role === 'landlord' && (
              <Link
                href="/properties/create"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Add Property
              </Link>
            )}
            <div>
              <Link
                href="/maintenance"
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                ← Back to Maintenance Requests
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/maintenance"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Maintenance Requests
          </Link>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Wrench className="w-8 h-8 mr-3 text-blue-600" />
              Create Maintenance Request
            </h1>
            <p className="text-gray-600 mt-2">
              {session.user.role === 'tenant' 
                ? 'Report maintenance issues for your rental property'
                : session.user.role === 'landlord'
                ? 'Create maintenance requests for your properties'
                : 'Create maintenance requests for any property'
              }
            </p>
            
            {session.user.role === 'tenant' && data.properties.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Property:</strong> {data.properties[0].address}
                  {data.properties[0].name && ` - ${data.properties[0].name}`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Form Component */}
        <MaintenanceRequestForm 
          initialData={data}
          searchParams={params}
        />
      </div>
    </div>
  );
}

export async function generateMetadata({ searchParams }) {
  // Await searchParams for Next.js 15 compatibility
  const params = await searchParams;
  
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return {
      title: 'Create Maintenance Request - Authentication Required',
      description: 'Please sign in to create maintenance requests',
    };
  }

  let title = 'Create Maintenance Request - Property Management';
  let description = 'Submit a new maintenance request for property repairs and issues';
  
  if (session.user.role === 'tenant') {
    title = 'Report Property Issue - Maintenance Request';
    description = 'Submit a maintenance request for issues in your rental property';
  } else if (session.user.role === 'landlord') {
    title = 'Create Property Maintenance Request';
    description = 'Create maintenance requests for your rental properties';
  }

  // Check if pre-selecting specific property
  const propertyId = params?.propertyId;
  if (propertyId) {
    try {
      await dbConnect();
      const property = await Property.findById(propertyId).select('address name').lean();
      if (property) {
        const propertyName = property.address || property.name || 'Property';
        title = `Maintenance Request for ${propertyName}`;
        description = `Create a maintenance request for ${propertyName}`;
      }
    } catch (error) {
      console.error('Error fetching property for metadata:', error);
    }
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
  };
}