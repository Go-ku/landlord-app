// src/app/invoices/create/page.js
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import dbConnect from 'lib/db';
import CreateInvoiceClient from './CreateInvoiceClient';

// Import models - using individual imports for better tree shaking
import User from 'models/User';
import Property from 'models/Property';
import Lease from 'models/Lease';

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

async function getInvoiceFormData(userId, userRole) {
  try {
    await dbConnect();
    
    let propertyQuery = { isAvailable: true };
    let tenantQuery = { role: 'tenant', isActive: true };
    
    // Role-based filtering
    if (userRole === 'landlord') {
      // Landlords can only see their own properties and tenants in those properties
      propertyQuery.landlord = userId;
      
      // Get properties first to find tenants in those properties
      const landlordProperties = await Property.find(propertyQuery).select('_id').lean();
      const propertyIds = landlordProperties.map(p => p._id);
      
      if (propertyIds.length === 0) {
        return {
          tenants: [],
          properties: [],
          leases: [],
          currentUser: { id: userId, role: userRole }
        };
      }
      
      // Get leases for landlord's properties to find relevant tenants
      const relevantLeases = await Lease.find({ 
        propertyId: { $in: propertyIds },
        status: { $in: ['active', 'draft'] }
      }).select('tenantId').lean();
      
      const tenantIds = [...new Set(relevantLeases.map(l => l.tenantId?.toString()).filter(Boolean))];
      
      if (tenantIds.length === 0) {
        tenantQuery._id = { $in: [] }; // No tenants found
      } else {
        tenantQuery._id = { $in: tenantIds };
      }
      
    } else if (userRole === 'manager' || userRole === 'admin') {
      // Managers and admins can see all properties and tenants
      // No additional filtering needed
    } else {
      // Other roles should not access this page
      throw new Error('Unauthorized access');
    }
    
    // Fetch all required data in parallel
    const [tenantsResult, propertiesResult, leasesResult] = await Promise.allSettled([
      // Get tenants based on role
      User.find(tenantQuery)
        .select('name firstName lastName email phone')
        .sort({ name: 1, firstName: 1 })
        .lean(),

      // Get properties based on role
      Property.find(propertyQuery)
        .populate('landlord', 'name firstName lastName')
        .select('address name type bedrooms bathrooms monthlyRent landlord')
        .sort({ address: 1 })
        .lean(),

      // Get leases for the available properties
      Property.find(propertyQuery)
        .select('_id')
        .lean()
        .then(props => {
          const propertyIds = props.map(p => p._id);
          return Lease.find({ 
            propertyId: { $in: propertyIds },
            status: { $in: ['active', 'draft'] }
          })
          .populate('tenantId', 'name firstName lastName')
          .populate('propertyId', 'address name')
          .select('tenantId propertyId monthlyRent startDate endDate status')
          .sort({ createdAt: -1 })
          .lean();
        })
    ]);

    return {
      tenants: serializeData(tenantsResult.status === 'fulfilled' ? tenantsResult.value : []),
      properties: serializeData(propertiesResult.status === 'fulfilled' ? propertiesResult.value : []),
      leases: serializeData(leasesResult.status === 'fulfilled' ? leasesResult.value : []),
      currentUser: { id: userId, role: userRole }
    };

  } catch (error) {
    console.error('Error fetching invoice form data:', error);
    return {
      tenants: [],
      properties: [],
      leases: [],
      currentUser: { id: userId, role: userRole },
      error: error.message
    };
  }
}

export default async function CreateInvoicePage({ searchParams }) {
  // Await searchParams for Next.js 15 compatibility
  const params = await searchParams;
  
  // Check authentication
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/invoices/create');
  }

  // Check if user has permission to create invoices
  const allowedRoles = ['landlord', 'manager', 'admin'];
  if (!allowedRoles.includes(session.user.role)) {
    redirect('/unauthorized?reason=insufficient_permissions');
  }

  const data = await getInvoiceFormData(session.user.id, session.user.role);
  
  // Handle errors
  if (data.error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Error</h2>
          <p className="text-gray-600 mb-6">{data.error}</p>
          <Link
            href="/invoices"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            ← Back to Invoices
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
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {session.user.role === 'landlord' ? 'No Properties Found' : 'No Available Properties'}
          </h2>
          <p className="text-gray-600 mb-6">
            {session.user.role === 'landlord' 
              ? 'You need to add properties before creating invoices.'
              : 'There are no available properties in the system.'
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
                href="/invoices"
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                ← Back to Invoices
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (data.tenants.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-6">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-1a6 6 0 01-4 0M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Tenants Found</h2>
          <p className="text-gray-600 mb-6">
            {session.user.role === 'landlord' 
              ? 'You need to have tenants in your properties before creating invoices.'
              : 'There are no active tenants in the system.'
            }
          </p>
          <div className="space-y-3">
            <Link
              href="/leases/create"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Create Lease
            </Link>
            <div>
              <Link
                href="/invoices"
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                ← Back to Invoices
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Pass search params to client component
  return <CreateInvoiceClient initialData={data} searchParams={params} />;
}

export async function generateMetadata({ searchParams }) {
  // Await searchParams for Next.js 15 compatibility
  const params = await searchParams;
  
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return {
      title: 'Create Invoice - Authentication Required',
      description: 'Please sign in to create invoices',
    };
  }

  // Check if pre-selecting specific tenant or property
  const tenantId = params?.tenantId;
  const propertyId = params?.propertyId;
  
  let title = 'Create Invoice - Property Management';
  let description = 'Create a new invoice for tenant billing';
  
  if (tenantId) {
    try {
      await dbConnect();
      const tenant = await User.findById(tenantId).select('name firstName lastName').lean();
      if (tenant) {
        const tenantName = tenant.name || 
          `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim() ||
          'Unknown Tenant';
        title = `Create Invoice for ${tenantName} - Property Management`;
        description = `Create a new invoice for ${tenantName}`;
      }
    } catch (error) {
      console.error('Error fetching tenant for metadata:', error);
    }
  } else if (propertyId) {
    try {
      await dbConnect();
      const property = await Property.findById(propertyId).select('address name').lean();
      if (property) {
        const propertyName = property.address || property.name || 'Unknown Property';
        title = `Create Invoice for ${propertyName} - Property Management`;
        description = `Create a new invoice for ${propertyName}`;
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