'use client'
import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, Home, User, FileText, AlertCircle } from 'lucide-react';

// Internal date formatting function
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export default function NewLeaseForm() {
  const [formData, setFormData] = useState({
    // Core relationships
    propertyId: '',
    tenantId: '',
    landlordId: '',
    
    // Lease terms
    startDate: '',
    endDate: '',
    monthlyRent: '',
    securityDeposit: '',
    paymentDueDay: 1,
    
    // Status
    status: 'draft'
  });

  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [landlords, setLandlords] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      setDataLoading(true);
      try {
        // Fetch properties
        const propertiesResponse = await fetch('/api/properties');
        if (propertiesResponse.ok) {
          const propertiesData = await propertiesResponse.json();
          // Handle different response formats
          const propertiesArray = Array.isArray(propertiesData) 
            ? propertiesData 
            : propertiesData.properties || propertiesData.data || [];
          setProperties(propertiesArray);
        } else {
          console.error('Failed to fetch properties');
          setProperties([]); // Ensure it's always an array
          alert('Failed to load properties. Please refresh the page.');
        }

        // Fetch tenants (users with tenant role)
        const tenantsResponse = await fetch('/api/users?role=tenant');
        if (tenantsResponse.ok) {
          const tenantsData = await tenantsResponse.json();
          // Handle different response formats
          const tenantsArray = Array.isArray(tenantsData) 
            ? tenantsData 
            : tenantsData.users || tenantsData.data || [];
          setTenants(tenantsArray);
        } else {
          console.error('Failed to fetch tenants');
          setTenants([]); // Ensure it's always an array
          alert('Failed to load tenants. Please refresh the page.');
        }

        // Fetch landlords (users with landlord role) as backup
        const landlordsResponse = await fetch('/api/users?role=landlord');
        if (landlordsResponse.ok) {
          const landlordsData = await landlordsResponse.json();
          // Handle different response formats
          const landlordsArray = Array.isArray(landlordsData) 
            ? landlordsData 
            : landlordsData.users || landlordsData.data || [];
          setLandlords(landlordsArray);
        } else {
          console.warn('Could not fetch landlords list');
          setLandlords([]); // Ensure it's always an array
        }

        // Get current user (landlord) - try multiple endpoints
        try {
          let userData = null;
          
          // Try /api/auth/me first
          const userResponse = await fetch('/api/auth/me');
          if (userResponse.ok) {
            userData = await userResponse.json();
          } else {
            // Try alternative endpoints
            const altResponse = await fetch('/api/user/me');
            if (altResponse.ok) {
              userData = await altResponse.json();
            } else {
              const sessionResponse = await fetch('/api/auth/session');
              if (sessionResponse.ok) {
                const sessionData = await sessionResponse.json();
                userData = sessionData.user;
              }
            }
          }
          
          if (userData) {
            setFormData(prev => ({ ...prev, landlordId: userData._id || userData.id }));
          } else {
            console.warn('Could not fetch current user. Manual landlord selection may be required.');
            // Don't show alert, just log warning and continue
          }
        } catch (userError) {
          console.warn('Error fetching current user:', userError);
          // Continue without setting landlordId - form can still work
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        // Ensure all arrays are initialized even on error
        setProperties([]);
        setTenants([]);
        setLandlords([]);
        alert('Failed to load data. Please check your connection and refresh the page.');
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || '' : value
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.propertyId) newErrors.propertyId = 'Property selection is required';
    if (!formData.tenantId) newErrors.tenantId = 'Tenant selection is required';
    if (!formData.landlordId) newErrors.landlordId = 'Landlord selection is required';
    if (!formData.startDate) newErrors.startDate = 'Lease start date is required';
    if (!formData.endDate) newErrors.endDate = 'Lease end date is required';
    if (!formData.monthlyRent) newErrors.monthlyRent = 'Monthly rent is required';
    if (!formData.securityDeposit) newErrors.securityDeposit = 'Security deposit is required';
    
    // Validate date range
    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      if (endDate <= startDate) {
        newErrors.endDate = 'End date must be after start date';
      }
    }
    
    // Validate payment due day
    if (formData.paymentDueDay < 1 || formData.paymentDueDay > 31) {
      newErrors.paymentDueDay = 'Payment due day must be between 1 and 31';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateNextPaymentDue = () => {
    if (!formData.startDate || !formData.paymentDueDay) return null;
    
    const startDate = new Date(formData.startDate);
    const nextPayment = new Date(startDate);
    nextPayment.setDate(formData.paymentDueDay);
    
    // If the due day is before the start date in the same month, move to next month
    if (nextPayment < startDate) {
      nextPayment.setMonth(nextPayment.getMonth() + 1);
    }
    
    return nextPayment;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const nextPaymentDue = calculateNextPaymentDue();
      
      // Ensure all data is properly formatted
      const leaseData = {
        propertyId: formData.propertyId,
        tenantId: formData.tenantId,
        landlordId: formData.landlordId,
        startDate: formData.startDate,
        endDate: formData.endDate,
        monthlyRent: parseFloat(formData.monthlyRent) || 0,
        securityDeposit: parseFloat(formData.securityDeposit) || 0,
        paymentDueDay: parseInt(formData.paymentDueDay) || 1,
        status: formData.status || 'draft',
        nextPaymentDue: nextPaymentDue ? nextPaymentDue.toISOString() : null,
        balanceDue: parseFloat(formData.monthlyRent) || 0,
        totalPaid: 0
      };

      console.log('Submitting lease data:', leaseData);
      
      const response = await fetch('/api/leases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leaseData),
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      if (response.ok) {
        const responseText = await response.text();
        console.log('Raw response:', responseText);
        
        if (responseText) {
          try {
            const result = JSON.parse(responseText);
            console.log('Parsed result:', result);
            alert('Lease created successfully!');
            
            // Use the _id from the response or construct URL differently
            const leaseId = result._id || result.id;
            if (leaseId) {
              window.location.href = `/leases/${leaseId}`;
            } else {
              window.location.href = '/leases';
            }
          } catch (parseError) {
            console.error('Error parsing success response:', parseError);
            console.error('Response text was:', responseText);
            alert('Lease created successfully, but there was an issue with the response format.');
            window.location.href = '/leases';
          }
        } else {
          console.log('Empty response body, but status was OK');
          alert('Lease created successfully!');
          window.location.href = '/leases';
        }
      } else {
        // Handle error responses
        const responseText = await response.text();
        console.error('Error response:', responseText);
        console.error('Response status:', response.status, response.statusText);
        
        let errorMessage = 'Failed to create lease';
        
        if (responseText) {
          try {
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.error || errorData.message || errorData.details || errorMessage;
            console.error('Parsed error:', errorData);
          } catch (parseError) {
            console.error('Could not parse error response:', parseError);
            errorMessage = `Server error: ${response.status} ${response.statusText}`;
          }
        } else {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Complete error details:', error);
      console.error('Error stack:', error.stack);
      
      let userMessage = 'Failed to create lease';
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        userMessage = 'Network error: Could not connect to server. Please check your connection.';
      } else if (error.message.includes('JSON')) {
        userMessage = 'Server response error: Invalid data format received.';
      } else {
        userMessage = `Failed to create lease: ${error.message}`;
      }
      
      alert(userMessage);
    } finally {
      setLoading(false);
    }
  };

  const selectedProperty = Array.isArray(properties) ? properties.find(p => p._id === formData.propertyId) : null;
  const selectedTenant = Array.isArray(tenants) ? tenants.find(t => t._id === formData.tenantId) : null;
  const selectedLandlord = Array.isArray(landlords) ? landlords.find(l => l._id === formData.landlordId) : null;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 text-white px-6 py-4">
            <h1 className="text-2xl font-bold flex items-center">
              <FileText className="mr-3" />
              Create New Lease Agreement
            </h1>
            <p className="text-blue-100 mt-1">Set up a new lease between tenant and property</p>
          </div>

          <div className="p-6 space-y-8">
            {/* Loading State */}
            {dataLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading properties and tenants...</span>
              </div>
            ) : (
              <>
            {/* Property & Tenant Selection */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <Home className="mr-2 text-blue-600" />
                Property & Tenant Selection
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Property *
                  </label>
                  <select
                    name="propertyId"
                    value={formData.propertyId}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.propertyId ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    {!Array.isArray(properties) || properties.length === 0 ? (
                      <option value="">No properties available</option>
                    ) : (
                      <>
                        <option value="">Choose a property...</option>
                        {properties.map(property => (
                          <option key={property._id} value={property._id}>
                            {property.address || property.name || 'Unnamed Property'}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  {errors.propertyId && <p className="text-red-500 text-sm mt-1">{errors.propertyId}</p>}
                  
                  {selectedProperty && (
                    <div className="mt-2 p-3 bg-blue-50 rounded-md">
                      <p className="text-sm text-blue-800">
                        <strong>Selected:</strong> {selectedProperty.address || selectedProperty.name || 'Unnamed Property'}
                      </p>
                      {selectedProperty.type && (
                        <p className="text-sm text-blue-600">Type: {selectedProperty.type}</p>
                      )}
                      {selectedProperty.rent && (
                        <p className="text-sm text-blue-600">Listed Rent: ${selectedProperty.rent}</p>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Tenant *
                  </label>
                  <select
                    name="tenantId"
                    value={formData.tenantId}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.tenantId ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    {!Array.isArray(tenants) || tenants.length === 0 ? (
                      <option value="">No tenants available</option>
                    ) : (
                      <>
                        <option value="">Choose a tenant...</option>
                        {tenants.map(tenant => (
                          <option key={tenant._id} value={tenant._id}>
                            {tenant.name || `${tenant.firstName} ${tenant.lastName}` || tenant.email}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  {errors.tenantId && <p className="text-red-500 text-sm mt-1">{errors.tenantId}</p>}
                  
                  {selectedTenant && (
                    <div className="mt-2 p-3 bg-green-50 rounded-md">
                      <p className="text-sm text-green-800">
                        <strong>Selected:</strong> {selectedTenant.name || `${selectedTenant.firstName} ${selectedTenant.lastName}` || 'Unnamed Tenant'}
                      </p>
                      {selectedTenant.email && (
                        <p className="text-sm text-green-600">Email: {selectedTenant.email}</p>
                      )}
                      {selectedTenant.phone && (
                        <p className="text-sm text-green-600">Phone: {selectedTenant.phone}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Landlord Selection - show if landlordId not auto-set */}
                {(!formData.landlordId && Array.isArray(landlords) && landlords.length > 0) && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Landlord *
                    </label>
                    <select
                      name="landlordId"
                      value={formData.landlordId}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.landlordId ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Choose a landlord...</option>
                      {landlords.map(landlord => (
                        <option key={landlord._id} value={landlord._id}>
                          {landlord.name || `${landlord.firstName} ${landlord.lastName}` || landlord.email}
                        </option>
                      ))}
                    </select>
                    {errors.landlordId && <p className="text-red-500 text-sm mt-1">{errors.landlordId}</p>}
                    <p className="text-sm text-gray-500 mt-1">
                      Could not auto-detect current user. Please select the landlord manually.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Lease Terms */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <Calendar className="mr-2 text-blue-600" />
                Lease Terms
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lease Start Date *
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.startDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.startDate && <p className="text-red-500 text-sm mt-1">{errors.startDate}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lease End Date *
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.endDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.endDate && <p className="text-red-500 text-sm mt-1">{errors.endDate}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Rent *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="number"
                      name="monthlyRent"
                      value={formData.monthlyRent}
                      onChange={handleInputChange}
                      className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.monthlyRent ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="1500"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  {errors.monthlyRent && <p className="text-red-500 text-sm mt-1">{errors.monthlyRent}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Security Deposit *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="number"
                      name="securityDeposit"
                      value={formData.securityDeposit}
                      onChange={handleInputChange}
                      className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.securityDeposit ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="1500"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  {errors.securityDeposit && <p className="text-red-500 text-sm mt-1">{errors.securityDeposit}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Due Day of Month *
                  </label>
                  <select
                    name="paymentDueDay"
                    value={formData.paymentDueDay}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.paymentDueDay ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>
                        {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} of each month
                      </option>
                    ))}
                  </select>
                  {errors.paymentDueDay && <p className="text-red-500 text-sm mt-1">{errors.paymentDueDay}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lease Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="terminated">Terminated</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Lease Summary */}
            {formData.startDate && formData.endDate && formData.monthlyRent && (
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <AlertCircle className="mr-2 text-green-600" />
                  Lease Summary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Lease Duration</p>
                    <p className="font-medium">
                      {Math.ceil((new Date(formData.endDate) - new Date(formData.startDate)) / (1000 * 60 * 60 * 24))} days
                      <br />
                      <span className="text-sm text-gray-500">
                        {formatDate(formData.startDate)} - {formatDate(formData.endDate)}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Monthly Rent</p>
                    <p className="font-medium">${parseFloat(formData.monthlyRent || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Security Deposit</p>
                    <p className="font-medium">${parseFloat(formData.securityDeposit || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total Move-in Cost</p>
                    <p className="font-medium text-lg">
                      ${(parseFloat(formData.monthlyRent || 0) + parseFloat(formData.securityDeposit || 0)).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Next Payment Due</p>
                    <p className="font-medium">
                      {calculateNextPaymentDue()?.toLocaleDateString() || 'Not calculated'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Payment Due Day</p>
                    <p className="font-medium">
                      {formData.paymentDueDay}{formData.paymentDueDay === 1 ? 'st' : formData.paymentDueDay === 2 ? 'nd' : formData.paymentDueDay === 3 ? 'rd' : 'th'} of each month
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-4">
              <button
                type="button"
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => window.history.back()}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || dataLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Lease...' : 'Create Lease Agreement'}
              </button>
            </div>
            </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}