// src/app/tenants/create/page.js
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import dbConnect from 'lib/db';
import Property from 'models/Property';
import User from 'models/User';
import Lease from 'models/Lease';
import AddTenantForm from './AddTenantForm';
import { ArrowLeft, Users, AlertCircle, Home } from 'lucide-react';

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
    let existingTenants = [];
    let availableProperties = [];
    
    if (userRole === 'landlord') {
      // Landlords can only add tenants to their properties
      const landlordProperties = await Property.find({ landlord: userId })
        .select('address name type monthlyRent bedrooms bathrooms isAvailable')
        .sort({ address: 1 })
        .lean();
      
      properties = landlordProperties;
      
      // Get properties that don't have active leases (available for new tenants)
      const occupiedPropertyIds = await Lease.find({ 
        status: 'active',
        propertyId: { $in: landlordProperties.map(p => p._id) }
      }).distinct('propertyId');
      
      availableProperties = landlordProperties.filter(
        property => !occupiedPropertyIds.some(id => id.toString() === property._id.toString())
      );
      
    } else if (['manager', 'admin'].includes(userRole)) {
      // Managers and admins can see all properties
      const allProperties = await Property.find({})
        .populate('landlord', 'name firstName lastName')
        .select('address name type monthlyRent bedrooms bathrooms isAvailable landlord')
        .sort({ address: 1 })
        .lean();
      
      properties = allProperties;
      
      // Get available properties (not occupied)
      const occupiedPropertyIds = await Lease.find({ status: 'active' }).distinct('propertyId');
      availableProperties = allProperties.filter(
        property => !occupiedPropertyIds.some(id => id.toString() === property._id.toString())
      );
      
    } else {
      // Other roles should not access this page
      throw new Error('Unauthorized access');
    }

    // Get existing tenants to check for duplicates
    existingTenants = await User.find({ 
      role: 'tenant',
      isActive: true 
    })
    .select('email name firstName lastName phone')
    .lean();

    return {
      properties: serializeData(properties),
      availableProperties: serializeData(availableProperties),
      existingTenants: serializeData(existingTenants),
      currentUser: { id: userId, role: userRole }
    };

  } catch (error) {
    console.error('Error fetching form data:', error);
    return {
      properties: [],
      availableProperties: [],
      existingTenants: [],
      currentUser: { id: userId, role: userRole },
      error: error.message
    };
  }
}

export default async function AddTenantPage({ searchParams }) {
  // Await searchParams for Next.js 15 compatibility
  const params = await searchParams;
  
  // Check authentication
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/tenants/create');
  }

  // Check if user has permission to add tenants
  const allowedRoles = ['landlord', 'manager', 'admin'];
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
            href="/tenants"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tenants
          </Link>
        </div>
      </div>
    );
  }

  // Check if user has properties (for landlords)
  if (session.user.role === 'landlord' && data.properties.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-6">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Home className="w-8 h-8 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Properties Found</h2>
          <p className="text-gray-600 mb-6">
            You need to add properties before you can create tenant accounts.
          </p>
          <div className="space-y-3">
            <Link
              href="/properties/create"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Add Your First Property
            </Link>
            <div>
              <Link
                href="/dashboard"
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                ← Back to Dashboard
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
            href="/tenants"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tenants
          </Link>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Users className="w-8 h-8 mr-3 text-blue-600" />
              Add New Tenant
            </h1>
            <p className="text-gray-600 mt-2">
              {session.user.role === 'landlord' 
                ? 'Create a tenant account and assign them to one of your properties'
                : session.user.role === 'manager'
                ? 'Add a new tenant to the property management system'
                : 'Create a new tenant account in the system'
              }
            </p>
            
            {session.user.role === 'landlord' && data.availableProperties.length > 0 && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">
                  <strong>Available Properties:</strong> {data.availableProperties.length} of {data.properties.length} properties are available for new tenants.
                </p>
              </div>
            )}
            
            {session.user.role === 'landlord' && data.availableProperties.length === 0 && data.properties.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  <strong>Notice:</strong> All your properties currently have active leases. You can still create tenant accounts for future use.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Property Overview (for landlords) */}
        {session.user.role === 'landlord' && data.properties.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Properties Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{data.properties.length}</div>
                <div className="text-sm text-gray-500">Total Properties</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{data.availableProperties.length}</div>
                <div className="text-sm text-gray-500">Available</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{data.properties.length - data.availableProperties.length}</div>
                <div className="text-sm text-gray-500">Occupied</div>
              </div>
            </div>
          </div>
        )}

        {/* Tips Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tips for Adding Tenants</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div className="flex items-start">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <p>Verify tenant contact information before creating the account</p>
            </div>
            <div className="flex items-start">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <p>Check for existing accounts with the same email address</p>
            </div>
            <div className="flex items-start">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <p>Property assignment can be done later if needed</p>
            </div>
            <div className="flex items-start">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <p>Tenants will receive login credentials via email</p>
            </div>
          </div>
        </div>

        {/* Form Component */}
        <AddTenantForm 
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
      title: 'Add Tenant - Authentication Required',
      description: 'Please sign in to add tenants',
    };
  }

  let title = 'Add New Tenant - Property Management';
  let description = 'Create a new tenant account for property management';
  
  if (session.user.role === 'landlord') {
    title = 'Add Tenant to Portfolio - Property Management';
    description = 'Create a tenant account and assign to your rental properties';
  } else if (session.user.role === 'manager') {
    title = 'Create Tenant Account - Property Management';
    description = 'Add a new tenant to the property management system';
  }

  // Check if pre-selecting specific property
  const propertyId = params?.property;
  if (propertyId) {
    try {
      await dbConnect();
      const property = await Property.findById(propertyId).select('address name').lean();
      if (property) {
        const propertyName = property.address || property.name || 'Property';
        title = `Add Tenant for ${propertyName}`;
        description = `Create a tenant account for ${propertyName}`;
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