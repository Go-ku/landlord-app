// app/users/[userId]/page.js
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft,
  User,
  Building,
  Crown,
  Shield,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Settings,
  FileText,
  Key,
  Clock
} from 'lucide-react';

export default function UserDetailPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const userId = params.userId;
  
  // State
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Check authorization
  useEffect(() => {
    if (session && session.user.role !== 'manager') {
      router.push('/dashboard');
    }
  }, [session, router]);

  // Fetch user data
  useEffect(() => {
    async function fetchUser() {
      if (!userId) return;
      
      try {
        const response = await fetch(`/api/users/${userId}`);
        const data = await response.json();
        
        if (data.success) {
          setUser(data.data.user);
        } else {
          setError(data.error || 'Failed to load user data');
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        setError('Failed to load user data');
      } finally {
        setIsLoading(false);
      }
    }

    if (session?.user?.role === 'manager') {
      fetchUser();
    }
  }, [session, userId]);

  // Toggle user status
  const handleToggleStatus = async () => {
    if (!user) return;
    
    if (!window.confirm(`Are you sure you want to ${user.isActive ? 'deactivate' : 'activate'} this user?`)) {
      return;
    }

    setIsUpdatingStatus(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/users/${user._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: !user.isActive
        })
      });

      const data = await response.json();
      if (data.success) {
        setUser(data.data.user);
        setSuccess(`User ${!user.isActive ? 'activated' : 'deactivated'} successfully`);
      } else {
        setError(data.error || 'Failed to update user status');
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      setError('Failed to update user status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Role configuration
  const roleConfig = {
    landlord: { label: 'Landlord', icon: Building, color: 'blue' },
    manager: { label: 'Manager', icon: Crown, color: 'purple' },
    admin: { label: 'Admin', icon: Shield, color: 'red' },
    tenant: { label: 'Tenant', icon: User, color: 'green' }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading user details...</p>
        </div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto p-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto p-4">
          <div className="text-center py-12">
            <User className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-900">User not found</h2>
            <p className="text-gray-600 mt-2">{`The user you're looking for doesn't exist.`}</p>
            <Link
              href="/users"
              className="inline-flex items-center mt-4 text-purple-600 hover:text-purple-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to users
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const roleInfo = roleConfig[user.role] || roleConfig.tenant;
  const RoleIcon = roleInfo.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Link
              href="/users"
              className="inline-flex items-center text-gray-600 hover:text-gray-900 mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Users
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <RoleIcon className="w-6 h-6 mr-3 text-purple-600" />
                {user.name}
              </h1>
              <p className="text-gray-600 mt-1">User details and management</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleToggleStatus}
              disabled={isUpdatingStatus}
              className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                user.isActive
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              } disabled:opacity-50`}
            >
              {isUpdatingStatus ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : user.isActive ? (
                <XCircle className="w-4 h-4 mr-2" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              {user.isActive ? 'Deactivate' : 'Activate'}
            </button>
            <Link
              href={`/users/${user._id}/edit`}
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit User
            </Link>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 mr-3" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 mr-3" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-center">
                <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <RoleIcon className="w-10 h-10 text-gray-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">{user.name}</h2>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-2 bg-${roleInfo.color}-100 text-${roleInfo.color}-800`}>
                  <RoleIcon className="w-4 h-4 mr-1" />
                  {roleInfo.label}
                  {user.role === 'admin' && user.adminLevel && (
                    <span className="ml-1 opacity-75">({user.adminLevel})</span>
                  )}
                </span>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Mail className="w-4 h-4 mr-3 flex-shrink-0" />
                  <span className="break-all">{user.email}</span>
                </div>
                
                {user.phone && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="w-4 h-4 mr-3 flex-shrink-0" />
                    {user.phone}
                  </div>
                )}

                {user.company && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Building className="w-4 h-4 mr-3 flex-shrink-0" />
                    {user.company}
                  </div>
                )}

                {user.licenseNumber && (
                  <div className="flex items-center text-sm text-gray-600">
                    <FileText className="w-4 h-4 mr-3 flex-shrink-0" />
                    License: {user.licenseNumber}
                  </div>
                )}

                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="w-4 h-4 mr-3 flex-shrink-0" />
                  Joined {new Date(user.createdAt).toLocaleDateString()}
                </div>

                {user.lastLogin && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="w-4 h-4 mr-3 flex-shrink-0" />
                    Last login: {new Date(user.lastLogin).toLocaleDateString()}
                  </div>
                )}

                <div className="flex items-center text-sm">
                  {user.isActive ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-3 text-green-600" />
                      <span className="text-green-600 font-medium">Active Account</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-3 text-red-600" />
                      <span className="text-red-600 font-medium">Inactive Account</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Details and Permissions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Permissions Card */}
            {user.permissions && user.permissions.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Permissions</h3>
                <div className="flex flex-wrap gap-2">
                  {user.permissions.map((permission) => (
                    <span 
                      key={permission} 
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                    >
                      <Key className="w-3 h-3 mr-1" />
                      {permission.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Property Assignments (for admins) */}
            {user.role === 'admin' && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Property Assignments</h3>
                  <Link
                    href={`/manager/assign-properties/${user._id}`}
                    className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                  >
                    Manage Assignments →
                  </Link>
                </div>
                
                {user.assignedProperties && user.assignedProperties.length > 0 ? (
                  <div className="space-y-3">
                    {user.assignedProperties
                      .filter(assignment => assignment.isActive)
                      .map((assignment) => (
                        <div key={assignment._id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center">
                                <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                                <h4 className="text-sm font-medium text-gray-900">
                                  {assignment.property?.address || 'Unknown Property'}
                                </h4>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-1">
                                {assignment.permissions?.map((permission) => (
                                  <span 
                                    key={permission} 
                                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                                  >
                                    <Settings className="w-3 h-3 mr-1" />
                                    {permission.replace('_', ' ')}
                                  </span>
                                ))}
                              </div>
                              <div className="mt-2 text-xs text-gray-500">
                                Assigned {new Date(assignment.assignedDate).toLocaleDateString()}
                                {assignment.assignedBy && (
                                  <span> by {assignment.assignedBy.name}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Building className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">No properties assigned</p>
                    <Link
                      href={`/manager/assign-properties/assign?admin=${user._id}`}
                      className="inline-flex items-center mt-2 text-purple-600 hover:text-purple-800 text-sm"
                    >
                      Assign Properties →
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Supervision Info (for admins) */}
            {user.role === 'admin' && user.supervisedBy && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Supervision</h3>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                    <Crown className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Supervised by {user.supervisedBy.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {user.supervisedBy.email}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Account Statistics */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Statistics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {user.role === 'admin' 
                      ? user.assignedProperties?.filter(a => a.isActive).length || 0
                      : user.role === 'landlord'
                      ? '0' // Could be calculated from properties owned
                      : '0'
                    }
                  </div>
                  <div className="text-sm text-blue-600">
                    {user.role === 'admin' ? 'Assigned Properties' : 
                     user.role === 'landlord' ? 'Properties Owned' : 
                     'Active Items'}
                  </div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24))}
                  </div>
                  <div className="text-sm text-green-600">Days Active</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}