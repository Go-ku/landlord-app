// app/manager/assign-properties/bulk-assign/page.js
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Settings, 
  Building, 
  ArrowLeft, 
  Check,
  AlertCircle,
  Loader2,
  Users,
  MapPin,
  Shield,
  Plus,
  X,
  CheckCircle,
  RotateCcw,
  Download
} from 'lucide-react';

export default function BulkAssignmentPage() {
  const { data: session } = useSession();
  const router = useRouter();
  
  // State
  const [admins, setAdmins] = useState([]);
  const [properties, setProperties] = useState([]);
  const [selectedAdmins, setSelectedAdmins] = useState([]);
  const [selectedProperties, setSelectedProperties] = useState([]);
  const [selectedPermissions, setSelectedPermissions] = useState(['log_payments', 'create_invoices']);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [assignmentResults, setAssignmentResults] = useState([]);

  // Permission options
  const permissionOptions = [
    { value: 'log_payments', label: 'Log Payments', description: 'Record tenant payments' },
    { value: 'create_invoices', label: 'Create Invoices', description: 'Generate invoices for tenants' },
    { value: 'view_reports', label: 'View Reports', description: 'Access financial reports' },
    { value: 'manage_tenants', label: 'Manage Tenants', description: 'Handle tenant information' }
  ];

  // Assignment strategies
  const [assignmentStrategy, setAssignmentStrategy] = useState('distribute'); // 'distribute', 'assign_all', 'custom'

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

  // Get available properties (not already assigned to selected admins)
  const getAvailableProperties = () => {
    if (selectedAdmins.length === 0) return properties;
    
    const assignedPropertyIds = new Set();
    selectedAdmins.forEach(adminId => {
      const admin = admins.find(a => a._id === adminId);
      if (admin) {
        admin.assignedProperties
          .filter(assignment => assignment.isActive)
          .forEach(assignment => {
            if (assignment.property?._id) {
              assignedPropertyIds.add(assignment.property._id);
            }
          });
      }
    });
    
    return properties.filter(property => !assignedPropertyIds.has(property._id));
  };

  // Generate assignment plan based on strategy
  const generateAssignmentPlan = () => {
    if (selectedAdmins.length === 0 || selectedProperties.length === 0) {
      return [];
    }

    const plan = [];
    
    switch (assignmentStrategy) {
      case 'assign_all':
        // Assign all properties to all admins
        selectedAdmins.forEach(adminId => {
          selectedProperties.forEach(propertyId => {
            plan.push({ adminId, propertyId });
          });
        });
        break;
        
      case 'distribute':
        // Distribute properties evenly among admins
        let adminIndex = 0;
        selectedProperties.forEach(propertyId => {
          plan.push({ 
            adminId: selectedAdmins[adminIndex], 
            propertyId 
          });
          adminIndex = (adminIndex + 1) % selectedAdmins.length;
        });
        break;
        
      case 'custom':
        // For now, same as distribute - could be enhanced with custom logic
        let customAdminIndex = 0;
        selectedProperties.forEach(propertyId => {
          plan.push({ 
            adminId: selectedAdmins[customAdminIndex], 
            propertyId 
          });
          customAdminIndex = (customAdminIndex + 1) % selectedAdmins.length;
        });
        break;
        
      default:
        break;
    }
    
    return plan;
  };

  // Handle bulk submission
  const handleBulkAssign = async () => {
    if (selectedAdmins.length === 0) {
      setError('Please select at least one admin');
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
    setAssignmentResults([]);

    const assignmentPlan = generateAssignmentPlan();
    const results = [];

    try {
      for (const assignment of assignmentPlan) {
        try {
          const response = await fetch('/api/manager/assign-properties', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              adminId: assignment.adminId,
              propertyId: assignment.propertyId,
              permissions: selectedPermissions
            }),
          });

          const data = await response.json();
          
          const admin = admins.find(a => a._id === assignment.adminId);
          const property = properties.find(p => p._id === assignment.propertyId);
          
          results.push({
            admin: admin?.name || 'Unknown Admin',
            property: property?.address || 'Unknown Property',
            success: data.success,
            error: data.error || null
          });
        } catch (error) {
          const admin = admins.find(a => a._id === assignment.adminId);
          const property = properties.find(p => p._id === assignment.propertyId);
          
          results.push({
            admin: admin?.name || 'Unknown Admin',
            property: property?.address || 'Unknown Property',
            success: false,
            error: error.message || 'Failed to assign'
          });
        }
      }

      setAssignmentResults(results);
      
      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;
      
      if (successCount === totalCount) {
        setSuccess(`Successfully completed all ${totalCount} assignments!`);
      } else if (successCount > 0) {
        setSuccess(`Completed ${successCount} of ${totalCount} assignments. Check results below.`);
      } else {
        setError('All assignments failed. Please check the results below.');
      }
      
    } catch (error) {
      console.error('Bulk assignment error:', error);
      setError('Failed to complete bulk assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setSelectedAdmins([]);
    setSelectedProperties([]);
    setSelectedPermissions(['log_payments', 'create_invoices']);
    setAssignmentStrategy('distribute');
    setAssignmentResults([]);
    setError('');
    setSuccess('');
  };

  // Export results
  const exportResults = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Admin,Property,Status,Error\n" +
      assignmentResults.map(r => 
        `"${r.admin}","${r.property}","${r.success ? 'Success' : 'Failed'}","${r.error || ''}"`
      ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `bulk_assignment_results_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading bulk assignment...</p>
        </div>
      </div>
    );
  }

  const assignmentPlan = generateAssignmentPlan();
  const availableProperties = getAvailableProperties();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Link
              href="/manager/assign-properties"
              className="inline-flex items-center text-gray-600 hover:text-gray-900 mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Assignments
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Settings className="w-6 h-6 mr-3 text-purple-600" />
                Bulk Property Assignment
              </h1>
              <p className="text-gray-600 mt-1">
                Assign multiple properties to multiple admins efficiently
              </p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </button>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Selection */}
          <div className="space-y-6">
            {/* Select Admins */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Select Admins ({selectedAdmins.length} selected)
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {admins.map((admin) => (
                  <div
                    key={admin._id}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedAdmins.includes(admin._id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => {
                      setSelectedAdmins(prev => 
                        prev.includes(admin._id)
                          ? prev.filter(id => id !== admin._id)
                          : [...prev, admin._id]
                      );
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Shield className="w-4 h-4 text-blue-600 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{admin.name}</p>
                          <p className="text-xs text-gray-500">
                            {admin.adminLevel} • {admin.assignedProperties?.filter(a => a.isActive).length || 0} properties
                          </p>
                        </div>
                      </div>
                      {selectedAdmins.includes(admin._id) && (
                        <Check className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Select Properties */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Select Properties ({selectedProperties.length} selected)
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableProperties.map((property) => (
                  <div
                    key={property._id}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedProperties.includes(property._id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => {
                      setSelectedProperties(prev => 
                        prev.includes(property._id)
                          ? prev.filter(id => id !== property._id)
                          : [...prev, property._id]
                      );
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{property.address}</p>
                          <p className="text-xs text-gray-500">
                            {property.type} • ZMW {property.monthlyRent?.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {selectedProperties.includes(property._id) && (
                        <Check className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Configuration & Preview */}
          <div className="space-y-6">
            {/* Assignment Strategy */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Assignment Strategy</h3>
              <div className="space-y-3">
                {[
                  { value: 'distribute', label: 'Distribute Evenly', description: 'Spread properties evenly among selected admins' },
                  { value: 'assign_all', label: 'Assign All to All', description: 'Assign every property to every admin' },
                  { value: 'custom', label: 'Custom Distribution', description: 'Use custom assignment logic' }
                ].map((strategy) => (
                  <div
                    key={strategy.value}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      assignmentStrategy === strategy.value
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setAssignmentStrategy(strategy.value)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{strategy.label}</p>
                        <p className="text-xs text-gray-500">{strategy.description}</p>
                      </div>
                      {assignmentStrategy === strategy.value && (
                        <Check className="w-4 h-4 text-purple-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Permissions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Permissions ({selectedPermissions.length} selected)
              </h3>
              <div className="space-y-2">
                {permissionOptions.map((permission) => (
                  <div
                    key={permission.value}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedPermissions.includes(permission.value)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => {
                      setSelectedPermissions(prev => 
                        prev.includes(permission.value)
                          ? prev.filter(p => p !== permission.value)
                          : [...prev, permission.value]
                      );
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{permission.label}</p>
                        <p className="text-xs text-gray-500">{permission.description}</p>
                      </div>
                      {selectedPermissions.includes(permission.value) && (
                        <Check className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Assignment Preview */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Assignment Preview ({assignmentPlan.length} assignments)
              </h3>
              {assignmentPlan.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {assignmentPlan.slice(0, 10).map((assignment, index) => {
                    const admin = admins.find(a => a._id === assignment.adminId);
                    const property = properties.find(p => p._id === assignment.propertyId);
                    return (
                      <div key={index} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                        <span className="text-blue-600 font-medium">{admin?.name}</span>
                        <span className="text-gray-400">→</span>
                        <span className="text-gray-900">{property?.address}</span>
                      </div>
                    );
                  })}
                  {assignmentPlan.length > 10 && (
                    <p className="text-xs text-gray-500 text-center">
                      +{assignmentPlan.length - 10} more assignments
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No assignments to preview. Select admins and properties first.</p>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Ready to assign {assignmentPlan.length} properties
          </div>
          <button
            onClick={handleBulkAssign}
            disabled={isSubmitting || assignmentPlan.length === 0}
            className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Assigning...
              </>
            ) : (
              <>
                <Plus className="w-5 h-5 mr-2" />
                Execute Bulk Assignment
              </>
            )}
          </button>
        </div>

        {/* Assignment Results */}
        {assignmentResults.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Assignment Results</h3>
              <button
                onClick={exportResults}
                className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                <Download className="w-4 h-4 mr-1" />
                Export CSV
              </button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {assignmentResults.map((result, index) => (
                <div key={index} className={`flex items-center justify-between p-3 rounded-lg ${
                  result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center">
                    {result.success ? (
                      <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                    ) : (
                      <X className="w-4 h-4 text-red-600 mr-2" />
                    )}
                    <span className="text-sm font-medium">{result.admin}</span>
                    <span className="text-gray-400 mx-2">→</span>
                    <span className="text-sm">{result.property}</span>
                  </div>
                  {result.error && (
                    <span className="text-xs text-red-600">{result.error}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}