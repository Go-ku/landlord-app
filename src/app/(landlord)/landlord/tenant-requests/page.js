// app/landlord/tenant-requests/page.js
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  User,
  Home,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  Building,
  AlertCircle,
  Loader2,
  FileText,
  ArrowRight
} from 'lucide-react';

export default function TenantRequestsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingRequest, setProcessingRequest] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [responseMessage, setResponseMessage] = useState('');
  const [filter, setFilter] = useState('all'); // all, pending, approved, rejected

  // Check authorization
  useEffect(() => {
    if (session && session.user.role !== 'landlord') {
      router.push('/dashboard');
    }
  }, [session, router]);

  // Fetch tenant requests
  useEffect(() => {
    if (session?.user?.role === 'landlord') {
      fetchTenantRequests();
    }
  }, [session]);

  const fetchTenantRequests = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/landlord/tenant-requests');
      const data = await response.json();
      
      if (data.success) {
        setRequests(data.data);
      } else {
        console.error('Failed to fetch requests:', data.error);
      }
    } catch (error) {
      console.error('Error fetching tenant requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestAction = async (requestId, action, message) => {
    setProcessingRequest(requestId);
    try {
      const response = await fetch(`/api/landlord/tenant-requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          message
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Update the request in the list
        setRequests(prev => prev.map(req => 
          req._id === requestId ? { ...req, ...data.data } : req
        ));
        setSelectedRequest(null);
        setResponseMessage('');
      } else {
        alert(data.error || 'Failed to process request');
      }
    } catch (error) {
      console.error('Error processing request:', error);
      alert('Failed to process request');
    } finally {
      setProcessingRequest(null);
    }
  };

  const filteredRequests = requests.filter(request => {
    if (filter === 'all') return true;
    return request.status === filter;
  });

  if (session?.user?.role !== 'landlord') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">This page is only accessible to landlords.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tenant Requests</h1>
          <p className="text-gray-600">
            Manage tenant registration and property requests
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-wrap gap-4">
            {[
              { key: 'all', label: 'All Requests', icon: FileText },
              { key: 'pending', label: 'Pending', icon: Clock },
              { key: 'approved', label: 'Approved', icon: CheckCircle },
              { key: 'rejected', label: 'Rejected', icon: XCircle }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`flex items-center px-4 py-2 rounded-lg border transition-colors ${
                  filter === key
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {label}
                <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                  {key === 'all' ? requests.length : requests.filter(r => r.status === key).length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading tenant requests...</p>
          </div>
        )}

        {/* Requests List */}
        {!isLoading && (
          <div className="space-y-6">
            {filteredRequests.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
                <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No requests found</h3>
                <p className="text-gray-600">
                  {filter === 'all' 
                    ? "You don't have any tenant requests yet."
                    : `No ${filter} requests found.`
                  }
                </p>
              </div>
            ) : (
              filteredRequests.map((request) => (
                <div key={request._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {request.tenant?.name || 'Unknown Tenant'}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {request.requestType === 'existing_property' ? 'Property Rental Request' : 'New Property Request'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        request.status === 'pending' 
                          ? 'bg-yellow-100 text-yellow-800'
                          : request.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {request.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                        {request.status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {request.status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Tenant Info */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Tenant Information</h4>
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-gray-600">
                          <Mail className="w-4 h-4 mr-2" />
                          {request.tenant?.email || 'No email provided'}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="w-4 h-4 mr-2" />
                          {request.tenant?.phone || 'No phone provided'}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="w-4 h-4 mr-2" />
                          Registered: {new Date(request.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    {/* Property Info */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Property Details</h4>
                      {request.requestType === 'existing_property' && request.property ? (
                        <div className="space-y-2">
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="w-4 h-4 mr-2" />
                            {request.property.address}
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <DollarSign className="w-4 h-4 mr-2" />
                            ${request.property.monthlyRent.toLocaleString()}/month
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <Building className="w-4 h-4 mr-2" />
                            {request.property.type}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="w-4 h-4 mr-2" />
                            {request.requestedPropertyDetails?.address || 'Address not provided'}
                          </div>
                          {request.requestedPropertyDetails?.estimatedRent && (
                            <div className="flex items-center text-sm text-gray-600">
                              <DollarSign className="w-4 h-4 mr-2" />
                              ~${request.requestedPropertyDetails.estimatedRent.toLocaleString()}/month (estimated)
                            </div>
                          )}
                          <div className="flex items-center text-sm text-gray-600">
                            <Building className="w-4 h-4 mr-2" />
                            {request.requestedPropertyDetails?.propertyType || 'Type not specified'}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Move-in Preferences */}
                  {request.moveInPreferences && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Move-in Preferences</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        {request.moveInPreferences.preferredDate && (
                          <div>
                            <strong>Preferred Date:</strong> {new Date(request.moveInPreferences.preferredDate).toLocaleDateString()}
                          </div>
                        )}
                        <div>
                          <strong>Lease Duration:</strong> {request.moveInPreferences.leaseDuration || 12} months
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {request.status === 'pending' && (
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => setSelectedRequest(request)}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        disabled={processingRequest === request._id}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve Request
                      </button>
                      
                      <button
                        onClick={() => handleRequestAction(request._id, 'reject', 'Request declined')}
                        className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        disabled={processingRequest === request._id}
                      >
                        {processingRequest === request._id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <XCircle className="w-4 h-4 mr-2" />
                        )}
                        Decline Request
                      </button>

                      <button
                        className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Send Message
                      </button>
                    </div>
                  )}

                  {/* Response */}
                  {request.landlordResponse && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">Your Response</h4>
                      <p className="text-blue-800 text-sm">{request.landlordResponse.message}</p>
                      <p className="text-blue-600 text-xs mt-1">
                        Responded on {new Date(request.landlordResponse.respondedAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Approval Modal */}
        {selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Approve Tenant Request
              </h3>
              
              <p className="text-gray-600 mb-4">
               {` Approve {selectedRequest.tenant?.name}'s request to rent your property?`}
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Response Message (Optional)
                </label>
                <textarea
                  value={responseMessage}
                  onChange={(e) => setResponseMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Welcome! Please contact me to arrange a property viewing..."
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => handleRequestAction(selectedRequest._id, 'approve', responseMessage || 'Request approved')}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  disabled={processingRequest === selectedRequest._id}
                >
                  {processingRequest === selectedRequest._id ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    'Approve Request'
                  )}
                </button>
                
                <button
                  onClick={() => {
                    setSelectedRequest(null);
                    setResponseMessage('');
                  }}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}