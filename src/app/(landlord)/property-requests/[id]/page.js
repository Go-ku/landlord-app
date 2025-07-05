// app/dashboard/property-requests/[id]/page.js
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Link from 'next/link';
import dbConnect from 'lib/db';
import PropertyRequest from 'models/PropertyRequest';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  DollarSign, 
  Bed, 
  Bath, 
  MapPin, 
  Clock, 
  Building2,
  Home,
  FileText,
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import PropertyRequestActions from './PropertyRequestActions';

// Server function to fetch property request
async function getPropertyRequest(id, userId) {
  try {
    // Ensure id is a string and validate ObjectId format
    const requestId = typeof id === 'string' ? id : String(id);
    
    if (!requestId.match(/^[0-9a-fA-F]{24}$/)) {
      console.error('Invalid ObjectId format:', requestId);
      return null;
    }

    await dbConnect();
    
    // Find the property request and populate related data
    const propertyRequest = await PropertyRequest.findById(requestId)
      .populate('tenant', 'name email phone role')
      .populate('property', 'address type monthlyRent bedrooms bathrooms city neighborhood')
      .populate('landlord', 'name email company')
      .populate('messages.sender', 'name email')
      .lean();

    if (!propertyRequest) {
      console.log('Property request not found:', requestId);
      return null;
    }

    // Verify access control
    const isAuthorizedLandlord = 
      (propertyRequest.landlord && propertyRequest.landlord._id.toString() === userId) ||
      (propertyRequest.requestType === 'new_property' && 
       propertyRequest.requestedPropertyDetails?.landlordEmail);

    if (!isAuthorizedLandlord) {
      console.log('Access denied for user:', userId);
      return null;
    }

    // Convert ObjectIds to strings for client consumption
    return JSON.parse(JSON.stringify(propertyRequest));
  } catch (error) {
    console.error('Error fetching property request:', error);
    return null;
  }
}

// Status badge component
function StatusBadge({ status }) {
  const getStatusConfig = (status) => {
    const configs = {
      pending: { 
        bg: 'bg-yellow-100', 
        text: 'text-yellow-800',
        icon: Clock,
        label: 'Pending Review'
      },
      approved: { 
        bg: 'bg-green-100', 
        text: 'text-green-800',
        icon: CheckCircle,
        label: 'Approved'
      },
      rejected: { 
        bg: 'bg-red-100', 
        text: 'text-red-800',
        icon: XCircle,
        label: 'Rejected'
      },
      property_created: { 
        bg: 'bg-blue-100', 
        text: 'text-blue-800',
        icon: Building2,
        label: 'Property Created'
      },
      lease_requested: { 
        bg: 'bg-purple-100', 
        text: 'text-purple-800',
        icon: FileText,
        label: 'Lease Requested'
      }
    };
    
    return configs[status] || { 
      bg: 'bg-gray-100', 
      text: 'text-gray-800',
      icon: AlertTriangle,
      label: status
    };
  };

  const config = getStatusConfig(status);
  const IconComponent = config.icon;

  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
      <IconComponent className="w-4 h-4 mr-2" />
      {config.label}
    </div>
  );
}

