import AddTenantForm from '@/components/forms/AddTenantForm';
import { getToken } from 'next-auth/jwt';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Property from 'models/Property';
import User from 'models/User';
import dbConnect from 'lib/db';
import Link from 'next/link';

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

async function getUserFromCookies() {
  try {
    const cookieStore = cookies();
    
    const mockRequest = {
      headers: {
        get: (name) => {
          if (name === 'cookie') {
            return cookieStore.toString();
          }
          return null;
        }
      },
      cookies: cookieStore
    };

    const token = await getToken({ 
      req: mockRequest,
      secret: process.env.NEXTAUTH_SECRET 
    });

    return token;
  } catch (error) {
    console.error('Error getting user from cookies:', error);
    return null;
  }
}

async function getPropertiesAndTenants(landlordId) {
  try {
    await dbConnect();
    
    // Get properties belonging to this landlord
    const properties = await Property.find({ 
      landlord: landlordId 
    })
    .select('address type monthlyRent bedrooms bathrooms isAvailable')
    .sort({ address: 1 })
    .lean();

    // Get existing tenant users (to check for duplicates)
    const existingTenants = await User.find({ 
      role: 'tenant',
      isActive: true 
    })
    .select('email name phone currentProperty')
    .lean();

    return {
      properties: serializeData(properties),
      existingTenants: serializeData(existingTenants)
    };
  } catch (error) {
    console.error('Error fetching properties and tenants:', error);
    return {
      properties: [],
      existingTenants: []
    };
  }
}

export default async function AddTenantPage({ searchParams }) {
  // Get current user
  const token = await getUserFromCookies();
  
  if (!token?.id) {
    redirect('/auth/login');
  }

  // Check if user is a landlord
  if (token.role !== 'landlord') {
    redirect('/dashboard'); // Redirect non-landlords
  }

  // Get properties and existing tenants
  const { properties, existingTenants } = await getPropertiesAndTenants(token.id);

  // Get pre-selected property from URL params (if coming from property detail page)
  const preSelectedPropertyId = searchParams?.property;

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Add New Tenant</h1>
        <p className="text-gray-600 mt-1">
          Create a tenant account and optionally assign them to a property
        </p>
      </div>

      {properties.length === 0 ? (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-6">
          <p className="font-medium">No Properties Available</p>
          <p>You need to add properties before you can assign tenants.</p>
          <Link 
            href="/properties/add" 
            className="text-yellow-800 underline hover:text-yellow-900"
          >
            Add your first property →
          </Link>
        </div>
      ) : null}

      <AddTenantForm 
        properties={properties}
        existingTenants={existingTenants}
        landlordId={token.id}
        preSelectedPropertyId={preSelectedPropertyId}
      />
    </div>
  );
}