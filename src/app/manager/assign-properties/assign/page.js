// app/manager/assign-properties/assign/page.js
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  UserCheck, 
  Building, 
  ArrowLeft, 
  Check,
  AlertCircle,
  Loader2,
  Users,
  MapPin,
  Shield,
  Settings,
  Plus,
  X
} from 'lucide-react';

export default function PropertyAssignmentForm() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Pre-selected property from URL params
  const preSelectedPropertyId = searchParams.get('property');
  
  // State
  const [admins, setAdmins] = useState([]);
  const [properties, setProperties] = useState([]);
  const [selectedAdmin, setSelectedAdmin] = useState('');
  const [selectedProperties, setSelectedProperties] = useState(preSelectedPropertyId ? [preSelectedPropertyId] : []);
  const [selectedPermissions, setSelectedPermissions] = useState(['log_payments', 'create_invoices']);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Permission options
  const permissionOptions = [
    { value: 'log_payments', label: 'Log Payments', description: 'Record tenant payments' },
    { value: 'create_invoices', label: 'Create Invoices', description: 'Generate invoices for tenants' },
    { value: 'view_reports', label: 'View Reports', description: 'Access financial reports' },
    { value: 'manage_tenants', label: 'Manage Tenants', description: 'Handle tenant information' }
  ];

  // Check authorization
  useEffect(() => {
    if (session && session.user.role !== 'manager') {
      router.push('/dashboard');
    }
  }, [session, router]);

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/manager/assign-properties');
        const data = await response.json();
        
        if (data.success) {
          setAdmins(data.data.admins);
          setProperties(data.data.properties);
        } else {
          setError('Failed to load data');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    }

    if (session?.user?.role === 'manager') {
      fetchData();
    }
  }, [session]);

  // Get available properties (not assigned to selected admin)
  const getAvailableProperties = () => {
    if (!selectedAdmin) return properties;
    
    const admin = admins.find(a => a._id === selectedAdmin);
    if (!admin) return properties;
    
    const assignedPropertyIds = admin.assignedProperties
      .filter(assignment => assignment.isActive)
      .map(assignment => assignment.property?._id)
      .filter(Boolean);
    
    return properties.filter(property => !assignedPropertyIds.includes(property._id));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedAdmin) {
      setError('Please select an admin');
      return;
    }
    
    if (selectedProperties.length === 0) {
      setError('Please select at least one property');
      return;
    }
    
    if (selectedPermissions.length === 0) {
      setError('Please select at least one permission');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const assignments = [];
      
      // Submit each property assignment
      for (const propertyId of selectedProperties) {
        const response = await fetch('/api/manager/assign-properties', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            adminId: selectedAdmin,
            propertyId,
            permissions: selectedPermissions
          }),
        });

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to assign property');
        }
        
        assignments.push(data.data.assignment);
      }

      setSuccess(`Successfully assigned ${selectedProperties.length} propert${selectedProperties.length > 1 ? 'ies' : 'y'}`);
      
      // Reset form
      setSelectedProperties([]);
      if (!preSelectedPropertyId) {
        setSelectedAdmin('');
      }
      
      // Redirect after success
      setTimeout(() => {
        router.push('/manager/assign-properties');
      }, 2000);
      
    } catch (error) {
      console.error('Assignment error:', error);
      setError(error.message || 'Failed to assign properties');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle permission toggle
  const togglePermission = (permission) => {
    setSelectedPermissions(prev => 
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  // Handle property selection
  const toggleProperty = (propertyId) => {
    setSelectedProperties(prev => 
      prev.includes(propertyId)
        ? prev.filter(p => p !== propertyId)
        : [...prev, propertyId]
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading assignment form...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Link
            href="/manager/assign-properties"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Assignments
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <UserCheck className="w-6 h-6 mr-3 text-blue-600" />
              Assign Properties
            </h1>
            <p className="text-gray-600 mt-1">
              Assign properties to admin users for management
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow p-6">
          {/* Success/Error Messages */}
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
                <Check className="w-5 h-5 text-green-400 mt-0.5 mr-3" />
                <p className="text-sm text-green-700">{success}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Select Admin */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <Users className="w-4 h-4 inline mr-2" />
                Select Admin User
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {admins.map((admin) => (
                  <div
                    key={admin._id}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedAdmin === admin._id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedAdmin(admin._id)}
                  >
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Shield className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="ml-3 flex-1">
                        <h3 className="text-sm font-medium text-gray-900">
                          {admin.name}
                        </h3>
                        <p className="text-sm text-gray-500">{admin.email}</p>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                          admin.adminLevel === 'financial' 
                            ? 'bg-green-100 text-green-800'
                            : admin.adminLevel === 'assistant'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {admin.adminLevel?.charAt(0).toUpperCase() + admin.adminLevel?.slice(1)}
                        </span>
                      </div>
                      {selectedAdmin === admin._id && (
                        <Check className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      Currently assigned: {admin.assignedProperties?.filter(a => a.isActive).length || 0} properties
                    </div>
                  </div>
                ))}
              </div>
              {admins.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>No admin users found</p>
                  <p className="text-sm mt-1">Admin users need to register first</p>
                </div>
              )}
            </div>

            {/* Select Properties */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <Building className="w-4 h-4 inline mr-2" />
                Select Properties ({selectedProperties.length} selected)
              </label>
              <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                {getAvailableProperties().map((property) => (
                  <div
                    key={property._id}
                    className={`p-4 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 ${
                      selectedProperties.includes(property._id) ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => toggleProperty(property._id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-4 h-4 border-2 rounded mr-3 flex items-center justify-center ${
                          selectedProperties.includes(property._id)
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300'
                        }`}>
                          {selectedProperties.includes(property._id) && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">
                            {property.address}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {property.type} • ZMW {property.monthlyRent?.toLocaleString()}/month
                          </p>
                          <p className="text-xs text-gray-500">
                            Owner: {property.landlord?.name || 'Unknown'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {getAvailableProperties().length === 0 && (
                <div className="text-center py-8 text-gray-500 border border-gray-200 rounded-lg">
                  <Building className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>No available properties</p>
                  <p className="text-sm mt-1">
                    {selectedAdmin ? 'All properties are already assigned to this admin' : 'Select an admin first'}
                  </p>
                </div>
              )}
            </div>

            {/* Select Permissions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <Settings className="w-4 h-4 inline mr-2" />
                Permissions ({selectedPermissions.length} selected)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {permissionOptions.map((permission) => (
                  <div
                    key={permission.value}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedPermissions.includes(permission.value)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => togglePermission(permission.value)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">
                          {permission.label}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {permission.description}
                        </p>
                      </div>
                      {selectedPermissions.includes(permission.value) && (
                        <Check className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <Link
                href="/manager/assign-properties"
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting || !selectedAdmin || selectedProperties.length === 0}
                className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Assign Properties
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}