// app/dashboard/leases/create/CreateLeaseForm.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  User, 
  Building, 
  Calendar, 
  DollarSign, 
  FileText, 
  AlertCircle, 
  CheckCircle,
  Loader2,
  ArrowLeft,
  Search
} from 'lucide-react';

export default function CreateLeaseForm({ prefilledData, landlordId }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Tenant search
  const [searchingTenants, setSearchingTenants] = useState(false);
  const [tenantSearchResults, setTenantSearchResults] = useState([]);
  const [tenantSearchTerm, setTenantSearchTerm] = useState('');
  
  // Property search
  const [searchingProperties, setSearchingProperties] = useState(false);
  const [propertySearchResults, setPropertySearchResults] = useState([]);
  const [propertySearchTerm, setPropertySearchTerm] = useState('');

  const [formData, setFormData] = useState({
    // Tenant Information
    tenantId: prefilledData?.tenant?._id || '',
    tenantName: prefilledData?.tenant?.name || '',
    tenantEmail: prefilledData?.tenant?.email || '',
    tenantPhone: prefilledData?.tenant?.phone || '',
    
    // Property Information
    propertyId: prefilledData?.property?._id || '',
    propertyAddress: prefilledData?.property?.address || '',
    propertyType: prefilledData?.property?.type || 'Apartment',
    
    // Lease Terms
    startDate: '',
    endDate: '',
    monthlyRent: prefilledData?.property?.monthlyRent || prefilledData?.request?.requestedPropertyDetails?.estimatedRent || '',
    securityDeposit: prefilledData?.property?.securityDeposit || '',
    paymentDueDay: prefilledData?.request?.moveInPreferences?.paymentDueDay || 1,
    leaseDuration: prefilledData?.request?.moveInPreferences?.leaseDuration || 12,
    
    // Status
    status: 'draft'
  });

  // Set default dates based on lease duration
  useEffect(() => {
    if (formData.leaseDuration && !formData.startDate) {
      const startDate = prefilledData?.request?.moveInPreferences?.preferredDate 
        ? new Date(prefilledData.request.moveInPreferences.preferredDate)
        : new Date();
      
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + parseInt(formData.leaseDuration));
      
      setFormData(prev => ({
        ...prev,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      }));
    }
  }, [formData.leaseDuration, prefilledData]);

  // Search tenants
  const searchTenants = async (query) => {
    if (!query.trim()) {
      setTenantSearchResults([]);
      return;
    }
    
    setSearchingTenants(true);
    try {
      const response = await fetch(`/api/users/search?role=tenant&q=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (data.success) {
        setTenantSearchResults(data.data.users || []);
      }
    } catch (error) {
      console.error('Error searching tenants:', error);
    } finally {
      setSearchingTenants(false);
    }
  };

  // Search properties
  const searchProperties = async (query) => {
    if (!query.trim()) {
      setPropertySearchResults([]);
      return;
    }
    
    setSearchingProperties(true);
    try {
      const response = await fetch(`/api/properties/search?landlord=${landlordId}&q=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (data.success) {
        setPropertySearchResults(data.data.properties || []);
      }
    } catch (error) {
      console.error('Error searching properties:', error);
    } finally {
      setSearchingProperties(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (tenantSearchTerm && !formData.tenantId) {
        searchTenants(tenantSearchTerm);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [tenantSearchTerm, formData.tenantId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (propertySearchTerm && !formData.propertyId) {
        searchProperties(propertySearchTerm);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [propertySearchTerm, formData.propertyId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const selectTenant = (tenant) => {
    setFormData(prev => ({
      ...prev,
      tenantId: tenant._id,
      tenantName: tenant.name,
      tenantEmail: tenant.email,
      tenantPhone: tenant.phone || ''
    }));
    setTenantSearchResults([]);
    setTenantSearchTerm('');
  };

  const selectProperty = (property) => {
    setFormData(prev => ({
      ...prev,
      propertyId: property._id,
      propertyAddress: property.address,
      propertyType: property.type,
      monthlyRent: property.monthlyRent || prev.monthlyRent,
      securityDeposit: property.securityDeposit || prev.securityDeposit
    }));
    setPropertySearchResults([]);
    setPropertySearchTerm('');
  };

  const clearTenant = () => {
    setFormData(prev => ({
      ...prev,
      tenantId: '',
      tenantName: '',
      tenantEmail: '',
      tenantPhone: ''
    }));
  };

  const clearProperty = () => {
    setFormData(prev => ({
      ...prev,
      propertyId: '',
      propertyAddress: '',
      propertyType: 'Apartment'
    }));
  };

  const validateForm = () => {
    const errors = [];
    
    if (!formData.tenantId) errors.push('Please select a tenant');
    if (!formData.propertyId && !formData.propertyAddress) errors.push('Please select a property or enter property address');
    if (!formData.startDate) errors.push('Start date is required');
    if (!formData.endDate) errors.push('End date is required');
    if (!formData.monthlyRent || formData.monthlyRent <= 0) errors.push('Monthly rent must be greater than 0');
    if (!formData.securityDeposit || formData.securityDeposit < 0) errors.push('Security deposit must be 0 or greater');
    
    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);
    
    if (startDate >= endDate) errors.push('End date must be after start date');
    
    if (errors.length > 0) {
      setError(errors.join(', '));
      return false;
    }
    
    setError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const leaseData = {
        propertyId: formData.propertyId,
        tenantId: formData.tenantId,
        landlordId: landlordId,
        startDate: formData.startDate,
        endDate: formData.endDate,
        monthlyRent: parseFloat(formData.monthlyRent),
        securityDeposit: parseFloat(formData.securityDeposit),
        paymentDueDay: parseInt(formData.paymentDueDay),
        status: formData.status,
        balanceDue: parseFloat(formData.monthlyRent)
      };

      const response = await fetch('/api/leases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leaseData)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push(`/dashboard/leases/${data._id}`);
        }, 2000);
      } else {
        setError(data.details?.join(', ') || data.error || 'Failed to create lease');
      }
    } catch (error) {
      console.error('Error creating lease:', error);
      setError('Network error creating lease');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Lease Created Successfully!</h2>
        <p className="text-gray-600 mb-4">
          The lease agreement has been created and is now available for review.
        </p>
        <p className="text-sm text-gray-500">Redirecting to lease details...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Lease Agreement Details</h2>
            {prefilledData?.request && (
              <p className="text-sm text-blue-600 mt-1">
                ✓ Pre-filled from approved property request
              </p>
            )}
          </div>
          <Link
            href="/dashboard/property-requests"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Requests
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Tenant Selection */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Tenant Information</h3>
          </div>

          {formData.tenantId ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-green-900">{formData.tenantName}</p>
                  <p className="text-sm text-green-700">{formData.tenantEmail}</p>
                  {formData.tenantPhone && (
                    <p className="text-sm text-green-700">{formData.tenantPhone}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={clearTenant}
                  className="text-green-600 hover:text-green-800 text-sm"
                >
                  Change
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search for Tenant
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={tenantSearchTerm}
                  onChange={(e) => setTenantSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Search by name or email..."
                />
                {searchingTenants && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-500 animate-spin" />
                )}
              </div>
              
              {tenantSearchResults.length > 0 && (
                <div className="mt-2 border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
                  {tenantSearchResults.map((tenant) => (
                    <button
                      key={tenant._id}
                      type="button"
                      onClick={() => selectTenant(tenant)}
                      className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <p className="font-medium text-gray-900">{tenant.name}</p>
                      <p className="text-sm text-gray-600">{tenant.email}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Property Selection */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Building className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Property Information</h3>
          </div>

          {formData.propertyId ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-blue-900">{formData.propertyAddress}</p>
                  <p className="text-sm text-blue-700">{formData.propertyType}</p>
                </div>
                <button
                  type="button"
                  onClick={clearProperty}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Change
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search for Property or Enter Address
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={propertySearchTerm}
                  onChange={(e) => setPropertySearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Search existing properties or enter new address..."
                />
                {searchingProperties && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-500 animate-spin" />
                )}
              </div>
              
              {propertySearchResults.length > 0 && (
                <div className="mt-2 border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
                  {propertySearchResults.map((property) => (
                    <button
                      key={property._id}
                      type="button"
                      onClick={() => selectProperty(property)}
                      className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <p className="font-medium text-gray-900">{property.address}</p>
                      <p className="text-sm text-gray-600">{property.type} • ${property.monthlyRent?.toLocaleString()}/month</p>
                    </button>
                  ))}
                </div>
              )}
              
              <div className="mt-3">
                <input
                  type="text"
                  name="propertyAddress"
                  value={formData.propertyAddress}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Or enter property address manually..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Lease Terms */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Lease Terms</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date *
              </label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monthly Rent ($) *
              </label>
              <input
                type="number"
                name="monthlyRent"
                value={formData.monthlyRent}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Security Deposit ($) *
              </label>
              <input
                type="number"
                name="securityDeposit"
                value={formData.securityDeposit}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Due Day
              </label>
              <select
                name="paymentDueDay"
                value={formData.paymentDueDay}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Creating Lease...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Create Lease Agreement
              </>
            )}
          </button>

          <Link
            href="/dashboard/leases"
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}