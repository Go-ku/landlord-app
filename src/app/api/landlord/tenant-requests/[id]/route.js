// src/app/api/landlord/tenant-requests/[id]/route.js
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { NextResponse } from 'next/server';
import dbConnect from 'lib/db';
import PropertyRequest from 'models/PropertyRequest';
import Property from 'models/Property';
import Notification from 'models/Notification';

export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'landlord') {
      return NextResponse.json({ error: 'Forbidden - Landlord access only' }, { status: 403 });
    }

    await dbConnect();

    const requestId = params.id;
    const body = await request.json();
    const { action, message } = body;

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Find the property request
    const propertyRequest = await PropertyRequest.findById(requestId)
      .populate('tenant', 'name email')
      .populate('property', 'address');

    if (!propertyRequest) {
      return NextResponse.json({ error: 'Property request not found' }, { status: 404 });
    }

    // Verify landlord owns this request or the property
    const isAuthorized = propertyRequest.landlord?.toString() === session.user.id ||
      (propertyRequest.property && await Property.exists({ 
        _id: propertyRequest.property._id, 
        landlord: session.user.id 
      }));

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized to modify this request' }, { status: 403 });
    }

    // Update the request
    if (action === 'approve') {
      propertyRequest.status = 'approved';
      propertyRequest.approveRequest(session.user.id, message, 'Please contact landlord to proceed with lease agreement');
      
      // Create approval notification for tenant
      await Notification.create({
        recipient: propertyRequest.tenant._id,
        sender: session.user.id,
        type: 'account_approved',
        title: 'Rental Request Approved!',
        message: `Your rental request has been approved by the landlord. ${message}`,
        relatedPropertyRequest: propertyRequest._id,
        relatedDocument: propertyRequest._id,
        relatedDocumentModel: 'PropertyRequest',
        actionRequired: true,
        priority: 'high'
      });

    } else if (action === 'reject') {
      propertyRequest.status = 'rejected';
      propertyRequest.rejectRequest(session.user.id, message || 'Request declined by landlord');
      
      // Create rejection notification for tenant
      await Notification.create({
        recipient: propertyRequest.tenant._id,
        sender: session.user.id,
        type: 'request_rejected',
        title: 'Rental Request Update',
        message: `Your rental request has been declined. ${message}`,
        relatedPropertyRequest: propertyRequest._id,
        relatedDocument: propertyRequest._id,
        relatedDocumentModel: 'PropertyRequest',
        priority: 'medium'
      });
    }

    await propertyRequest.save();

    // Mark related notifications as read
    await Notification.updateMany(
      { relatedPropertyRequest: requestId, recipient: session.user.id },
      { isRead: true, readAt: new Date() }
    );

    return NextResponse.json({
      success: true,
      data: {
        ...propertyRequest.toObject(),
        _id: propertyRequest._id.toString()
      },
      message: `Request ${action}d successfully`
    });

  } catch (error) {
    console.error('Error processing tenant request:', error);
    return NextResponse.json({ 
      error: 'Failed to process request'
    }, { status: 500 });
  }
}