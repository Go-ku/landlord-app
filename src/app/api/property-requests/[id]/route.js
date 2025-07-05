// app/api/property-requests/[id]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import dbConnect from 'lib/db';
import PropertyRequest from 'models/PropertyRequest';

export async function GET(request, { params }) {
  try {
    const { id } = await params; // dynamic route param
  const { searchParams } = new URL(request.url);
  const landlordId = searchParams.get('landlordId');
    const session = await getServerSession(authOptions);

    console.log('in the prop-requests get function', request.url)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();
   

    const requestId = id;
    console.log(requestId)
    // Validate ObjectId format
    if (!requestId.match(/^[0-9a-fA-F]{24}$/)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request ID format' },
        { status: 400 }
      );
    }

    // Find the property request and populate related data
    const propertyRequest = await PropertyRequest.findById(requestId)
      .populate('tenant', 'name email phone role')
      .populate('property', 'address type monthlyRent bedrooms bathrooms city neighborhood')
      .populate('landlord', 'name email company')
      .populate('messages.sender', 'name email')
      .lean();

    console.log(propertyRequest)
    if (!propertyRequest) {
      return NextResponse.json(
        { success: false, error: 'Property request not found' },
        { status: 404 }
      );
    }

    // Access control based on user role
    if (session.user.role === 'landlord') {
      // Verify that the current user is the landlord for this request
      const isAuthorizedLandlord = 
        (propertyRequest.landlord && propertyRequest.landlord._id.toString() === session.user.id) ||
        (propertyRequest.requestType === 'new_property' && 
         propertyRequest.requestedPropertyDetails?.landlordEmail === session.user.email);

      if (!isAuthorizedLandlord) {
        return NextResponse.json(
          { success: false, error: 'Access denied' },
          { status: 403 }
        );
      }
    } else if (session.user.role === 'tenant') {
      // Tenants can only view their own requests
      if (propertyRequest.tenant._id.toString() !== session.user.id) {
        return NextResponse.json(
          { success: false, error: 'Access denied' },
          { status: 403 }
        );
      }
    } else {
      // Other roles (managers, admins) need property-specific access
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        request: propertyRequest
      }
    });

  } catch (error) {
    console.error('Error fetching property request:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update property request (for adding messages, etc.)
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, message, ...updateData } = body;

    await dbConnect();

    const requestId = await params.id;
    const propertyRequest = await PropertyRequest.findById(requestId);

    if (!propertyRequest) {
      return NextResponse.json(
        { success: false, error: 'Property request not found' },
        { status: 404 }
      );
    }

    // Verify access permissions
    const canUpdate = 
      (session.user.role === 'landlord' && propertyRequest.landlord?.toString() === session.user.id) ||
      (session.user.role === 'tenant' && propertyRequest.tenant.toString() === session.user.id);

    if (!canUpdate) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Handle different actions
    if (action === 'add_message' && message) {
      propertyRequest.addMessage(session.user.id, message);
    } else {
      // General update
      Object.assign(propertyRequest, updateData);
    }

    await propertyRequest.save();

    // Return updated request
    await propertyRequest.populate([
      { path: 'tenant', select: 'name email phone' },
      { path: 'property', select: 'address type monthlyRent' },
      { path: 'landlord', select: 'name email' },
      { path: 'messages.sender', select: 'name email' }
    ]);

    return NextResponse.json({
      success: true,
      data: {
        request: propertyRequest
      }
    });

  } catch (error) {
    console.error('Error updating property request:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}