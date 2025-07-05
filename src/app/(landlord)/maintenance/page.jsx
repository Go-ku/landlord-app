// src/app/maintenance/page.js
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import dbConnect from 'lib/db';
import Maintenance from 'models/Maintenance';
import MaintenanceClient from './MaintenanceClient';
import { 
  Wrench, 
  Plus, 
  AlertCircle, 
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle
} from 'lucide-react';

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

async function getMaintenanceRequests(userId, userRole) {
  try {
    await dbConnect();
    
    let query = {};
    
    // Role-based filtering
    if (userRole === 'tenant') {
      // Tenants can only see their own requests
      query.tenant = userId;
    } else if (userRole === 'landlord') {
      // Landlords can see requests for their properties
      // First get the landlord's properties
      
      const landlordProperties = await Property.find({ landlord: userId }).select('_id').lean();
      const propertyIds = landlordProperties.map(p => p._id);
      query.property = { $in: propertyIds };
    } else if (['manager', 'admin'].includes(userRole)) {
      // Managers and admins can see all requests
      // No additional filtering needed
    } else {
      // Other roles should not access maintenance requests
      return [];
    }
    
    const requests = await Maintenance.find(query)
      .populate('tenantId', 'name firstName lastName email phone')
      .populate('propertyId', 'address name type')
      .populate('landlordId', 'name firstName lastName')
      .sort({ createdAt: -1 })
      .lean();

    return serializeData(requests);

  } catch (error) {
    console.error('Error fetching maintenance requests:', error);
    return [];
  }
}

export default async function MaintenancePage({ searchParams }) {
  // Await searchParams for Next.js 15 compatibility
  const params = await searchParams;
  
  // Check authentication
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/maintenance');
  }

  // Check if user has permission to view maintenance requests
  const allowedRoles = ['tenant', 'landlord', 'manager', 'admin'];
  if (!allowedRoles.includes(session.user.role)) {
    redirect('/unauthorized?reason=insufficient_permissions');
  }

  // Fetch maintenance requests
  const requests = await getMaintenanceRequests(session.user.id, session.user.role);
  
  // Calculate stats
  const stats = {
    total: requests.length,
    pending: requests.filter(req => req.status === 'pending').length,
    inProgress: requests.filter(req => req.status === 'in_progress').length,
    completed: requests.filter(req => req.status === 'completed').length,
    cancelled: requests.filter(req => req.status === 'cancelled').length,
    highPriority: requests.filter(req => req.priority === 'high').length,
    urgent: requests.filter(req => req.priority === 'urgent').length
  };

  // Check user permissions for creating requests
  const canCreateRequest = ['tenant', 'landlord', 'manager', 'admin'].includes(session.user.role);

  // Handle empty state for specific user roles
  if (requests.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto p-4 max-w-7xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <div className="mb-4 sm:mb-0">
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Wrench className="w-8 h-8 mr-3 text-blue-600" />
                Maintenance Requests
              </h1>
              <p className="text-gray-600 mt-1">
                Manage property maintenance and repair requests
                {session.user.role === 'tenant' && (
                  <span className="block text-sm text-blue-600 mt-1">
                    Submit requests for your rental property
                  </span>
                )}
                {session.user.role === 'landlord' && (
                  <span className="block text-sm text-blue-600 mt-1">
                    Manage requests for your properties
                  </span>
                )}
              </p>
            </div>

            {canCreateRequest && (
              <div className="flex flex-wrap gap-2">
                <Link 
                  href="/maintenance/new" 
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Request
                </Link>
              </div>
            )}
          </div>

          {/* Empty State */}
          <div className="bg-white rounded-lg shadow p-12">
            <div className="text-center">
              <Wrench className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {session.user.role === 'tenant' ? 'No Maintenance Requests' : 'No Requests Found'}
              </h3>
              <p className="text-gray-600 mb-6">
                {session.user.role === 'tenant' 
                  ? "You haven't submitted any maintenance requests yet. Get started by reporting an issue with your rental property."
                  : session.user.role === 'landlord'
                  ? "No maintenance requests have been submitted for your properties yet."
                  : "No maintenance requests found in the system."
                }
              </p>
              {canCreateRequest && (
                <Link
                  href="/maintenance/new"
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {session.user.role === 'tenant' ? 'Submit First Request' : 'Create Request'}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Wrench className="w-8 h-8 mr-3 text-blue-600" />
              Maintenance Requests
            </h1>
            <p className="text-gray-600 mt-1">
              Manage property maintenance and repair requests
              {session.user.role === 'tenant' && (
                <span className="block text-sm text-blue-600 mt-1">
                  Your submitted maintenance requests
                </span>
              )}
              {session.user.role === 'landlord' && (
                <span className="block text-sm text-blue-600 mt-1">
                  Requests for your properties ({requests.length} total)
                </span>
              )}
            </p>
          </div>

          {canCreateRequest && (
            <div className="flex flex-wrap gap-2">
              <Link 
                href="/maintenance/new" 
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Request
              </Link>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Wrench className="w-5 h-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Wrench className="w-5 h-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 rounded-lg">
                <XCircle className="w-5 h-5 text-gray-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Cancelled</p>
                <p className="text-2xl font-bold text-gray-600">{stats.cancelled}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">High Priority</p>
                <p className="text-2xl font-bold text-red-600">{stats.highPriority + stats.urgent}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Client Component for Interactive Features */}
        <MaintenanceClient 
          initialRequests={requests}
          userRole={session.user.role}
          canCreateRequest={canCreateRequest}
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
      title: 'Maintenance Requests - Authentication Required',
      description: 'Please sign in to view maintenance requests',
    };
  }

  // Get request count for metadata
  const requests = await getMaintenanceRequests(session.user.id, session.user.role);
  const pendingCount = requests.filter(req => req.status === 'pending').length;
  
  let title = 'Maintenance Requests - Property Management';
  let description = 'Manage property maintenance and repair requests';
  
  if (session.user.role === 'tenant') {
    title = `My Maintenance Requests (${requests.length}) - Property Management`;
    description = `View and manage your ${requests.length} maintenance requests`;
  } else if (session.user.role === 'landlord') {
    title = `Property Maintenance (${requests.length}) - Property Management`;
    description = `Manage ${requests.length} maintenance requests for your properties`;
    if (pendingCount > 0) {
      description += `. ${pendingCount} pending review.`;
    }
  } else if (['manager', 'admin'].includes(session.user.role)) {
    title = `All Maintenance Requests (${requests.length}) - Property Management`;
    description = `Manage ${requests.length} maintenance requests across all properties`;
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