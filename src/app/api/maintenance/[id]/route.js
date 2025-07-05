// src/app/api/maintenance/[id]/route.js
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import dbConnect from 'lib/db';
import Maintenance from 'models/Maintenance';
import { NextResponse } from 'next/server';

// GET - Fetch single maintenance request
export async function GET(request, { params }) {
  try {
    const { id } = params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    await dbConnect();

    // Build query based on user role
    let query = { _id: id };
    
    // For tenants, only show their own requests
    if (session.user.role === 'tenant') {
      query.tenantId = session.user.id;
    }

    const request = await Maintenance.findOne(query)
      .populate({
        path: 'propertyId',
        select: 'address name type bedrooms bathrooms landlord',
        populate: {
          path: 'landlord',
          select: 'name firstName lastName email phone'
        }
      })
      .populate({
        path: 'tenantId',
        select: 'name firstName lastName email phone'
      })
      .populate({
        path: 'landlordId',
        select: 'name firstName lastName email phone'
      })
      .lean();

    if (!request) {
      return NextResponse.json(
        { error: 'Maintenance request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(request);

  } catch (error) {
    console.error('Error fetching maintenance request:', error);
    return NextResponse.json(
      { error: 'Failed to fetch maintenance request' },
      { status: 500 }
    );
  }
}

// PATCH - Update maintenance request
export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { status, priority, title, description, dateCompleted } = body;

    await dbConnect();

    // Find the maintenance request
    const maintenanceRequest = await Maintenance.findById(id);
    
    if (!maintenanceRequest) {
      return NextResponse.json(
        { error: 'Maintenance request not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const canUpdate = 
      session.user.role === 'admin' ||
      session.user.role === 'manager' ||
      (session.user.role === 'landlord' && maintenanceRequest.landlordId.toString() === session.user.id) ||
      (session.user.role === 'tenant' && maintenanceRequest.tenantId?.toString() === session.user.id && maintenanceRequest.status === 'Pending');

    if (!canUpdate) {
      return NextResponse.json(
        { error: 'Insufficient permissions to update this request' },
        { status: 403 }
      );
    }

    // Prepare update data
    const updateData = {};
    
    if (status !== undefined) {
      if (!['Pending', 'In Progress', 'Completed'].includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status value' },
          { status: 400 }
        );
      }
      updateData.status = status;
    }

    if (priority !== undefined) {
      if (!['Low', 'Medium', 'High'].includes(priority)) {
        return NextResponse.json(
          { error: 'Invalid priority value' },
          { status: 400 }
        );
      }
      updateData.priority = priority;
    }

    if (title !== undefined) {
      if (!title.trim()) {
        return NextResponse.json(
          { error: 'Title is required' },
          { status: 400 }
        );
      }
      updateData.title = title.trim();
    }

    if (description !== undefined) {
      if (!description.trim()) {
        return NextResponse.json(
          { error: 'Description is required' },
          { status: 400 }
        );
      }
      updateData.description = description.trim();
    }

    if (dateCompleted !== undefined) {
      updateData.dateCompleted = dateCompleted;
    }

    // If status is being set to 'Completed' and no dateCompleted provided, set it to now
    if (status === 'Completed' && !dateCompleted) {
      updateData.dateCompleted = new Date();
    }

    // If status is being changed from 'Completed' to something else, remove dateCompleted
    if (status && status !== 'Completed' && maintenanceRequest.status === 'Completed') {
      updateData.dateCompleted = null;
    }

    // Update the request
    const updatedRequest = await Maintenance.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Maintenance request updated successfully',
      data: updatedRequest
    });

  } catch (error) {
    console.error('Error updating maintenance request:', error);
    return NextResponse.json(
      { error: 'Failed to update maintenance request' },
      { status: 500 }
    );
  }
}

// DELETE - Delete maintenance request
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    await dbConnect();

    // Find the maintenance request
    const maintenanceRequest = await Maintenance.findById(id);
    
    if (!maintenanceRequest) {
      return NextResponse.json(
        { error: 'Maintenance request not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const canDelete = 
      session.user.role === 'admin' ||
      session.user.role === 'manager' ||
      (session.user.role === 'tenant' && maintenanceRequest.tenantId?.toString() === session.user.id && maintenanceRequest.status === 'Pending');

    if (!canDelete) {
      return NextResponse.json(
        { error: 'Insufficient permissions to delete this request' },
        { status: 403 }
      );
    }

    // Delete the request
    await Maintenance.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Maintenance request deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting maintenance request:', error);
    return NextResponse.json(
      { error: 'Failed to delete maintenance request' },
      { status: 500 }
    );
  }
}