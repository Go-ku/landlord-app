// src/app/properties/page.js - Updated version
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import Link from "next/link";
import { Suspense } from "react";
import dbConnect from "lib/db";
import Property from "models/Property";
import Lease from "models/Lease";
import User from "models/User";
import Breadcrumbs from "@/components/Breadcrumbs";
import { DebugSession } from "@/components/DebugSession"; // For development
import { 
  Home, 
  Plus, 
  MapPin, 
  AlertCircle, 
  Eye,
  Edit,
  Users,
  DollarSign,
  Calendar,
  Building,
  CheckCircle,
  XCircle,
  Lock,
  RefreshCw
} from "lucide-react";

async function getPropertiesWithStatus(userId, userRole) {
  try {
    await dbConnect();
    
    // Build base query based on user role
    let baseQuery = {};
    
    if (userRole === 'landlord') {
      // Landlords can only see their own properties
      baseQuery.landlord = userId;
    } else if (userRole === 'tenant') {
      // Tenants should not access this page
      throw new Error('Tenants are not authorized to view properties');
    }
    // Managers and Admins can see all properties (no additional filtering)
    
    console.log(`Fetching properties for ${userRole}:`, baseQuery);
    
    // Fetch properties with their lease information using role-based filtering
    const properties = await Property.aggregate([
      {
        $match: baseQuery
      },
      {
        $lookup: {
          from: 'leases',
          localField: '_id',
          foreignField: 'propertyId',
          as: 'leases'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'landlord',
          foreignField: '_id',
          as: 'landlordInfo'
        }
      },
      {
        $addFields: {
          activeLeases: {
            $filter: {
              input: '$leases',
              cond: { $eq: ['$$this.status', 'active'] }
            }
          },
          totalLeases: { $size: '$leases' },
          isOccupied: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: '$leases',
                    cond: { $eq: ['$$this.status', 'active'] }
                  }
                }
              },
              0
            ]
          },
          landlordName: {
            $cond: {
              if: { $gt: [{ $size: '$landlordInfo' }, 0] },
              then: {
                $ifNull: [
                  { $arrayElemAt: ['$landlordInfo.name', 0] },
                  {
                    $concat: [
                      { $ifNull: [{ $arrayElemAt: ['$landlordInfo.firstName', 0] }, ''] },
                      ' ',
                      { $ifNull: [{ $arrayElemAt: ['$landlordInfo.lastName', 0] }, ''] }
                    ]
                  }
                ]
              },
              else: 'Unknown'
            }
          }
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]);
    
    console.log(`Found ${properties.length} properties for ${userRole}`);
    
    // Convert MongoDB ObjectIds to strings
    return properties.map(property => ({
      ...property,
      _id: property._id.toString(),
      landlord: property.landlord?.toString(),
      createdAt: property.createdAt?.toISOString() || null,
      updatedAt: property.updatedAt?.toISOString() || null,
      leases: property.leases.map(lease => ({
        ...lease,
        _id: lease._id.toString(),
        tenantId: lease.tenantId?.toString() || null,
        propertyId: lease.propertyId?.toString() || null
      }))
    }));
  } catch (error) {
    console.error("Error fetching properties:", error);
    throw error; // Re-throw to handle in component
  }
}

// Session Debug Component for Development
function SessionDebug({ session }) {
  if (process.env.NODE_ENV !== 'development') return null;
  
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <h4 className="font-medium text-yellow-800 mb-2">Debug Info (Dev Mode)</h4>
      <div className="text-sm text-yellow-700 space-y-1">
        <div>Session exists: {session ? '✅' : '❌'}</div>
        <div>User ID: {session?.user?.id || 'Missing'}</div>
        <div>Email: {session?.user?.email || 'Missing'}</div>
        <div>Role: {session?.user?.role || 'Missing'}</div>
        <div>Name: {session?.user?.name || 'Missing'}</div>
      </div>
    </div>
  );
}

