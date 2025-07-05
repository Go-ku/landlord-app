// app/api/property-requests/[id]/approve/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import dbConnect from 'lib/db';
import PropertyRequest from 'models/PropertyRequest';
import User from 'models/User'
import Notification  from 'models/Notification';
import sendApprovalNotificationEmail from 'lib/email.js';

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'landlord') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { responseMessage, nextSteps } = await request.json();

    if (!responseMessage?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Response message is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    const requestId = await params.id;
    const propertyRequest = await PropertyRequest.findById(requestId)
      .populate('tenant', 'name email phone')
      .populate('landlord', 'name email company')
      .populate('property', 'address type monthlyRent');

    if (!propertyRequest) {
      return NextResponse.json(
        { success: false, error: 'Property request not found' },
        { status: 404 }
      );
    }

    // Verify access rights
    if (propertyRequest.landlord && 
        propertyRequest.landlord._id.toString() !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Check if already responded
    if (propertyRequest.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Request has already been responded to' },
        { status: 400 }
      );
    }

    // Approve the request
    propertyRequest.approveRequest(
      session.user.id, 
      responseMessage, 
      nextSteps || 'I will contact you to arrange a viewing and discuss lease terms.'
    );

    await propertyRequest.save();

    // Create notification for tenant
    const notification = new Notification({
      recipient: propertyRequest.tenant._id,
      sender: session.user.id,
      type: 'property_request_approved',
      title: 'Property Request Approved!',
      message: `Your property request has been approved by ${propertyRequest.landlord.name}. ${responseMessage}`,
      data: {
        propertyRequestId: propertyRequest._id,
        propertyAddress: propertyRequest.property?.address || propertyRequest.requestedPropertyDetails?.address,
        landlordName: propertyRequest.landlord.name,
        nextSteps: nextSteps
      },
      actionButton: {
        text: 'View Details',
        url: `/dashboard/property-requests/${propertyRequest._id}`
      }
    });

    await notification.save();

    // Send email notification
    try {
      await sendApprovalNotificationEmail({
        tenantEmail: propertyRequest.tenant.email,
        tenantName: propertyRequest.tenant.name,
        landlordName: propertyRequest.landlord.name,
        propertyAddress: propertyRequest.property?.address || propertyRequest.requestedPropertyDetails?.address,
        responseMessage,
        nextSteps,
        propertyRequestId: propertyRequest._id
      });
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError);
      // Don't fail the request if email fails
    }

    // Generate lease creation URL with pre-filled data
    const leaseCreationParams = new URLSearchParams();
    leaseCreationParams.set('tenant', propertyRequest.tenant._id.toString());
    leaseCreationParams.set('requestId', propertyRequest._id.toString());
    
    if (propertyRequest.property) {
      leaseCreationParams.set('property', propertyRequest.property._id.toString());
    }
    
    const leaseCreationUrl = `/dashboard/leases/create?${leaseCreationParams.toString()}`;

    return NextResponse.json({
      success: true,
      message: 'Property request approved successfully',
      data: {
        request: propertyRequest,
        notification: notification,
        leaseCreationUrl: leaseCreationUrl
      }
    });

  } catch (error) {
    console.error('Error approving property request:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
