'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import { formatCurrency } from 'utils/currency';
import { formatDate } from 'utils/date';
import { 
  ArrowLeft,
  Edit,
  Plus,
  Trash2,
  Home,
  Users,
  CreditCard,
  Wrench,
  MapPin,
  Calendar,
  DollarSign,
  Bed,
  Bath,
  Square,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye
} from 'lucide-react';

export default function PropertyDetailClient({ propertyData }) {
  // Add null checks and default values
  const property = propertyData?.property || {};
  const tenants = propertyData?.tenants || [];
  const leases = propertyData?.leases || [];
  const payments = propertyData?.payments || [];
  const maintenanceRequests = propertyData?.maintenance || [];

  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // Early return if no property data
  if (!property || !property._id) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto p-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800">Loading</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Property data is loading or unavailable.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this property? This action cannot be undone and will affect all associated leases and payments.')) {
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      const response = await fetch(`/api/properties/${property._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to delete property');
      }

      router.push('/properties');
    } catch (err) {
      setError(err.message);
      setIsDeleting(false);
    }
  };

  // Get occupancy information
  const activeLeases = leases.filter(lease => lease.status === 'active');
  const isOccupied = activeLeases.length > 0;
  
  // Get status configuration
  const getStatusConfig = (status) => {
    switch (status) {
      case 'verified':
        return { icon: <CheckCircle className="w-4 h-4" />, color: 'bg-green-100 text-green-800', label: 'Verified' };
      case 'pending':
        return { icon: <Clock className="w-4 h-4" />, color: 'bg-yellow-100 text-yellow-800', label: 'Pending' };
      case 'active':
        return { icon: <CheckCircle className="w-4 h-4" />, color: 'bg-green-100 text-green-800', label: 'Active' };
      case 'draft':
        return { icon: <Clock className="w-4 h-4" />, color: 'bg-gray-100 text-gray-800', label: 'Draft' };
      default:
        return { icon: <Clock className="w-4 h-4" />, color: 'bg-gray-100 text-gray-800', label: status || 'Unknown' };
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="mb-4 sm:mb-0">
            <Link 
              href="/properties"
              className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Properties
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Home className="w-8 h-8 mr-3 text-blue-600" />
              {property.address || 'Property Address'}
            </h1>
            <div className="flex items-center mt-2 space-x-4">
              <span className="text-gray-600 flex items-center">
                <MapPin className="w-4 h-4 mr-1" />
                {property.type || 'Property Type'}
              </span>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${
                isOccupied ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
              }`}>
                {isOccupied ? 'Occupied' : 'Vacant'}
              </span>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/properties/${property._id}/edit`}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Property
            </Link>
            <Link
              href={`/leases/add?property=${property._id}`}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Lease
            </Link>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 transition-colors"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>

        <Breadcrumbs />

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Property Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Monthly Rent</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(property.monthlyRent || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Active Leases</p>
                <p className="text-xl font-bold text-gray-900">{activeLeases.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CreditCard className="w-5 h-5 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Recent Payments</p>
                <p className="text-xl font-bold text-gray-900">{payments.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Added</p>
                <p className="text-sm font-bold text-gray-900">
                  {formatDate(property.createdAt)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Property Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Property Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-6 flex items-center">
                <Home className="w-5 h-5 mr-2 text-blue-600" />
                Property Details
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 text-gray-400 mr-3" />
                    <div>
                      <span className="text-sm font-medium text-gray-500">Type</span>
                      <p className="text-gray-900">{property.type || 'N/A'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 text-gray-400 mr-3" />
                    <div>
                      <span className="text-sm font-medium text-gray-500">Monthly Rent</span>
                      <p className="text-gray-900 font-semibold">
                        {formatCurrency(property.monthlyRent || 0)}
                      </p>
                    </div>
                  </div>

                  {property.bedrooms && (
                    <div className="flex items-center">
                      <Bed className="w-4 h-4 text-gray-400 mr-3" />
                      <div>
                        <span className="text-sm font-medium text-gray-500">Bedrooms</span>
                        <p className="text-gray-900">{property.bedrooms}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  {property.bathrooms && (
                    <div className="flex items-center">
                      <Bath className="w-4 h-4 text-gray-400 mr-3" />
                      <div>
                        <span className="text-sm font-medium text-gray-500">Bathrooms</span>
                        <p className="text-gray-900">{property.bathrooms}</p>
                      </div>
                    </div>
                  )}

                  {property.squareFootage && (
                    <div className="flex items-center">
                      <Square className="w-4 h-4 text-gray-400 mr-3" />
                      <div>
                        <span className="text-sm font-medium text-gray-500">Square Footage</span>
                        <p className="text-gray-900">{property.squareFootage.toLocaleString()} sq ft</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 text-gray-400 mr-3" />
                    <div>
                      <span className="text-sm font-medium text-gray-500">Date Added</span>
                      <p className="text-gray-900">{formatDate(property.createdAt)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {property.features && Array.isArray(property.features) && property.features.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Features</h3>
                  <div className="flex flex-wrap gap-2">
                    {property.features.map((feature, index) => (
                      <span 
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {property.description && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Description</h3>
                  <p className="text-gray-700 leading-relaxed">{property.description}</p>
                </div>
              )}
            </div>

            {/* Active Leases */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold flex items-center">
                  <Users className="w-5 h-5 mr-2 text-blue-600" />
                  Active Leases ({activeLeases.length})
                </h2>
                <Link
                  href={`/leases/add?property=${property._id}`}
                  className="inline-flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Lease
                </Link>
              </div>
              
              {leases.length > 0 ? (
                <div className="space-y-4">
                  {leases.map((lease) => {
                    const statusConfig = getStatusConfig(lease.status);
                    const tenantName = lease.tenantId?.name || 
                      `${lease.tenantId?.firstName || ''} ${lease.tenantId?.lastName || ''}`.trim() || 
                      'Unnamed Tenant';
                    
                    return (
                      <div key={lease._id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-medium text-gray-900">{tenantName}</h3>
                            <p className="text-sm text-gray-600">
                              {lease.tenantId?.email || 'No email'}
                            </p>
                            {lease.tenantId?.phone && (
                              <p className="text-sm text-gray-600">{lease.tenantId.phone}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">
                              {formatCurrency(lease.monthlyRent || 0)}/month
                            </p>
                            <p className="text-sm text-gray-600">
                              {formatDate(lease.startDate)} - {formatDate(lease.endDate)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                            {statusConfig.icon}
                            <span className="ml-1">{statusConfig.label}</span>
                          </span>
                          
                          <div className="flex items-center space-x-2">
                            <Link
                              href={`/leases/${lease._id}`}
                              className="inline-flex items-center px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Link>
                            <Link
                              href={`/payments/record?leaseId=${lease._id}`}
                              className="inline-flex items-center px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Payment
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No active leases for this property</p>
                  <Link
                    href={`/leases/add?property=${property._id}`}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Lease
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Payments */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center">
                  <CreditCard className="w-5 h-5 mr-2 text-blue-600" />
                  Recent Payments
                </h2>
                <Link
                  href={`/payments/record?propertyId=${property._id}`}
                  className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Add Payment
                </Link>
              </div>
              
              {payments.length > 0 ? (
                <div className="space-y-3">
                  {payments.slice(0, 5).map((payment) => {
                    const statusConfig = getStatusConfig(payment.status);
                    const tenantName = payment.tenantId?.name || 
                      `${payment.tenantId?.firstName || ''} ${payment.tenantId?.lastName || ''}`.trim() || 
                      'Unknown Tenant';
                    
                    return (
                      <div key={payment._id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{tenantName}</p>
                          <p className="text-xs text-gray-600">
                            {formatDate(payment.paymentDate || payment.createdAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">
                            {formatCurrency(payment.amount || 0)}
                          </p>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4">
                  <CreditCard className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm mb-2">No payments recorded</p>
                  <Link
                    href={`/payments/record?propertyId=${property._id}`}
                    className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    Record first payment
                  </Link>
                </div>
              )}
            </div>

            {/* Maintenance Requests */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center">
                  <Wrench className="w-5 h-5 mr-2 text-blue-600" />
                  Maintenance
                </h2>
                <Link
                  href={`/maintenance/add?property=${property._id}`}
                  className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Add Request
                </Link>
              </div>
              
              {maintenanceRequests.length > 0 ? (
                <div className="space-y-3">
                  {maintenanceRequests.slice(0, 3).map((request) => (
                    <div key={request._id} className="border border-gray-200 rounded-lg p-3">
                      <h4 className="font-medium text-sm text-gray-900">
                        {request.title || 'Maintenance Request'}
                      </h4>
                      <p className="text-xs text-gray-600 mt-1">
                        {request.description || 'No description available'}
                      </p>
                      {request.tenantId && (
                        <p className="text-xs text-blue-600 mt-1">
                          Reported by: {request.tenantId.name || 'Unknown'}
                        </p>
                      )}
                      <div className="flex justify-between items-center mt-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          request.status === 'Completed' ? 'bg-green-100 text-green-800' :
                          request.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {request.status || 'Pending'}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          request.priority === 'High' ? 'bg-red-100 text-red-800' :
                          request.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {request.priority || 'Medium'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Wrench className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm mb-2">No maintenance requests</p>
                  <Link
                    href={`/maintenance/add?property=${property._id}`}
                    className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    Log first request
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}