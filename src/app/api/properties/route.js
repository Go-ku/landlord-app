// app/api/properties/route.js
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import Property from 'models/Property';
import Lease from 'models/Lease';
import User from 'models/User';
import dbConnect from 'lib/db';

// Helper function to get properties with role-based filtering
async function getPropertiesWithRoleFilter(userId, userRole, options = {}) {
  try {
    await dbConnect();
    
    const { limit = 50, page = 1 } = options;
    const skip = (page - 1) * limit;
    
    // Build base query based on user role
    let baseQuery = {};
    
    if (userRole === 'landlord') {
      // Landlords can only see their own properties
      baseQuery.landlord = userId;
    } else if (userRole === 'tenant') {
      // Tenants should not access this endpoint
      throw new Error('Tenants are not authorized to access properties list');
    }
    // Managers can see all properties (no additional filtering)
    
    // Use aggregation to get properties with lease information
    const propertiesAggregation = [
      {
        $match: baseQuery
      },
      {
        $lookup: {
          from: 'leases',
          localField: '_id',
          foreignField: 'propertyId',
          as: 'leases'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'landlord',
          foreignField: '_id',
          as: 'landlordInfo'
        }
      },
      {
        $addFields: {
          activeLeases: {
            $filter: {
              input: '$leases',
              cond: { $eq: ['$$this.status', 'active'] }
            }
          },
          totalLeases: { $size: '$leases' },
          isOccupied: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: '$leases',
                    cond: { $eq: ['$$this.status', 'active'] }
                  }
                }
              },
              0
            ]
          },
          landlordName: {
            $cond: {
              if: { $gt: [{ $size: '$landlordInfo' }, 0] },
              then: {
                $ifNull: [
                  { $arrayElemAt: ['$landlordInfo.name', 0] },
                  {
                    $concat: [
                      { $ifNull: [{ $arrayElemAt: ['$landlordInfo.firstName', 0] }, ''] },
                      ' ',
                      { $ifNull: [{ $arrayElemAt: ['$landlordInfo.lastName', 0] }, ''] }
                    ]
                  }
                ]
              },
              else: 'Unknown'
            }
          }
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $skip: skip
      },
      {
        $limit: limit
      }
    ];

    const properties = await Property.aggregate(propertiesAggregation);
    
    // Get total count for pagination
    const totalCountAggregation = [
      { $match: baseQuery },
      { $count: "total" }
    ];
    
    const countResult = await Property.aggregate(totalCountAggregation);
    const totalCount = countResult.length > 0 ? countResult[0].total : 0;
    
    // Convert MongoDB ObjectIds to strings
    const formattedProperties = properties.map(property => ({
      ...property,
      _id: property._id.toString(),
      landlord: property.landlord?.toString(),
      createdAt: property.createdAt?.toISOString() || null,
      updatedAt: property.updatedAt?.toISOString() || null,
      leases: property.leases.map(lease => ({
        ...lease,
        _id: lease._id.toString(),
        tenantId: lease.tenantId?.toString() || null,
        propertyId: lease.propertyId?.toString() || null
      }))
    }));

    return {
      properties: formattedProperties,
      totalCount,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1
      }
    };
  } catch (error) {
    console.error("Error fetching properties:", error);
    throw error;
  }
}

export async function GET(request) {
  try {
    // Use getServerSession for consistency with the page
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return Response.json({ 
        success: false,
        error: 'Unauthorized - Please sign in' 
      }, { status: 401 });
    }

    // Check if user has permission to view properties
    const allowedRoles = ['landlord', 'manager'];
    if (!allowedRoles.includes(session.user.role)) {
      return Response.json({ 
        success: false,
        error: 'Forbidden - Insufficient permissions',
        userRole: session.user.role 
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 50;
    const page = parseInt(searchParams.get('page')) || 1;

    const result = await getPropertiesWithRoleFilter(
      session.user.id, 
      session.user.role,
      { limit, page }
    );

    return Response.json({
      success: true,
      data: result.properties,
      pagination: result.pagination,
      userRole: session.user.role,
      message: `Retrieved ${result.properties.length} properties`
    });

  } catch (error) {
    console.error('Error in GET /api/properties:', error);
    
    return Response.json({
      success: false,
      error: 'Failed to fetch properties',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return Response.json({ 
        success: false,
        error: 'Unauthorized - Please sign in' 
      }, { status: 401 });
    }

    // Only landlords and managers can create properties
    const allowedRoles = ['landlord', 'manager'];
    if (!allowedRoles.includes(session.user.role)) {
      return Response.json({ 
        success: false,
        error: 'Forbidden - Only landlords and managers can create properties' 
      }, { status: 403 });
    }

    await dbConnect();

    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['address', 'type', 'monthlyRent'];
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      return Response.json({
        success: false,
        error: 'Missing required fields',
        missingFields
      }, { status: 400 });
    }

    // For managers, they might specify a landlord, otherwise use their own ID
    const landlordId = session.user.role === 'manager' && body.landlordId 
      ? body.landlordId 
      : session.user.id;

    // Validate landlord exists if specified
    if (landlordId !== session.user.id) {
      const landlordExists = await User.findById(landlordId);
      if (!landlordExists || landlordExists.role !== 'landlord') {
        return Response.json({
          success: false,
          error: 'Invalid landlord specified'
        }, { status: 400 });
      }
    }

    // Create property with the determined landlord ID
    const propertyData = {
      ...body,
      landlord: landlordId
    };

    const property = await Property.create(propertyData);

    // Populate the created property before returning
    const populatedProperty = await Property.findById(property._id)
      .populate('landlord', 'name email role');

    return Response.json({
      success: true,
      data: populatedProperty,
      message: 'Property created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating property:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return Response.json({
        success: false,
        error: 'Validation failed',
        details: validationErrors
      }, { status: 400 });
    }

    return Response.json({
      success: false,
      error: 'Failed to create property',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}