// Enhanced Error Component
function ErrorDisplay({ error, session, onRetry }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Home className="w-6 h-6 mr-3 text-blue-600" />
            Properties
          </h1>
        </div>
        
        <Breadcrumbs />
        <SessionDebug session={session} />

        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800 mb-2">
                Error Loading Properties
              </h3>
              <p className="text-sm text-red-700 mb-4">
                {error.includes('not authorized') 
                  ? 'You do not have permission to view properties. This could be a role configuration issue.'
                  : 'There was a problem loading your properties. This could be due to a database connection issue or session configuration.'
                }
              </p>
              
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium mr-4"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </button>
              )}
              
              <Link
                href="/dashboard"
                className="inline-flex items-center text-red-600 hover:text-red-800 text-sm"
              >
                ← Back to Dashboard
              </Link>
              
              {process.env.NODE_ENV === 'development' && (
                <details className="mt-4">
                  <summary className="text-xs text-red-600 cursor-pointer font-medium">
                    Technical Details (Dev Mode)
                  </summary>
                  <div className="mt-2 p-3 bg-red-100 rounded text-xs text-red-800 font-mono whitespace-pre-wrap">
                    {error}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading component (keeping the same as original)
function PropertiesTableLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-200 rounded animate-pulse mr-3"></div>
            <div className="w-32 h-8 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="w-32 h-10 bg-gray-200 rounded animate-pulse"></div>
        </div>
        
        <div className="w-full h-6 bg-gray-200 rounded animate-pulse mb-6"></div>
        
        {/* Stats loading */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-4 animate-pulse">
              <div className="w-full h-16 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
        
        {/* Table loading */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4">
            <div className="w-full h-8 bg-gray-200 rounded animate-pulse mb-4"></div>
            {[...Array(5)].map((_, index) => (
              <div key={index} className="w-full h-12 bg-gray-200 rounded animate-pulse mb-2"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Keep all other components the same (PropertiesStats, EmptyState, PropertiesTable, UnauthorizedAccess)
// ... [Include all the existing components here] ...
// Stats component with role awareness
function PropertiesStats({ properties, userRole, userName }) {
  const totalProperties = properties.length;
  const occupiedProperties = properties.filter(p => p.isOccupied).length;
  const vacantProperties = totalProperties - occupiedProperties;
  const occupancyRate = totalProperties > 0 ? Math.round((occupiedProperties / totalProperties) * 100) : 0;
  const totalMonthlyRent = properties.reduce((sum, property) => sum + (property.monthlyRent || 0), 0);

  return (
    <div className="mb-6">
      {/* Role indicator */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              userRole === 'landlord' ? 'bg-blue-500' : 
              userRole === 'manager' ? 'bg-purple-500' : 'bg-green-500'
            }`}></div>
            <span className="text-sm font-medium text-gray-700">
              {userRole === 'landlord' && `Landlord Dashboard - ${userName}`}
              {userRole === 'manager' && `Manager Dashboard - All Properties View`}
              {userRole === 'tenant' && `Tenant View - Limited Access`}
            </span>
          </div>
          {userRole === 'landlord' && (
            <span className="ml-auto text-xs text-blue-600">
              Showing your {totalProperties} propert{totalProperties !== 1 ? 'ies' : 'y'} only
            </span>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">
                {userRole === 'manager' ? 'Total Properties' : 'My Properties'}
              </p>
              <p className="text-2xl font-bold text-gray-900">{totalProperties}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Occupied</p>
              <p className="text-2xl font-bold text-gray-900">{occupiedProperties}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <XCircle className="w-5 h-5 text-orange-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Vacant</p>
              <p className="text-2xl font-bold text-gray-900">{vacantProperties}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <MapPin className="w-5 h-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Occupancy Rate</p>
              <p className="text-2xl font-bold text-gray-900">{occupancyRate}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">
                {userRole === 'manager' ? 'Total Rent/Month' : 'My Rent/Month'}
              </p>
              <p className="text-lg font-bold text-gray-900">
                ZMW {totalMonthlyRent.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Empty state component with role awareness
function EmptyState({ userRole }) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="text-center py-12">
        <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Home className="w-12 h-12 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {userRole === 'landlord' ? 'No properties yet' : 'No properties available'}
        </h3>
        <p className="text-gray-500 mb-6 max-w-sm mx-auto">
          {userRole === 'landlord' 
            ? 'Get started by adding your first property to begin managing your real estate portfolio.'
            : userRole === 'manager'
            ? 'No properties have been added to the system yet.'
            : 'You do not have access to property management.'
          }
        </p>
        {userRole === 'landlord' && (
          <Link 
            href="/properties/add" 
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Your First Property
          </Link>
        )}
        {userRole === 'manager' && (
          <Link 
            href="/properties/add" 
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Property
          </Link>
        )}
      </div>
    </div>
  );
}

// Properties Table Component with role awareness
function PropertiesTable({ properties, userRole }) {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getOccupancyStatus = (isOccupied, activeLeases) => {
    if (isOccupied) {
      return {
        label: `Occupied (${activeLeases})`,
        color: 'bg-green-100 text-green-800',
        icon: <CheckCircle className="w-4 h-4" />
      };
    }
    return {
      label: 'Vacant',
      color: 'bg-orange-100 text-orange-800',
      icon: <XCircle className="w-4 h-4" />
    };
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Property Details
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type & Features
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rent & Occupancy
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              {userRole === 'manager' && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Added
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {properties.map((property) => {
              const occupancyStatus = getOccupancyStatus(property.isOccupied, property.activeLeases?.length || 0);
              
              return (
                <tr key={property._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {property.address || 'No address'}
                      </div>
                      <div className="text-sm text-gray-500">
                        ID: {property._id.slice(-8)}
                      </div>
                      {property.description && (
                        <div className="text-sm text-gray-500 max-w-xs truncate">
                          {property.description}
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {property.type || 'Not specified'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {property.bedrooms && (
                          <span>{property.bedrooms} bed</span>
                        )}
                        {property.bedrooms && property.bathrooms && <span> • </span>}
                        {property.bathrooms && (
                          <span>{property.bathrooms} bath</span>
                        )}
                      </div>
                      {property.squareFeet && (
                        <div className="text-sm text-gray-500">
                          {property.squareFeet.toLocaleString()} sq ft
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        ZMW {(property.monthlyRent || 0).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        per month
                      </div>
                      <div className="text-sm text-gray-500">
                        {property.totalLeases || 0} total lease{property.totalLeases !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${occupancyStatus.color}`}>
                      {occupancyStatus.icon}
                      <span className="ml-1">{occupancyStatus.label}</span>
                    </span>
                  </td>
                  
                  {userRole === 'manager' && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {property.landlordName || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-500">
                        Landlord
                      </div>
                    </td>
                  )}
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatDate(property.createdAt)}
                    </div>
                    <div className="text-sm text-gray-500">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      {formatDate(property.updatedAt)}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/properties/${property._id}`}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                        title="View property"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      
                      {/* Edit permission: landlords can edit their properties, managers can edit all */}
                      {(userRole === 'landlord' || userRole === 'manager') && (
                        <Link
                          href={`/properties/${property._id}/edit`}
                          className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-50 transition-colors"
                          title="Edit property"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                      )}
                      
                      {property.isOccupied && (
                        <Link
                          href={`/properties/${property._id}/tenants`}
                          className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50 transition-colors"
                          title="View tenants"
                        >
                          <Users className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Unauthorized access component
function UnauthorizedAccess() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto text-center p-6">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
        <p className="text-gray-600 mb-6">
          Property management is only available to landlords and managers.
        </p>
        <div className="space-y-3">
          <Link
            href="/tenant"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Tenant Dashboard
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
// Enhanced main component
export default async function PropertiesPage() {
  console.log('PropertiesPage: Starting render');
  
  // Check authentication
  const session = await getServerSession(authOptions);
  console.log('PropertiesPage: Session check', { 
    hasSession: !!session, 
    userId: session?.user?.id, 
    role: session?.user?.role 
  });
  
  if (!session?.user?.id) {
    console.log('PropertiesPage: No session, redirecting to signin');
    redirect('/auth/signin?callbackUrl=/properties');
  }

  // Check if user has permission to view properties
  const allowedRoles = ['landlord', 'manager', 'admin'];
  if (!session.user.role) {
    console.error('PropertiesPage: User role is missing from session');
    return (
      <ErrorDisplay 
        error="User role is missing from session. Please sign out and sign in again."
        session={session}
      />
    );
  }
  
  if (!allowedRoles.includes(session.user.role)) {
    console.log(`PropertiesPage: User role '${session.user.role}' not authorized`);
    return <UnauthorizedAccess />;
  }

  let properties;
  let error = null;

  try {
    console.log('PropertiesPage: Fetching properties...');
    properties = await getPropertiesWithStatus(session.user.id, session.user.role);
    console.log('PropertiesPage: Successfully fetched', properties.length, 'properties');
  } catch (err) {
    console.error('PropertiesPage: Error fetching properties:', err);
    error = err.message;
    properties = [];
  }

  if (error) {
    return <ErrorDisplay error={error} session={session} />;
  }

  return (
    <Suspense fallback={<PropertiesTableLoading />}>
      <div className="min-h-screen bg-gray-50">
        {/* Include debug session in development */}
        <DebugSession />
        
        <div className="container mx-auto p-4">
          <SessionDebug session={session} />
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center mb-2 sm:mb-0">
                <Home className="w-6 h-6 mr-3 text-blue-600" />
                {session.user.role === 'manager' || session.user.role === 'admin' ? 'All Properties' : 'My Properties'}
              </h1>
              <p className="text-gray-600">
                {session.user.role === 'manager' 
                  ? 'Manage all properties in the system and track occupancy'
                  : session.user.role === 'admin'
                  ? 'System-wide property overview and management'
                  : 'Manage your property portfolio and track occupancy'
                }
              </p>
            </div>
            <div className="flex items-center space-x-3 mt-4 sm:mt-0">
              {(session.user.role === 'landlord' || session.user.role === 'manager' || session.user.role === 'admin') && (
                <Link 
                  href="/properties/add" 
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Property
                </Link>
              )}
            </div>
          </div>

          {/* Breadcrumbs */}
          <Breadcrumbs />

          {/* Stats */}
          {properties.length > 0 && (
            <PropertiesStats 
              properties={properties} 
              userRole={session.user.role}
              userName={session.user.name}
            />
          )}
          
          {/* Properties Table or Empty State */}
          {properties.length === 0 ? (
            <EmptyState userRole={session.user.role} />
          ) : (
            <div>
              <PropertiesTable properties={properties} userRole={session.user.role} />
              
              {/* Footer Info */}
              <div className="mt-6 text-center text-sm text-gray-500">
                Showing {properties.length} {properties.length === 1 ? 'property' : 'properties'}
                {session.user.role === 'landlord' && ' that you own'}
                {session.user.role === 'manager' && ' in the system'}
                • Last updated: {new Date().toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </div>
    </Suspense>
  );
}