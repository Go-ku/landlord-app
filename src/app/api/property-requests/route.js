// app/api/property-requests/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import dbConnect from 'lib/db';
import PropertyRequest from 'models/PropertyRequest';
import Lease from 'models/Lease'
import Property from 'models/Property';
import User from 'models/User';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only landlords can view property requests
    if (session.user.role !== 'landlord') {
      return NextResponse.json(
        { success: false, error: 'Access denied. Landlord access required.' },
        { status: 403 }
      );
    }

    await dbConnect();

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const requestType = searchParams.get('requestType');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const skip = (page - 1) * limit;

    // Build query filter
    const filter = {
      $or: [
        { landlord: session.user.id }, // Direct landlord assignment
        { 
          requestType: 'new_property',
          'requestedPropertyDetails.landlordEmail': session.user.email 
        }, // New property requests sent to this landlord's email
        {
          requestType: 'new_property',
          landlord: null // Unassigned new property requests
        }
      ]
    };

    // Add status filter if specified
    if (status && status !== 'all') {
      filter.status = status;
    }

    // Add request type filter if specified
    if (requestType && requestType !== 'all') {
      filter.requestType = requestType;
    }

    // Fetch property requests with pagination
    const [requests, totalCount] = await Promise.all([
      PropertyRequest.find(filter)
        .populate('tenant', 'name email phone role')
        .populate('property', 'address type monthlyRent bedrooms bathrooms city neighborhood')
        .populate('landlord', 'name email company')
        .sort({ createdAt: -1 }) // Most recent first
        .skip(skip)
        .limit(limit)
        .lean(),
      
      PropertyRequest.countDocuments(filter)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Get status counts for dashboard stats
    const statusCounts = await PropertyRequest.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const statusStats = {
      pending: 0,
      approved: 0,
      rejected: 0,
      property_created: 0,
      lease_requested: 0
    };

    statusCounts.forEach(item => {
      statusStats[item._id] = item.count;
    });

    return NextResponse.json({
      success: true,
      data: {
        requests,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage,
          hasPrevPage,
          limit
        },
        stats: statusStats
      }
    });

  } catch (error) {
    console.error('Error fetching property requests:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new property request (for tenant registration)
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      requestType,
      propertyId,
      requestedPropertyDetails,
      moveInPreferences,
      landlordId
    } = body;

    await dbConnect();

    // Validate required fields
    if (!requestType) {
      return NextResponse.json(
        { success: false, error: 'Request type is required' },
        { status: 400 }
      );
    }

    // Create property request object
    const requestData = {
      tenant: session.user.id,
      requestType,
      moveInPreferences: moveInPreferences || {}
    };

    // Handle existing property request
    if (requestType === 'existing_property') {
      if (!propertyId) {
        return NextResponse.json(
          { success: false, error: 'Property ID is required for existing property requests' },
          { status: 400 }
        );
      }

      // Verify property exists and get landlord
      const property = await Property.findById(propertyId).populate('landlord');
      if (!property) {
        return NextResponse.json(
          { success: false, error: 'Property not found' },
          { status: 404 }
        );
      }

      requestData.property = propertyId;
      requestData.landlord = property.landlord._id;
    }

    // Handle new property request
    if (requestType === 'new_property') {
      if (!requestedPropertyDetails?.address) {
        return NextResponse.json(
          { success: false, error: 'Property address is required for new property requests' },
          { status: 400 }
        );
      }

      requestData.requestedPropertyDetails = requestedPropertyDetails;

      // If landlord email is provided, try to find and assign landlord
      if (requestedPropertyDetails.landlordEmail) {
        const landlord = await User.findOne({ 
          email: requestedPropertyDetails.landlordEmail,
          role: 'landlord'
        });
        
        if (landlord) {
          requestData.landlord = landlord._id;
        }
      }

      // If landlordId is provided directly
      if (landlordId) {
        requestData.landlord = landlordId;
      }
    }

    // Create the property request
    const propertyRequest = new PropertyRequest(requestData);
    await propertyRequest.save();

    // Populate the created request for response
    await propertyRequest.populate([
      { path: 'tenant', select: 'name email phone' },
      { path: 'property', select: 'address type monthlyRent' },
      { path: 'landlord', select: 'name email' }
    ]);

    // TODO: Send notification email to landlord

    return NextResponse.json({
      success: true,
      message: 'Property request created successfully',
      data: {
        request: propertyRequest
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating property request:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}