// Info card component
function InfoCard({ title, children, icon: IconComponent }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center mb-4">
        {IconComponent && (
          <div className="flex-shrink-0 mr-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <IconComponent className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        )}
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// Detail row component
function DetailRow({ label, value, icon: IconComponent }) {
  if (!value) return null;
  
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
      <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
        {IconComponent && <IconComponent className="w-4 h-4 text-gray-400" />}
        <span>{label}</span>
      </div>
      <div className="text-sm text-gray-900 text-right">
        {value}
      </div>
    </div>
  );
}

// Format date helper
function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Main page component
export default async function PropertyRequestDetailsPage(props) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/auth/signin');
  }

  if (session.user.role !== 'landlord') {
    redirect('/dashboard');
  }

  // Handle both legacy and new Next.js param formats
  let requestId;
  try {
    const params = await props.params;
    requestId = params.id;
  } catch (error) {
    // Fallback for non-promise params
    requestId = props.params?.id;
  }

  if (!requestId) {
    console.error('No request ID found in params');
    notFound();
  }

  const request = await getPropertyRequest(requestId, session.user.id);
  
  if (!request) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link 
              href="/dashboard/property-requests"
              className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Property Requests
            </Link>
          </div>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Property Request Details
              </h1>
              <p className="text-gray-600 mt-2">
                Request from {request.tenant?.name || 'Unknown Tenant'}
              </p>
            </div>
            <StatusBadge status={request.status} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tenant Information */}
            <InfoCard title="Tenant Information" icon={User}>
              <div className="space-y-0">
                <DetailRow 
                  label="Full Name" 
                  value={request.tenant?.name} 
                />
                <DetailRow 
                  label="Email Address" 
                  value={request.tenant?.email} 
                  icon={Mail}
                />
                <DetailRow 
                  label="Phone Number" 
                  value={request.tenant?.phone} 
                  icon={Phone}
                />
                <DetailRow 
                  label="Request Submitted" 
                  value={formatDate(request.createdAt)} 
                  icon={Clock}
                />
              </div>
            </InfoCard>

            {/* Property Details */}
            <InfoCard title="Property Information" icon={Building2}>
              {request.property ? (
                <div className="space-y-0">
                  <DetailRow 
                    label="Address" 
                    value={request.property.address} 
                    icon={MapPin}
                  />
                  <DetailRow 
                    label="Property Type" 
                    value={request.property.type} 
                  />
                  <DetailRow 
                    label="Monthly Rent" 
                    value={`$${request.property.monthlyRent.toLocaleString()}`} 
                    icon={DollarSign}
                  />
                  <DetailRow 
                    label="Bedrooms" 
                    value={request.property.bedrooms} 
                    icon={Bed}
                  />
                  <DetailRow 
                    label="Bathrooms" 
                    value={request.property.bathrooms} 
                    icon={Bath}
                  />
                </div>
              ) : request.requestedPropertyDetails ? (
                <div className="space-y-0">
                  <DetailRow 
                    label="Requested Address" 
                    value={request.requestedPropertyDetails.address} 
                    icon={MapPin}
                  />
                  <DetailRow 
                    label="Property Type" 
                    value={request.requestedPropertyDetails.propertyType} 
                  />
                  <DetailRow 
                    label="Expected Rent" 
                    value={request.requestedPropertyDetails.estimatedRent ? 
                      `$${request.requestedPropertyDetails.estimatedRent.toLocaleString()}` : 
                      'Not specified'
                    } 
                    icon={DollarSign}
                  />
                  <DetailRow 
                    label="Bedrooms" 
                    value={request.requestedPropertyDetails.bedrooms || 'Not specified'} 
                    icon={Bed}
                  />
                  <DetailRow 
                    label="Bathrooms" 
                    value={request.requestedPropertyDetails.bathrooms || 'Not specified'} 
                    icon={Bath}
                  />
                  {request.requestedPropertyDetails.description && (
                    <div className="pt-4 border-t border-gray-100 mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Additional Details</p>
                      <p className="text-sm text-gray-900">{request.requestedPropertyDetails.description}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">No property information available</p>
              )}
            </InfoCard>

            {/* Move-in Preferences */}
            {request.moveInPreferences && (
              <InfoCard title="Move-in Preferences" icon={Calendar}>
                <div className="space-y-0">
                  <DetailRow 
                    label="Preferred Date" 
                    value={request.moveInPreferences.preferredDate ? 
                      formatDate(request.moveInPreferences.preferredDate) : 
                      'Flexible'
                    } 
                    icon={Calendar}
                  />
                  <DetailRow 
                    label="Lease Duration" 
                    value={`${request.moveInPreferences.leaseDuration || 12} months`} 
                  />
                  {request.moveInPreferences.additionalRequests && (
                    <div className="pt-4 border-t border-gray-100 mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Additional Requests</p>
                      <p className="text-sm text-gray-900">{request.moveInPreferences.additionalRequests}</p>
                    </div>
                  )}
                </div>
              </InfoCard>
            )}

            {/* Landlord Contact Info (if provided) */}
            {request.requestedPropertyDetails?.landlordEmail || request.requestedPropertyDetails?.landlordPhone ? (
              <InfoCard title="Provided Landlord Contact" icon={Phone}>
                <div className="space-y-0">
                  <DetailRow 
                    label="Email" 
                    value={request.requestedPropertyDetails.landlordEmail} 
                    icon={Mail}
                  />
                  <DetailRow 
                    label="Phone" 
                    value={request.requestedPropertyDetails.landlordPhone} 
                    icon={Phone}
                  />
                </div>
              </InfoCard>
            ) : null}

            {/* Response History */}
            {request.landlordResponse && (
              <InfoCard title="Your Response" icon={MessageSquare}>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Response Date</p>
                    <p className="text-sm text-gray-900">{formatDate(request.landlordResponse.respondedAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Message</p>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-900">{request.landlordResponse.message}</p>
                    </div>
                  </div>
                  {request.landlordResponse.nextSteps && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Next Steps</p>
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-sm text-blue-900">{request.landlordResponse.nextSteps}</p>
                      </div>
                    </div>
                  )}
                </div>
              </InfoCard>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
              
              {request.status === 'pending' ? (
                <PropertyRequestActions requestId={request._id} requestData={request} />
              ) : (
                <div className="space-y-3">
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-600 mb-2">
                      This request has been {request.status === 'approved' ? 'approved' : 'rejected'}
                    </p>
                    {request.landlordResponse && (
                      <p className="text-xs text-gray-500">
                        Responded on {formatDate(request.landlordResponse.respondedAt)}
                      </p>
                    )}
                  </div>
                  
                  {request.status === 'approved' && (
                    <Link
                      href={`/dashboard/leases/create?tenant=${request.tenant?._id}&requestId=${request._id}&address=${encodeURIComponent(request.requestedPropertyDetails?.address || '')}`}
                      className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      <Building2 className="w-4 h-4 mr-2" />
                      Create Lease Agreement
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Request Summary */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Request Type</span>
                  <span className="font-medium">
                    {request.requestType === 'existing_property' ? 'Existing Property' :
                     request.requestType === 'new_property' ? 'New Property' :
                     'Lease Request'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className="font-medium capitalize">{request.status.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Submitted</span>
                  <span className="font-medium">{formatDate(request.createdAt)}</span>
                </div>
                {request.expiresAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Expires</span>
                    <span className="font-medium">{formatDate(request.expiresAt)}</span>
                  </div>
                )}
                {request.isUrgent && (
                  <div className="flex items-center space-x-2 pt-2 border-t border-gray-100">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    <span className="text-orange-600 font-medium">Urgent Request</span>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Tenant */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Tenant</h3>
              <div className="space-y-3">
                <a
                  href={`mailto:${request.tenant?.email}`}
                  className="w-full inline-flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send Email
                </a>
                {request.tenant?.phone && (
                  <a
                    href={`tel:${request.tenant.phone}`}
                    className="w-full inline-flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Call Tenant
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}