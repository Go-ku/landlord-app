// src/app/api/maintenance/route.js
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import dbConnect from 'lib/db';
import Maintenance from 'models/Maintenance';
import Property from 'models/Property';
import User from 'models/User';
import { NextResponse } from 'next/server';

// POST - Create new maintenance request
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { propertyId, tenantId, title, description, priority = 'Medium', status = 'Pending', images = [] } = body;

    // Validation
    if (!propertyId) {
      return NextResponse.json(
        { error: 'Property ID is required' },
        { status: 400 }
      );
    }

    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    if (!description?.trim()) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      );
    }

    if (!['Low', 'Medium', 'High'].includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority value' },
        { status: 400 }
      );
    }

    if (!['Pending', 'In Progress', 'Completed'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Verify property exists and user has access
    const property = await Property.findById(propertyId).populate('landlord');
    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to create requests for this property
    const canCreateRequest = 
      session.user.role === 'admin' ||
      session.user.role === 'manager' ||
      property.landlord._id.toString() === session.user.id ||
      (session.user.role === 'tenant' && (!tenantId || tenantId === session.user.id));

    if (!canCreateRequest) {
      return NextResponse.json(
        { error: 'Insufficient permissions to create request for this property' },
        { status: 403 }
      );
    }

    // If tenantId is provided, verify the tenant exists
    if (tenantId) {
      const tenant = await User.findById(tenantId);
      if (!tenant) {
        return NextResponse.json(
          { error: 'Tenant not found' },
          { status: 404 }
        );
      }
    }

    // Determine landlordId - use property's landlord
    const landlordId = property.landlord._id;

    // Create maintenance request
    const maintenanceData = {
      propertyId,
      tenantId: tenantId || (session.user.role === 'tenant' ? session.user.id : null),
      title: title.trim(),
      description: description.trim(),
      priority,
      status,
      images: images.filter(img => img && img.trim()), // Filter out empty images
      landlordId,
      dateReported: new Date()
    };

    const maintenanceRequest = new Maintenance(maintenanceData);
    await maintenanceRequest.save();

    // Populate the created request for response
    const populatedRequest = await Maintenance.findById(maintenanceRequest._id)
      .populate({
        path: 'propertyId',
        select: 'address name type'
      })
      .populate({
        path: 'tenantId',
        select: 'name firstName lastName email'
      })
      .populate({
        path: 'landlordId',
        select: 'name firstName lastName email'
      })
      .lean();

    // Serialize the response
    const serializedRequest = {
      ...populatedRequest,
      _id: populatedRequest._id.toString(),
      propertyId: populatedRequest.propertyId ? {
        ...populatedRequest.propertyId,
        _id: populatedRequest.propertyId._id.toString()
      } : null,
      tenantId: populatedRequest.tenantId ? {
        ...populatedRequest.tenantId,
        _id: populatedRequest.tenantId._id.toString()
      } : null,
      landlordId: populatedRequest.landlordId ? {
        ...populatedRequest.landlordId,
        _id: populatedRequest.landlordId._id.toString()
      } : null,
      dateReported: populatedRequest.dateReported.toISOString(),
      dateCompleted: populatedRequest.dateCompleted ? populatedRequest.dateCompleted.toISOString() : null
    };

    return NextResponse.json({
      success: true,
      message: 'Maintenance request created successfully',
      data: serializedRequest
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating maintenance request:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return NextResponse.json(
        { error: 'Validation error', details: validationErrors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create maintenance request' },
      { status: 500 }
    );
  }
}

// GET - Fetch maintenance requests (for listing page)
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const priority = searchParams.get('priority') || 'all';
    const sortBy = searchParams.get('sortBy') || 'dateReported';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;

    await dbConnect();

    // Build query based on user role
    let query = {};
    
    if (session.user.role === 'tenant') {
      query.tenantId = session.user.id;
    } else if (session.user.role === 'landlord') {
      query.landlordId = session.user.id;
    }
    // Admins and managers can see all requests

    // Apply filters
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (status !== 'all') {
      query.status = status;
    }

    if (priority !== 'all') {
      query.priority = priority;
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute queries
    const [requests, totalCount] = await Promise.all([
      Maintenance.find(query)
        .populate({
          path: 'propertyId',
          select: 'address name type'
        })
        .populate({
          path: 'tenantId',
          select: 'name firstName lastName email'
        })
        .sort(sortOptions)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      
      Maintenance.countDocuments(query)
    ]);

    // Serialize the requests
    const serializedRequests = requests.map(request => ({
      ...request,
      _id: request._id.toString(),
      propertyId: request.propertyId ? {
        ...request.propertyId,
        _id: request.propertyId._id.toString()
      } : null,
      tenantId: request.tenantId ? {
        ...request.tenantId,
        _id: request.tenantId._id.toString()
      } : null,
      dateReported: request.dateReported.toISOString(),
      dateCompleted: request.dateCompleted ? request.dateCompleted.toISOString() : null
    }));

    return NextResponse.json({
      success: true,
      data: {
        requests: serializedRequests,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          limit
        }
      }
    });

  } catch (error) {
    console.error('Error fetching maintenance requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch maintenance requests' },
      { status: 500 }
    );
  }
}