// app/dashboard/property-requests/page.js
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Building2, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  DollarSign, 
  Bed, 
  Bath, 
  MapPin, 
  Clock, 
  CheckCircle, 
  XCircle, 
  MessageSquare, 
  Filter, 
  Search,
  Eye,
  EyeOff,
  Send,
  AlertCircle,
  Loader2,
  Home,
  Plus,
  ExternalLink
} from 'lucide-react';

export default function PropertyRequestsPage() {
  const { data: session } = useSession();
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  
  // Selected request for detail view
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // Response handling
  const [responseMessage, setResponseMessage] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [isResponding, setIsResponding] = useState(false);

  // Load property requests
  useEffect(() => {
    fetchPropertyRequests();
  }, []);

  // Filter requests when filters change
  useEffect(() => {
    filterRequests();
  }, [requests, searchTerm, statusFilter, typeFilter]);

  const fetchPropertyRequests = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/property-requests');
      const data = await response.json();
      
      if (data.success) {
        setRequests(data.data.requests || []);
      } else {
        setError(data.error || 'Failed to load requests');
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
      setError('Network error loading requests');
    } finally {
      setIsLoading(false);
    }
  };

  const filterRequests = () => {
    let filtered = [...requests];
    
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(request => 
        request.tenant?.name?.toLowerCase().includes(search) ||
        request.tenant?.email?.toLowerCase().includes(search) ||
        request.requestedPropertyDetails?.address?.toLowerCase().includes(search) ||
        request.property?.address?.toLowerCase().includes(search)
      );
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(request => request.status === statusFilter);
    }
    
    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(request => request.requestType === typeFilter);
    }
    
    setFilteredRequests(filtered);
  };

  const handleApproveRequest = async (requestId) => {
    if (!responseMessage.trim()) {
      setError('Please provide a response message');
      return;
    }
    
    try {
      setIsResponding(true);
      const response = await fetch(`/api/property-requests/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseMessage,
          nextSteps: nextSteps || 'I will contact you to arrange a viewing and discuss lease terms.'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        await fetchPropertyRequests();
        setSelectedRequest(null);
        setShowDetails(false);
        setResponseMessage('');
        setNextSteps('');
        setError('');
      } else {
        setError(data.error || 'Failed to approve request');
      }
    } catch (error) {
      console.error('Error approving request:', error);
      setError('Network error approving request');
    } finally {
      setIsResponding(false);
    }
  };

  const handleRejectRequest = async (requestId) => {
    if (!responseMessage.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }
    
    try {
      setIsResponding(true);
      const response = await fetch(`/api/property-requests/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rejectionReason: responseMessage
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        await fetchPropertyRequests();
        setSelectedRequest(null);
        setShowDetails(false);
        setResponseMessage('');
        setError('');
      } else {
        setError(data.error || 'Failed to reject request');
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      setError('Network error rejecting request');
    } finally {
      setIsResponding(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      property_created: 'bg-blue-100 text-blue-800',
      lease_requested: 'bg-purple-100 text-purple-800'
    };
    
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getRequestTypeLabel = (type) => {
    const labels = {
      existing_property: 'Existing Property',
      new_property: 'New Property Request',
      lease_request: 'Lease Request'
    };
    
    return labels[type] || type;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading property requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Property Requests</h1>
              <p className="text-gray-600 mt-2">
                Manage requests from potential tenants for your properties
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-white px-4 py-2 rounded-lg shadow-sm border">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                  <span className="text-sm text-gray-600">
                    {requests.filter(r => r.status === 'pending').length} Pending
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by tenant, email, or address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="property_created">Property Created</option>
              </select>
            </div>
            
            {/* Type Filter */}
            <div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Types</option>
                <option value="existing_property">Existing Property</option>
                <option value="new_property">New Property</option>
                <option value="lease_request">Lease Request</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Requests List */}
        {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Property Requests</h3>
            <p className="text-gray-600">
              {requests.length === 0 
                ? "You haven't received any property requests yet."
                : "No requests match your current filters."
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <div key={request._id} className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {request.tenant?.name || 'Unknown Tenant'}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Mail className="w-4 h-4" />
                            <span>{request.tenant?.email}</span>
                          </div>
                          {request.tenant?.phone && (
                            <div className="flex items-center space-x-1">
                              <Phone className="w-4 h-4" />
                              <span>{request.tenant.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Request Details */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Request Details</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-600">Type:</span>
                            <span className="font-medium">{getRequestTypeLabel(request.requestType)}</span>
                          </div>
                          
                          {request.property ? (
                            <div className="flex items-center space-x-2">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              <span>{request.property.address}</span>
                            </div>
                          ) : request.requestedPropertyDetails?.address && (
                            <div className="flex items-center space-x-2">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              <span>{request.requestedPropertyDetails.address}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span>Submitted {formatDate(request.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Property/Request Info */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Property Information</h4>
                        <div className="space-y-2 text-sm">
                          {request.requestedPropertyDetails && (
                            <>
                              <div className="flex items-center space-x-4">
                                {request.requestedPropertyDetails.bedrooms && (
                                  <div className="flex items-center space-x-1">
                                    <Bed className="w-4 h-4 text-gray-400" />
                                    <span>{request.requestedPropertyDetails.bedrooms} bed</span>
                                  </div>
                                )}
                                {request.requestedPropertyDetails.bathrooms && (
                                  <div className="flex items-center space-x-1">
                                    <Bath className="w-4 h-4 text-gray-400" />
                                    <span>{request.requestedPropertyDetails.bathrooms} bath</span>
                                  </div>
                                )}
                              </div>
                              {request.requestedPropertyDetails.estimatedRent && (
                                <div className="flex items-center space-x-1">
                                  <DollarSign className="w-4 h-4 text-gray-400" />
                                  <span>Expected: ${request.requestedPropertyDetails.estimatedRent.toLocaleString()}/month</span>
                                </div>
                              )}
                            </>
                          )}
                          
                          {request.moveInPreferences?.preferredDate && (
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span>Move-in: {formatDate(request.moveInPreferences.preferredDate)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status and Actions */}
                  <div className="flex-shrink-0 text-right">
                    <div className="mb-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(request.status)}`}>
                        {request.status.replace('_', ' ')}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowDetails(true);
                        setError('');
                      }}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Request Details Modal */}
        {showDetails && selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Request Details</h2>
                  <button
                    onClick={() => {
                      setShowDetails(false);
                      setSelectedRequest(null);
                      setResponseMessage('');
                      setNextSteps('');
                      setError('');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Tenant Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Tenant Information</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Name</p>
                        <p className="text-gray-900">{selectedRequest.tenant?.name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Email</p>
                        <p className="text-gray-900">{selectedRequest.tenant?.email}</p>
                      </div>
                      {selectedRequest.tenant?.phone && (
                        <div>
                          <p className="text-sm font-medium text-gray-700">Phone</p>
                          <p className="text-gray-900">{selectedRequest.tenant.phone}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-700">Request Date</p>
                        <p className="text-gray-900">{formatDate(selectedRequest.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Property Details */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Details</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    {selectedRequest.requestedPropertyDetails && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Address</p>
                          <p className="text-gray-900">{selectedRequest.requestedPropertyDetails.address}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Property Type</p>
                          <p className="text-gray-900">{selectedRequest.requestedPropertyDetails.propertyType}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Bedrooms</p>
                          <p className="text-gray-900">{selectedRequest.requestedPropertyDetails.bedrooms || 'Not specified'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Bathrooms</p>
                          <p className="text-gray-900">{selectedRequest.requestedPropertyDetails.bathrooms || 'Not specified'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Expected Rent</p>
                          <p className="text-gray-900">
                            {selectedRequest.requestedPropertyDetails.estimatedRent 
                              ? `$${selectedRequest.requestedPropertyDetails.estimatedRent.toLocaleString()}/month`
                              : 'Not specified'
                            }
                          </p>
                        </div>
                        {selectedRequest.requestedPropertyDetails.description && (
                          <div className="md:col-span-2">
                            <p className="text-sm font-medium text-gray-700">Description</p>
                            <p className="text-gray-900">{selectedRequest.requestedPropertyDetails.description}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Move-in Preferences */}
                {selectedRequest.moveInPreferences && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Move-in Preferences</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedRequest.moveInPreferences.preferredDate && (
                          <div>
                            <p className="text-sm font-medium text-gray-700">Preferred Move-in Date</p>
                            <p className="text-gray-900">{formatDate(selectedRequest.moveInPreferences.preferredDate)}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-700">Lease Duration</p>
                          <p className="text-gray-900">{selectedRequest.moveInPreferences.leaseDuration || 12} months</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Response Section for Pending Requests */}
                {selectedRequest.status === 'pending' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Respond to Request</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Response Message *
                        </label>
                        <textarea
                          value={responseMessage}
                          onChange={(e) => setResponseMessage(e.target.value)}
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter your response to the tenant..."
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Next Steps (for approval)
                        </label>
                        <textarea
                          value={nextSteps}
                          onChange={(e) => setNextSteps(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="What happens next? (e.g., schedule viewing, provide lease documents...)"
                        />
                      </div>
                      
                      <div className="flex space-x-4">
                        <button
                          onClick={() => handleApproveRequest(selectedRequest._id)}
                          disabled={isResponding || !responseMessage.trim()}
                          className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isResponding ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <CheckCircle className="w-4 h-4 mr-2" />
                          )}
                          Approve Request
                        </button>
                        
                        <button
                          onClick={() => handleRejectRequest(selectedRequest._id)}
                          disabled={isResponding || !responseMessage.trim()}
                          className="flex-1 flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isResponding ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <XCircle className="w-4 h-4 mr-2" />
                          )}
                          Reject Request
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Previous Response (for responded requests) */}
                {selectedRequest.landlordResponse && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Response</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="mb-2">
                        <p className="text-sm font-medium text-gray-700">Responded on</p>
                        <p className="text-gray-900">{formatDate(selectedRequest.landlordResponse.respondedAt)}</p>
                      </div>
                      <div className="mb-2">
                        <p className="text-sm font-medium text-gray-700">Message</p>
                        <p className="text-gray-900">{selectedRequest.landlordResponse.message}</p>
                      </div>
                      {selectedRequest.landlordResponse.nextSteps && (
                        <div>
                          <p className="text-sm font-medium text-gray-700">Next Steps</p>
                          <p className="text-gray-900">{selectedRequest.landlordResponse.nextSteps}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}