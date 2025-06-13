// app/api/manager/assign-properties/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from 'lib/db';
import User from 'models/User';
import Property from 'models/Property';

// GET - Fetch assignment data
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'manager') {
      return NextResponse.json(
        { success: false, error: 'Not authorized' },
        { status: 403 }
      );
    }

    await dbConnect();

    // Get all admins with their assignments
    const admins = await User.find({ role: 'admin' })
      .populate('assignedProperties.property', 'address type monthlyRent')
      .populate('assignedProperties.assignedBy', 'name')
      .select('name email phone adminLevel assignedProperties isActive');

    // Get all properties
    const properties = await Property.find({})
      .populate('landlord', 'name email')
      .select('address type monthlyRent landlord');

    return NextResponse.json({
      success: true,
      data: {
        admins,
        properties
      }
    });

  } catch (error) {
    console.error('Error fetching assignment data:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Assign property to admin
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'manager') {
      return NextResponse.json(
        { success: false, error: 'Not authorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { adminId, propertyId, permissions = ['log_payments', 'create_invoices'] } = body;

    if (!adminId || !propertyId) {
      return NextResponse.json(
        { success: false, error: 'Admin ID and Property ID are required' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Verify admin exists
    const admin = await User.findOne({ _id: adminId, role: 'admin' });
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Admin not found' },
        { status: 404 }
      );
    }

    // Verify property exists
    const property = await Property.findById(propertyId);
    if (!property) {
      return NextResponse.json(
        { success: false, error: 'Property not found' },
        { status: 404 }
      );
    }

    // Check if property is already assigned to this admin
    const existingAssignment = admin.assignedProperties.find(
      assignment => assignment.property && assignment.property.toString() === propertyId && assignment.isActive
    );

    if (existingAssignment) {
      return NextResponse.json(
        { success: false, error: 'Property is already assigned to this admin' },
        { status: 400 }
      );
    }

    // Add new assignment
    admin.assignedProperties.push({
      property: propertyId,
      assignedBy: session.user.id,
      permissions,
      isActive: true,
      assignedDate: new Date()
    });

    // Set supervisor if not already set
    if (!admin.supervisedBy) {
      admin.supervisedBy = session.user.id;
    }

    await admin.save();

    // Return updated admin with populated data
    const updatedAdmin = await User.findById(adminId)
      .populate('assignedProperties.property', 'address type monthlyRent')
      .populate('assignedProperties.assignedBy', 'name')
      .populate('supervisedBy', 'name email');

    return NextResponse.json({
      success: true,
      message: 'Property assigned successfully',
      data: {
        admin: updatedAdmin,
        assignment: {
          property: propertyId,
          permissions,
          assignedDate: new Date()
        }
      }
    });

  } catch (error) {
    console.error('Error assigning property:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove property assignment
export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'manager') {
      return NextResponse.json(
        { success: false, error: 'Not authorized' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get('adminId');
    const propertyId = searchParams.get('propertyId');

    if (!adminId || !propertyId) {
      return NextResponse.json(
        { success: false, error: 'Admin ID and Property ID are required' },
        { status: 400 }
      );
    }

    await dbConnect();

    const admin = await User.findOne({ _id: adminId, role: 'admin' });
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Admin not found' },
        { status: 404 }
      );
    }

    // Find and deactivate the assignment
    const assignment = admin.assignedProperties.find(
      assignment => assignment.property && assignment.property.toString() === propertyId && assignment.isActive
    );

    if (!assignment) {
      return NextResponse.json(
        { success: false, error: 'Assignment not found' },
        { status: 404 }
      );
    }

    assignment.isActive = false;
    await admin.save();

    return NextResponse.json({
      success: true,
      message: 'Property assignment removed successfully'
    });

  } catch (error) {
    console.error('Error removing assignment:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}