// app/manager/assign-properties/page.js
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import dbConnect from 'lib/db';
import User from 'models/User';
import Property from 'models/Property';
import Breadcrumbs from '@/components/Breadcrumbs';
import { 
  Users, 
  Building, 
  Settings, 
  Plus,
  Check,
  X,
  AlertCircle,
  Eye,
  Edit,
  UserCheck,
  Shield,
  MapPin,
  Calendar,
  CheckCircle,
  XCircle
} from 'lucide-react';

// Fetch data for property assignment interface
async function getAssignmentData(managerId) {
  try {
    await dbConnect();
    
    // Get all admins and their current assignments
    const admins = await User.find({ role: 'admin' })
      .populate('assignedProperties.property', 'address type monthlyRent')
      .populate('assignedProperties.assignedBy', 'name')
      .populate('supervisedBy', 'name')
      .sort({ name: 1 });

    // Get all properties (managers can see all properties)
    const properties = await Property.find({})
      .populate('landlord', 'name email')
      .sort({ address: 1 });

    // Get assignment statistics
    const stats = {
      totalAdmins: admins.length,
      totalProperties: properties.length,
      assignedProperties: properties.filter(prop => 
        admins.some(admin => 
          admin.assignedProperties.some(assignment => 
            assignment.property && assignment.property._id.toString() === prop._id.toString() && assignment.isActive
          )
        )
      ).length,
      unassignedProperties: 0
    };

    stats.unassignedProperties = stats.totalProperties - stats.assignedProperties;

    return {
      admins,
      properties,
      stats
    };
  } catch (error) {
    console.error('Error fetching assignment data:', error);
    return null;
  }
}

