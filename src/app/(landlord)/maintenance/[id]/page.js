// src/app/maintenance/[id]/page.js
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect, notFound } from 'next/navigation';
import dbConnect from 'lib/db';
import Maintenance from 'models/Maintenance';
import Property from 'models/Property';
import User from 'models/User';
import MaintenanceDetailsClient from './MaintenanceDetailsClient';

import { Wrench, AlertCircle, Home, Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';
import { UserIcon } from 'lucide-react';

// Helper function to serialize MongoDB data
function serializeData(data) {
  if (!data) return null;
  
  // Convert to plain object and handle ObjectIds and Dates
  const serialized = JSON.parse(JSON.stringify(data, (key, value) => {
    // Handle ObjectId
    if (value && typeof value === 'object' && value.constructor?.name === 'ObjectId') {
      return value.toString();
    }
    // Handle Date objects
    if (value instanceof Date) {
      return value.toISOString();
    }
    // Handle MongoDB documents
    if (value && typeof value === 'object' && value._id && typeof value._id === 'object') {
      return { ...value, _id: value._id.toString() };
    }
    return value;
  }));
  
  return serialized;
}

async function getMaintenanceRequest(id, userRole, userId) {
  try {
    await dbConnect();

    // Build query based on user role
    let query = { _id: id };
    
    // For tenants, only show their own requests
    if (userRole === 'tenant') {
      query.tenantId = userId;
    }

    const request = await Maintenance.findOne(query)
      .populate({
        path: 'propertyId',
        select: 'address name type bedrooms bathrooms landlord',
        populate: {
          path: 'landlord',
          select: 'name firstName lastName email phone'
        }
      })
      .populate({
        path: 'tenantId',
        select: 'name firstName lastName email phone'
      })
      .populate({
        path: 'landlordId',
        select: 'name firstName lastName email phone'
      })
      .lean(); // Add .lean() to get plain objects

    if (!request) {
      return null;
    }

    // Ensure all ObjectIds are converted to strings
    const serializedRequest = {
      ...request,
      _id: request._id.toString(),
      propertyId: request.propertyId ? {
        ...request.propertyId,
        _id: request.propertyId._id.toString(),
        landlord: request.propertyId.landlord ? {
          ...request.propertyId.landlord,
          _id: request.propertyId.landlord._id.toString()
        } : null
      } : null,
      tenantId: request.tenantId ? {
        ...request.tenantId,
        _id: request.tenantId._id.toString()
      } : null,
      landlordId: request.landlordId ? {
        ...request.landlordId,
        _id: request.landlordId._id.toString()
      } : null,
      dateReported: request.dateReported.toISOString(),
      dateCompleted: request.dateCompleted ? request.dateCompleted.toISOString() : null
    };

    return serializedRequest;

  } catch (error) {
    console.error('Error fetching maintenance request:', error);
    throw new Error('Failed to fetch maintenance request');
  }
}

export default async function MaintenanceDetailsPage({ params }) {
  // Await params for Next.js 15 compatibility
  const { id } = await params;
  
  // Check authentication
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/maintenance/' + id);
  }

  let maintenanceRequest;
  
  try {
    maintenanceRequest = await getMaintenanceRequest(id, session.user.role, session.user.id);
  } catch (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Request</h2>
          <p className="text-gray-600 mb-6">{error.message}</p>
          <a
            href="/maintenance"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            ← Back to Maintenance
          </a>
        </div>
      </div>
    );
  }

  if (!maintenanceRequest) {
    notFound();
  }

  // Get status configuration
  const getStatusConfig = (status) => {
    switch (status) {
      case 'Pending':
        return {
          icon: Clock,
          color: 'yellow',
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          borderColor: 'border-yellow-200'
        };
      case 'In Progress':
        return {
          icon: Wrench,
          color: 'blue',
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          borderColor: 'border-blue-200'
        };
      case 'Completed':
        return {
          icon: CheckCircle,
          color: 'green',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-200'
        };
      default:
        return {
          icon: XCircle,
          color: 'gray',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          borderColor: 'border-gray-200'
        };
    }
  };

  // Get priority configuration
  const getPriorityConfig = (priority) => {
    switch (priority) {
      case 'High':
        return {
          color: 'red',
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          borderColor: 'border-red-200'
        };
      case 'Medium':
        return {
          color: 'orange',
          bgColor: 'bg-orange-100',
          textColor: 'text-orange-800',
          borderColor: 'border-orange-200'
        };
      case 'Low':
        return {
          color: 'green',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-200'
        };
      default:
        return {
          color: 'gray',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          borderColor: 'border-gray-200'
        };
    }
  };

  const statusConfig = getStatusConfig(maintenanceRequest.status);
  const priorityConfig = getPriorityConfig(maintenanceRequest.priority);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center mb-4 sm:mb-0">
                <Wrench className="w-8 h-8 mr-3 text-blue-600" />
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {maintenanceRequest.title}
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Request #{maintenanceRequest._id.slice(-8)}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${statusConfig.bgColor} ${statusConfig.textColor} ${statusConfig.borderColor}`}>
                  <StatusIcon className="w-4 h-4 mr-1" />
                  {maintenanceRequest.status}
                </div>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${priorityConfig.bgColor} ${priorityConfig.textColor} ${priorityConfig.borderColor}`}>
                  {maintenanceRequest.priority} Priority
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Success message for new requests */}
        {session.user.role === 'tenant' && maintenanceRequest.status === 'Pending' && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-green-800">Request Submitted Successfully</h3>
                <p className="text-sm text-green-700 mt-1">
                  Your maintenance request has been submitted and the property manager has been notified. 
                  You will receive updates as the status changes.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Request Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Request Details</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-900 whitespace-pre-wrap">{maintenanceRequest.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Date Reported</h3>
                    <p className="text-gray-900 flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                      {new Date(maintenanceRequest.dateReported).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>

                  {maintenanceRequest.dateCompleted && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-1">Date Completed</h3>
                      <p className="text-gray-900 flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                        {new Date(maintenanceRequest.dateCompleted).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Images */}
            {maintenanceRequest.images && maintenanceRequest.images.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Photos</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {maintenanceRequest.images.map((image, index) => (
                    <div key={index} className="relative group cursor-pointer">
                      <img
                        src={image}
                        alt={`Maintenance issue ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg border hover:opacity-90 transition-opacity"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all rounded-lg" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Property Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Home className="w-5 h-5 mr-2 text-blue-600" />
                Property
              </h2>
              
              {maintenanceRequest.propertyId ? (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">Address</h3>
                    <p className="text-gray-900">{maintenanceRequest.propertyId.address}</p>
                  </div>
                  
                  {maintenanceRequest.propertyId.name && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700">Property Name</h3>
                      <p className="text-gray-900">{maintenanceRequest.propertyId.name}</p>
                    </div>
                  )}
                  
                  {maintenanceRequest.propertyId.type && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700">Type</h3>
                      <p className="text-gray-900">{maintenanceRequest.propertyId.type}</p>
                    </div>
                  )}
                  
                  {maintenanceRequest.propertyId.bedrooms && maintenanceRequest.propertyId.bathrooms && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700">Details</h3>
                      <p className="text-gray-900">
                        {maintenanceRequest.propertyId.bedrooms} bed, {maintenanceRequest.propertyId.bathrooms} bath
                      </p>
                    </div>
                  )}
                  
                  {maintenanceRequest.propertyId.landlord && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700">Owner</h3>
                      <p className="text-gray-900">
                        {maintenanceRequest.propertyId.landlord.name || 
                         `${maintenanceRequest.propertyId.landlord.firstName} ${maintenanceRequest.propertyId.landlord.lastName}`}
                      </p>
                      {maintenanceRequest.propertyId.landlord.email && (
                        <p className="text-sm text-gray-600">{maintenanceRequest.propertyId.landlord.email}</p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">Property information not available</p>
              )}
            </div>

            {/* Tenant Information */}
            {maintenanceRequest.tenantId && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <UserIcon className="w-5 h-5 mr-2 text-green-600" />
                  Tenant
                </h2>
                
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">Name</h3>
                    <p className="text-gray-900">
                      {maintenanceRequest.tenantId.name || 
                       `${maintenanceRequest.tenantId.firstName} ${maintenanceRequest.tenantId.lastName}`}
                    </p>
                  </div>
                  
                  {maintenanceRequest.tenantId.email && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700">Email</h3>
                      <p className="text-gray-900">{maintenanceRequest.tenantId.email}</p>
                    </div>
                  )}
                  
                  {maintenanceRequest.tenantId.phone && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700">Phone</h3>
                      <p className="text-gray-900">{maintenanceRequest.tenantId.phone}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Landlord Information */}
            {maintenanceRequest.landlordId && session.user.role !== 'tenant' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <UserIcon className="w-5 h-5 mr-2 text-purple-600" />
                  Assigned To
                </h2>
                
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">Name</h3>
                    <p className="text-gray-900">
                      {maintenanceRequest.landlordId.name || 
                       `${maintenanceRequest.landlordId.firstName} ${maintenanceRequest.landlordId.lastName}`}
                    </p>
                  </div>
                  
                  {maintenanceRequest.landlordId.email && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700">Email</h3>
                      <p className="text-gray-900">{maintenanceRequest.landlordId.email}</p>
                    </div>
                  )}
                  
                  {maintenanceRequest.landlordId.phone && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700">Phone</h3>
                      <p className="text-gray-900">{maintenanceRequest.landlordId.phone}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Client Component for Interactive Features */}
        <MaintenanceDetailsClient 
          maintenanceRequest={maintenanceRequest}
          userRole={session.user.role}
          userId={session.user.id}
        />
      </div>
    </div>
  );
}

export async function generateMetadata({ params }) {
  // Await params for Next.js 15 compatibility
  const { id } = await params;
  
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return {
      title: 'Maintenance Request - Authentication Required',
      description: 'Please sign in to view maintenance request',
    };
  }

  try {
    const maintenanceRequest = await getMaintenanceRequest(id, session.user.role, session.user.id);
    
    if (!maintenanceRequest) {
      return {
        title: 'Maintenance Request Not Found',
        description: 'The requested maintenance request could not be found',
      };
    }

    return {
      title: `${maintenanceRequest.title} - Maintenance Request`,
      description: `${maintenanceRequest.status} maintenance request: ${maintenanceRequest.description.substring(0, 150)}...`,
      openGraph: {
        title: `${maintenanceRequest.title} - Maintenance Request`,
        description: `${maintenanceRequest.status} maintenance request`,
        type: 'website',
      },
    };
  } catch (error) {
    return {
      title: 'Maintenance Request - Error',
      description: 'Error loading maintenance request',
    };
  }
}