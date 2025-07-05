// app/api/property-requests/[id]/reject/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import dbConnect from 'lib/db';
import PropertyRequest from 'models/PropertyRequest';

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'landlord') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { rejectionReason } = await request.json();

    if (!rejectionReason?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    const requestId = params.id;
    const propertyRequest = await PropertyRequest.findById(requestId);

    if (!propertyRequest) {
      return NextResponse.json(
        { success: false, error: 'Property request not found' },
        { status: 404 }
      );
    }

    // Verify access rights
    if (propertyRequest.landlord && 
        propertyRequest.landlord.toString() !== session.user.id) {
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

    // Reject the request
    propertyRequest.rejectRequest(session.user.id, rejectionReason);

    await propertyRequest.save();

    // TODO: Send notification email to tenant

    return NextResponse.json({
      success: true,
      message: 'Property request rejected',
      data: {
        request: propertyRequest
      }
    });

  } catch (error) {
    console.error('Error rejecting property request:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}