// Loading component
function AssignmentPageLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-200 rounded animate-pulse mr-3"></div>
            <div className="w-48 h-8 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
        
        <div className="w-full h-6 bg-gray-200 rounded animate-pulse mb-6"></div>
        
        {/* Stats loading */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="w-full h-16 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
        
        {/* Content loading */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="w-full h-64 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Stats component
function AssignmentStats({ stats }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Total Admins</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalAdmins}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="p-3 bg-green-100 rounded-lg">
            <Building className="w-6 h-6 text-green-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Total Properties</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalProperties}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="p-3 bg-purple-100 rounded-lg">
            <CheckCircle className="w-6 h-6 text-purple-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Assigned Properties</p>
            <p className="text-2xl font-bold text-gray-900">{stats.assignedProperties}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="p-3 bg-orange-100 rounded-lg">
            <XCircle className="w-6 h-6 text-orange-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Unassigned</p>
            <p className="text-2xl font-bold text-gray-900">{stats.unassignedProperties}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Admin list component
function AdminsList({ admins }) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Admin Users</h3>
          <Link
            href="/manager/assign-properties/assign"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Assign Properties
          </Link>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Admin Details
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Admin Level
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assigned Properties
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {admins.length > 0 ? (
              admins.map((admin) => {
                const activeAssignments = admin.assignedProperties.filter(assignment => assignment.isActive);
                
                return (
                  <tr key={admin._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Shield className="w-5 h-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {admin.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {admin.email}
                          </div>
                          {admin.phone && (
                            <div className="text-sm text-gray-500">
                              {admin.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        admin.adminLevel === 'financial' 
                          ? 'bg-green-100 text-green-800'
                          : admin.adminLevel === 'assistant'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {admin.adminLevel?.charAt(0).toUpperCase() + admin.adminLevel?.slice(1)}
                      </span>
                      {admin.supervisedBy && (
                        <div className="text-xs text-gray-500 mt-1">
                          Supervised by {admin.supervisedBy.name}
                        </div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {activeAssignments.length} propert{activeAssignments.length !== 1 ? 'ies' : 'y'}
                      </div>
                      {activeAssignments.length > 0 && (
                        <div className="mt-1 space-y-1">
                          {activeAssignments.slice(0, 2).map((assignment) => (
                            <div key={assignment._id} className="text-xs text-gray-500 flex items-center">
                              <MapPin className="w-3 h-3 mr-1" />
                              {assignment.property?.address || 'Unknown Property'}
                            </div>
                          ))}
                          {activeAssignments.length > 2 && (
                            <div className="text-xs text-gray-400">
                              +{activeAssignments.length - 2} more
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        admin.isActive 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {admin.isActive ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/manager/assign-properties/${admin._id}`}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                          title="View/edit assignments"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        
                        <Link
                          href={`/manager/assign-properties/${admin._id}/edit`}
                          className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-50 transition-colors"
                          title="Edit admin details"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                  <Shield className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>No admin users found</p>
                  <p className="text-sm mt-1">Admin users will appear here once they register</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Unassigned properties component
function UnassignedProperties({ properties, admins }) {
  // Get properties that are not assigned to any admin
  const assignedPropertyIds = new Set();
  admins.forEach(admin => {
    admin.assignedProperties.forEach(assignment => {
      if (assignment.isActive && assignment.property) {
        assignedPropertyIds.add(assignment.property._id.toString());
      }
    });
  });

  const unassignedProperties = properties.filter(
    property => !assignedPropertyIds.has(property._id.toString())
  );

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Unassigned Properties</h3>
          <span className="text-sm text-gray-500">
            {unassignedProperties.length} of {properties.length} properties
          </span>
        </div>
      </div>
      
      <div className="max-h-96 overflow-y-auto">
        {unassignedProperties.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {unassignedProperties.map((property) => (
              <div key={property._id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <Building className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {property.address}
                        </div>
                        <div className="text-sm text-gray-500">
                          {property.type} • ZMW {property.monthlyRent?.toLocaleString()}/month
                        </div>
                        <div className="text-xs text-gray-500">
                          Owner: {property.landlord?.name || 'Unknown'}
                        </div>
                      </div>
                    </div>
                  </div>
                  <Link
                    href={`/manager/assign-properties/assign?property=${property._id}`}
                    className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Assign
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-8 text-center text-gray-500">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p>All properties are assigned!</p>
            <p className="text-sm mt-1">Every property has been assigned to an admin</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Main component
export default async function PropertyAssignmentPage() {
  // Check authentication and authorization
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/manager/assign-properties');
  }

  if (session.user.role !== 'manager') {
    redirect('/dashboard'); // Redirect non-managers
  }

  // Fetch assignment data
  const assignmentData = await getAssignmentData(session.user.id);

  if (!assignmentData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto p-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-red-800">
                  Error Loading Assignment Data
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  There was a problem loading the property assignment data.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<AssignmentPageLoading />}>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto p-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center mb-2 sm:mb-0">
                <Users className="w-6 h-6 mr-3 text-purple-600" />
                Property Assignments
              </h1>
              <p className="text-gray-600">
                Assign properties to admin users for payment and invoice management
              </p>
            </div>
            <div className="flex items-center space-x-3 mt-4 sm:mt-0">
              <Link
                href="/manager/assign-properties/bulk-assign"
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors font-medium"
              >
                <Settings className="w-4 h-4 mr-2" />
                Bulk Assign
              </Link>
            </div>
          </div>

          {/* Breadcrumbs */}
          <Breadcrumbs />

          {/* Stats */}
          <AssignmentStats stats={assignmentData.stats} />

          {/* Main content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Admin list - takes up 2 columns */}
            <div className="lg:col-span-2">
              <AdminsList admins={assignmentData.admins} />
            </div>
            
            {/* Unassigned properties - takes up 1 column */}
            <div className="lg:col-span-1">
              <UnassignedProperties 
                properties={assignmentData.properties} 
                admins={assignmentData.admins} 
              />
            </div>
          </div>

          {/* Quick actions */}
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link
                href="/manager/assign-properties/assign"
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <UserCheck className="w-6 h-6 text-blue-600 mb-2" />
                <h4 className="font-medium text-gray-900">Assign Properties</h4>
                <p className="text-sm text-gray-500 mt-1">
                  Assign properties to admin users
                </p>
              </Link>
              
              <Link
                href="/manager/approvals"
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <CheckCircle className="w-6 h-6 text-green-600 mb-2" />
                <h4 className="font-medium text-gray-900">Review Approvals</h4>
                <p className="text-sm text-gray-500 mt-1">
                  Approve payments and invoices
                </p>
              </Link>
              
              <Link
                href="/properties"
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Building className="w-6 h-6 text-purple-600 mb-2" />
                <h4 className="font-medium text-gray-900">Manage Properties</h4>
                <p className="text-sm text-gray-500 mt-1">
                  View and manage all properties
                </p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Suspense>
  );
}