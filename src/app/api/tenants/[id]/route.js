// src/app/api/tenants/[id]/route.js
import { NextResponse } from 'next/server';
import dbConnect from 'lib/db';
import User from 'models/User';
import mongoose from 'mongoose';

// GET - Fetch single tenant
export async function GET(request, { params }) {
  try {
    await dbConnect();
    
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { error: 'Invalid tenant ID' },
        { status: 400 }
      );
    }

    const tenant = await User.findOne({ 
      _id: params.id, 
      role: 'tenant' 
    }).lean();

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Remove sensitive information
    const { password, ...tenantData } = tenant;

    return NextResponse.json({ tenant: tenantData });

  } catch (error) {
    console.error('Error fetching tenant:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tenant' },
      { status: 500 }
    );
  }
}

// PATCH - Update tenant
export async function PATCH(request, { params }) {
  try {
    await dbConnect();
    
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { error: 'Invalid tenant ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.email || !body.email.trim()) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate name fields (either name or firstName/lastName)
    const hasFullName = body.name && body.name.trim();
    const hasFirstLastName = body.firstName && body.firstName.trim() && 
                            body.lastName && body.lastName.trim();
    
    if (!hasFullName && !hasFirstLastName) {
      return NextResponse.json(
        { error: 'Either full name or first/last names are required' },
        { status: 400 }
      );
    }

    // Check if tenant exists
    const existingTenant = await User.findOne({ 
      _id: params.id, 
      role: 'tenant' 
    });

    if (!existingTenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Check if email is already taken by another user
    if (body.email !== existingTenant.email) {
      const emailExists = await User.findOne({ 
        email: body.email,
        _id: { $ne: params.id }
      });

      if (emailExists) {
        return NextResponse.json(
          { error: 'Email is already in use by another account' },
          { status: 409 }
        );
      }
    }

    // Prepare update data
    const updateData = {
      name: body.name?.trim() || '',
      firstName: body.firstName?.trim() || '',
      lastName: body.lastName?.trim() || '',
      email: body.email.trim(),
      phone: body.phone?.trim() || '',
      nationalId: body.nationalId?.trim() || '',
      isActive: body.isActive !== undefined ? body.isActive : true,
    };

    // Add date of birth if provided
    if (body.dateOfBirth) {
      updateData.dateOfBirth = new Date(body.dateOfBirth);
    }

    // Handle emergency contact
    if (body.emergencyContact) {
      updateData.emergencyContact = {
        name: body.emergencyContact.name?.trim() || '',
        phone: body.emergencyContact.phone?.trim() || '',
        relationship: body.emergencyContact.relationship?.trim() || '',
      };
    } else {
      // Remove emergency contact if not provided
      updateData.$unset = { emergencyContact: 1 };
    }

    // Update the tenant
    const updatedTenant = await User.findByIdAndUpdate(
      params.id,
      updateData,
      { 
        new: true, 
        runValidators: true,
        lean: true 
      }
    );

    if (!updatedTenant) {
      return NextResponse.json(
        { error: 'Failed to update tenant' },
        { status: 500 }
      );
    }

    // Remove sensitive information
    const { password, ...tenantData } = updatedTenant;

    return NextResponse.json({ 
      message: 'Tenant updated successfully',
      tenant: tenantData 
    });

  } catch (error) {
    console.error('Error updating tenant:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Email is already in use' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update tenant' },
      { status: 500 }
    );
  }
}

// DELETE - Delete tenant
export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { error: 'Invalid tenant ID' },
        { status: 400 }
      );
    }

    // Check if tenant exists
    const tenant = await User.findOne({ 
      _id: params.id, 
      role: 'tenant' 
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // TODO: Add checks for active leases and payments before deletion
    // For now, we'll allow deletion but in production you might want to:
    // 1. Check for active leases
    // 2. Archive instead of delete
    // 3. Require additional confirmation

    await User.findByIdAndDelete(params.id);

    return NextResponse.json({ 
      message: 'Tenant deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting tenant:', error);
    return NextResponse.json(
      { error: 'Failed to delete tenant' },
      { status: 500 }
    );
  }
}