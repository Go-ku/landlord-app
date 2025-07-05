// app/api/tenant/property-request/route.js - Handle tenant property requests
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from 'lib/db';
import PropertyRequest from 'models/PropertyRequest';
import Property from 'models/Property';
import User from 'models/User';
import Notification from 'models/Notification';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'tenant') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const data = await request.json();
    console.log(data)
    const {
      requestType,
      propertyId,
      requestedPropertyDetails,
      moveInPreferences
    } = data;

    let landlordId = null;
    let propertyRef = null;

    // Handle existing property requests
    if (requestType === 'existing_property' && propertyId) {
      const property = await Property.findById(propertyId).populate('landlord');
      if (!property) {
        return Response.json({ error: 'Property not found' }, { status: 404 });
      }
      if (!property.isAvailable) {
        return Response.json({ error: 'Property is not available for rent' }, { status: 400 });
      }
      
      landlordId = property.landlord._id;
      propertyRef = propertyId;
    }
    
    // Handle new property requests
    if (requestType === 'new_property' && requestedPropertyDetails) {
      // Try to find landlord by email first
      if (requestedPropertyDetails.landlordEmail) {
        const landlord = await User.findOne({ 
          email: requestedPropertyDetails.landlordEmail,
          role: 'landlord'
        });
        
        if (landlord) {
          landlordId = landlord._id;
        } else {
          // Create a notification for admin to handle unknown landlord
          console.log(`Property request for unknown landlord email: ${requestedPropertyDetails.landlordEmail}`);
        }
      }
    }

    // Check for duplicate requests
    const existingRequest = await PropertyRequest.findOne({
      tenant: session.user.id,
      $or: [
        { property: propertyRef },
        { 
          'requestedPropertyDetails.address': requestedPropertyDetails?.address,
          'requestedPropertyDetails.landlordEmail': requestedPropertyDetails?.landlordEmail
        }
      ],
      status: { $in: ['pending', 'approved'] }
    });

    if (existingRequest) {
      return Response.json({ 
        error: 'You already have a pending request for this property' 
      }, { status: 400 });
    }

    // Create property request
    const propertyRequest = await PropertyRequest.create({
      tenant: session.user.id,
      requestType,
      property: propertyRef,
      requestedPropertyDetails: requestType === 'new_property' ? requestedPropertyDetails : undefined,
      landlord: landlordId,
      moveInPreferences,
      status: 'pending'
    });
 console.log(propertyRequest)
    // Create notification for landlord (if found)
    if (landlordId) {
      if (requestType === 'existing_property') {
        await Notification.create({
          recipient: landlordId,
          sender: session.user.id,
          type: 'tenant_registration',
          title: 'New Rental Application',
          message: `A tenant has applied to rent your property at ${requestedPropertyDetails?.address || 'your listed property'}.`,
          relatedPropertyRequest: propertyRequest._id,
          relatedProperty: propertyRef,
          actionRequired: true,
          actionUrl: `/landlord/tenant-requests/${propertyRequest._id}`,
          priority: 'high'
        });
      } else {
        await Notification.createPropertyRequestNotification(
          landlordId,
          session.user.id,
          requestedPropertyDetails
        );
      }
    } else if (requestType === 'new_property') {
      // Create admin notification for unmatched landlord
      const admins = await User.find({ 
        role: { $in: ['admin', 'manager'] },
        isActive: true 
      });
      
      for (const admin of admins) {
        await Notification.create({
          recipient: admin._id,
          sender: session.user.id,
          type: 'property_request',
          title: 'New Property Request - Unknown Landlord',
          message: `A tenant is requesting a property but the landlord (${requestedPropertyDetails.landlordEmail}) is not in the system.`,
          relatedPropertyRequest: propertyRequest._id,
          actionRequired: true,
          actionUrl: `/admin/property-requests/${propertyRequest._id}`,
          priority: 'medium'
        });
      }
    }

    // Create confirmation notification for tenant
    await Notification.create({
      recipient: session.user.id,
      type: 'general',
      title: 'Property Request Submitted',
      message: `Your property request has been submitted successfully. ${
        landlordId 
          ? 'The landlord will review your request and respond soon.' 
          : 'We will contact the landlord and get back to you.'
      }`,
      relatedPropertyRequest: propertyRequest._id,
      actionRequired: false,
      priority: 'low'
    });

    return Response.json({ 
      success: true, 
      message: 'Property request submitted successfully',
      requestId: propertyRequest._id
    });

  } catch (error) {
    console.error('Error creating property request:', error);
    return Response.json({ error: 'Failed to create property request' }, { status: 500 });
  }
}


export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'tenant') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const skip = (page - 1) * limit;

    const requests = await PropertyRequest.find({ tenant: session.user.id })
      .populate('property', 'address city monthlyRent type')
      .populate('landlord', 'name email phone company')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await PropertyRequest.countDocuments({ tenant: session.user.id });

    return Response.json({
      requests,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Error fetching property requests:', error);
    return Response.json({ error: 'Failed to fetch property requests' }, { status: 500 });
  }
}



