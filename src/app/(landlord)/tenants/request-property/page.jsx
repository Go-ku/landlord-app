// app/tenant/request-property/page.tsx - Property request form for tenants
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Home, 
  MapPin, 
  DollarSign, 
  User, 
  Mail, 
  Phone,
  Calendar,
  FileText,
  Search
} from 'lucide-react';

export default function RequestPropertyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [requestType, setRequestType] = useState('new_property'); // 'existing_property' or 'new_property'
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  
  const [formData, setFormData] = useState({
    // Property details for new property requests
    address: '',
    estimatedRent: '',
    bedrooms: '',
    bathrooms: '',
    propertyType: 'Apartment',
    description: '',
    landlordEmail: '',
    landlordPhone: '',
    
    // Existing property ID for existing property requests
    propertyId: '',
    
    // Move-in preferences
    preferredMoveInDate: '',
    leaseDuration: '12',
    hasDeposit: false,
    depositAmount: '',
    additionalRequests: ''
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const searchExistingProperties = async (searchTerm) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(`/api/properties/search?q=${encodeURIComponent(searchTerm)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.properties || []);
      }
    } catch (error) {
      console.error('Error searching properties:', error);
    } finally {
      setSearching(false);
    }
  };

  const selectExistingProperty = (property) => {
    setFormData(prev => ({
      ...prev,
      propertyId: property._id,
      address: property.address,
      estimatedRent: property.monthlyRent.toString(),
      bedrooms: property.bedrooms?.toString() || '',
      bathrooms: property.bathrooms?.toString() || '',
      propertyType: property.type
    }));
    setSearchResults([]);
  };

  const submitRequest = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const requestPayload = {
        requestType,
        ...formData,
        moveInPreferences: {
          preferredDate: formData.preferredMoveInDate,
          leaseDuration: parseInt(formData.leaseDuration),
          hasDeposit: formData.hasDeposit,
          depositAmount: formData.hasDeposit ? parseFloat(formData.depositAmount) : 0,
          additionalRequests: formData.additionalRequests
        }
      };

      if (requestType === 'new_property') {
        requestPayload.requestedPropertyDetails = {
          address: formData.address,
          estimatedRent: parseFloat(formData.estimatedRent),
          bedrooms: parseInt(formData.bedrooms),
          bathrooms: parseFloat(formData.bathrooms),
          propertyType: formData.propertyType,
          description: formData.description,
          landlordEmail: formData.landlordEmail,
          landlordPhone: formData.landlordPhone
        };
      } else {
        requestPayload.property = formData.propertyId;
      }

      const response = await fetch('/api/tenants/property-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/tenant/property-requests/${data.requestId}`);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to submit property request');
        router.push(`/tenant/property-requests`);
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      alert('Failed to submit property request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Request a Property</h1>
            <p className="text-gray-600">
              Find your ideal rental property by requesting an existing listing or asking a landlord to list a new property.
            </p>
          </div>

          <form onSubmit={submitRequest} className="space-y-8">
            {/* Request Type Selection */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">What type of request is this?</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  requestType === 'existing_property' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="requestType"
                    value="existing_property"
                    checked={requestType === 'existing_property'}
                    onChange={(e) => setRequestType(e.target.value)}
                    className="sr-only"
                  />
                  <div className="flex items-center">
                    <Search className="w-6 h-6 text-blue-600 mr-3" />
                    <div>
                      <h3 className="font-medium text-gray-900">Existing Property</h3>
                      <p className="text-sm text-gray-600">Request to rent an existing listed property</p>
                    </div>
                  </div>
                </label>

                <label className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  requestType === 'new_property' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="requestType"
                    value="new_property"
                    checked={requestType === 'new_property'}
                    onChange={(e) => setRequestType(e.target.value)}
                    className="sr-only"
                  />
                  <div className="flex items-center">
                    <Home className="w-6 h-6 text-green-600 mr-3" />
                    <div>
                      <h3 className="font-medium text-gray-900">New Property Request</h3>
                      <p className="text-sm text-gray-600">Ask a landlord to list a specific property</p>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Existing Property Search */}
            {requestType === 'existing_property' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Search for Properties</h2>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by address, area, or property type..."
                    className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onChange={(e) => searchExistingProperties(e.target.value)}
                  />
                  <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                </div>

                {searching && (
                  <div className="mt-4 text-center py-4">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <p className="text-gray-600 mt-2">Searching properties...</p>
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <h3 className="font-medium text-gray-900">Available Properties</h3>
                    {searchResults.map((property) => (
                      <div 
                        key={property._id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          formData.propertyId === property._id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => selectExistingProperty(property)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-gray-900">{property.address}</h4>
                            <p className="text-sm text-gray-600">
                              {property.bedrooms} bed, {property.bathrooms} bath • {property.type}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">${property.monthlyRent.toLocaleString()}/mo</p>
                            <p className="text-sm text-gray-600">Available</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Property Details Form */}
            {(requestType === 'new_property' || formData.propertyId) && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Property Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      Property Address *
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter full address"
                      disabled={requestType === 'existing_property' && formData.propertyId}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <DollarSign className="w-4 h-4 inline mr-1" />
                      Expected Monthly Rent *
                    </label>
                    <input
                      type="number"
                      name="estimatedRent"
                      value={formData.estimatedRent}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., 1500"
                      disabled={requestType === 'existing_property' && formData.propertyId}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bedrooms</label>
                    <select
                      name="bedrooms"
                      value={formData.bedrooms}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={requestType === 'existing_property' && formData.propertyId}
                    >
                      <option value="">Select bedrooms</option>
                      <option value="0">Studio</option>
                      <option value="1">1 bedroom</option>
                      <option value="2">2 bedrooms</option>
                      <option value="3">3 bedrooms</option>
                      <option value="4">4+ bedrooms</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bathrooms</label>
                    <select
                      name="bathrooms"
                      value={formData.bathrooms}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={requestType === 'existing_property' && formData.propertyId}
                    >
                      <option value="">Select bathrooms</option>
                      <option value="1">1 bathroom</option>
                      <option value="1.5">1.5 bathrooms</option>
                      <option value="2">2 bathrooms</option>
                      <option value="2.5">2.5 bathrooms</option>
                      <option value="3">3+ bathrooms</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Property Type</label>
                    <select
                      name="propertyType"
                      value={formData.propertyType}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={requestType === 'existing_property' && formData.propertyId}
                    >
                      <option value="Apartment">Apartment</option>
                      <option value="House">House</option>
                      <option value="Condo">Condo</option>
                      <option value="Townhouse">Townhouse</option>
                    </select>
                  </div>
                </div>

                {requestType === 'new_property' && (
                  <>
                    <div className="mt-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Property Description
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Describe the property, amenities, or specific requirements..."
                      />
                    </div>

                    <div className="mt-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Landlord Contact Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Mail className="w-4 h-4 inline mr-1" />
                            Landlord Email
                          </label>
                          <input
                            type="email"
                            name="landlordEmail"
                            value={formData.landlordEmail}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="landlord@example.com"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Phone className="w-4 h-4 inline mr-1" />
                            Landlord Phone
                          </label>
                          <input
                            type="tel"
                            name="landlordPhone"
                            value={formData.landlordPhone}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="+260 XXX XXX XXX"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Move-in Preferences */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Move-in Preferences</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Preferred Move-in Date
                  </label>
                  <input
                    type="date"
                    name="preferredMoveInDate"
                    value={formData.preferredMoveInDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lease Duration (months)
                  </label>
                  <select
                    name="leaseDuration"
                    value={formData.leaseDuration}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="6">6 months</option>
                    <option value="12">12 months</option>
                    <option value="18">18 months</option>
                    <option value="24">24 months</option>
                  </select>
                </div>
              </div>

              <div className="mt-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="hasDeposit"
                    checked={formData.hasDeposit}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    I have funds available for security deposit
                  </span>
                </label>

                {formData.hasDeposit && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Available Deposit Amount
                    </label>
                    <input
                      type="number"
                      name="depositAmount"
                      value={formData.depositAmount}
                      onChange={handleInputChange}
                      className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., 1500"
                    />
                  </div>
                )}
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Additional Requests or Requirements
                </label>
                <textarea
                  name="additionalRequests"
                  value={formData.additionalRequests}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Any special requirements, questions, or additional information..."
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Home className="w-4 h-4 mr-2" />
                    Submit Property Request
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Information Panel */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">What happens next?</h3>
          <div className="space-y-3 text-blue-800">
            <div className="flex items-start">
              <div className="w-6 h-6 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center text-sm font-semibold mr-3 mt-0.5">1</div>
              <div>
                <p className="font-medium">Request Submitted</p>
                <p className="text-sm text-blue-700">Your property request will be sent to the landlord for review.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="w-6 h-6 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center text-sm font-semibold mr-3 mt-0.5">2</div>
              <div>
                <p className="font-medium">Landlord Review</p>
                <p className="text-sm text-blue-700">The landlord will review your request and may approve, reject, or ask for more information.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="w-6 h-6 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center text-sm font-semibold mr-3 mt-0.5">3</div>
              <div>
                <p className="font-medium">Lease Agreement</p>
                <p className="text-sm text-blue-700">If approved, the landlord will create a lease agreement for you to review and sign.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="w-6 h-6 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center text-sm font-semibold mr-3 mt-0.5">4</div>
              <div>
                <p className="font-medium">Move-in Ready</p>
                <p className="text-sm text-blue-700">After signing and making your first payment, you'll be ready to move in!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}