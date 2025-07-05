// app/api/landlord/property-request/[requestId]/approve/route.js - Approve property request
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from 'lib/db';
import PropertyRequest from 'models/PropertyRequest';
import Property from 'models/Property';
import Notification from 'models/Notification';

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'landlord') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { requestId } = params;
    const { responseMessage, nextSteps, createProperty, propertyDetails } = await request.json();

    const propertyRequest = await PropertyRequest.findOne({
      _id: requestId,
      landlord: session.user.id,
      status: 'pending'
    }).populate('tenant');

    if (!propertyRequest) {
      return Response.json({ error: 'Property request not found' }, { status: 404 });
    }

    let propertyId = propertyRequest.property;

    // If landlord wants to create a new property
    if (createProperty && propertyDetails) {
      const newProperty = await Property.create({
        ...propertyDetails,
        landlord: session.user.id,
        isAvailable: true
      });
      propertyId = newProperty._id;
      propertyRequest.property = propertyId;
    }

    // Approve the request
    propertyRequest.approveRequest(session.user.id, responseMessage, nextSteps);
    await propertyRequest.save();

    // Create approval notification for tenant
    if (propertyId) {
      await Notification.createPropertyApprovedNotification(
        propertyRequest.tenant._id,
        session.user.id,
        requestId,
        propertyId
      );
    } else {
      await Notification.create({
        recipient: propertyRequest.tenant._id,
        sender: session.user.id,
        type: 'property_approved',
        title: 'Property Request Approved',
        message: responseMessage || 'Your property request has been approved.',
        relatedPropertyRequest: requestId,
        actionRequired: false,
        priority: 'medium'
      });
    }

    return Response.json({ 
      success: true, 
      message: 'Property request approved successfully',
      propertyId: propertyId
    });

  } catch (error) {
    console.error('Error approving property request:', error);
    return Response.json({ error: 'Failed to approve property request' }, { status: 500 });
  }
}