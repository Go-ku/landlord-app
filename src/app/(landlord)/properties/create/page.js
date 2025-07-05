// src/app/properties/create/page.js
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AddPropertyForm from './AddPropertyForm';
import { ArrowLeft, Home, AlertCircle } from 'lucide-react';

export default async function AddPropertyPage({ searchParams }) {
  // Await searchParams for Next.js 15 compatibility
  const params = await searchParams;
  
  // Check authentication
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/properties/create');
  }

  // Check if user has permission to create properties
  const allowedRoles = ['landlord', 'manager', 'admin'];
  if (!allowedRoles.includes(session.user.role)) {
    redirect('/unauthorized?reason=insufficient_permissions');
  }

  // Prepare initial data for the form
  const initialData = {
    currentUser: {
      id: session.user.id,
      role: session.user.role,
      name: session.user.name,
      email: session.user.email
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/properties"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Properties
          </Link>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Home className="w-8 h-8 mr-3 text-blue-600" />
              Add New Property
            </h1>
            <p className="text-gray-600 mt-2">
              {session.user.role === 'landlord' 
                ? 'Add a new rental property to your portfolio'
                : session.user.role === 'manager'
                ? 'Add a new property to the management system'
                : 'Create a new property listing in the system'
              }
            </p>
            
            {session.user.role === 'landlord' && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  This property will be added to your portfolio and you will be set as the landlord.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Tips */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Tips</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div className="flex items-start">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <p>Provide accurate address and property details for better tenant matching</p>
            </div>
            <div className="flex items-start">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <p>Upload high-quality photos to attract more potential tenants</p>
            </div>
            <div className="flex items-start">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <p>Set competitive rental prices based on local market rates</p>
            </div>
            <div className="flex items-start">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <p>Include amenities and detailed descriptions to highlight unique features</p>
            </div>
          </div>
        </div>

        {/* Form Component */}
        <AddPropertyForm 
          initialData={initialData}
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
      title: 'Add Property - Authentication Required',
      description: 'Please sign in to add properties',
    };
  }

  let title = 'Add New Property - Property Management';
  let description = 'Create a new rental property listing';
  
  if (session.user.role === 'landlord') {
    title = 'Add Property to Portfolio - Property Management';
    description = 'Add a new rental property to your landlord portfolio';
  } else if (session.user.role === 'manager') {
    title = 'Create Property Listing - Property Management';
    description = 'Add a new property to the management system';
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