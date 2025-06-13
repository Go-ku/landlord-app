// src/app/api/leases/route.js
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Lease from 'models/Lease';
import Property from 'models/Property';
import User from 'models/User';

// Connect to MongoDB
async function connectDB() {
  if (mongoose.connections[0].readyState) {
    return;
  }
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

// GET - Fetch all leases
export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const tenantId = searchParams.get('tenantId');
    const landlordId = searchParams.get('landlordId');
    const propertyId = searchParams.get('propertyId');
    
    // Build query filter
    const filter = {};
    if (status) filter.status = status;
    if (tenantId) filter.tenantId = tenantId;
    if (landlordId) filter.landlordId = landlordId;
    if (propertyId) filter.propertyId = propertyId;
    
    const leases = await Lease.find(filter)
      .populate('propertyId', 'address name type')
      .populate('tenantId', 'name firstName lastName email phone')
      .populate('landlordId', 'name firstName lastName email')
      .sort({ createdAt: -1 });
    
    return NextResponse.json(leases);
  } catch (error) {
    console.error('Error fetching leases:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leases', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Create a new lease
export async function POST(request) {
  try {
    await connectDB();
    
    const body = await request.json();
    console.log('Received lease data:', body);
    
    // Extract and validate required fields
    const {
      propertyId,
      tenantId,
      landlordId,
      startDate,
      endDate,
      monthlyRent,
      securityDeposit,
      paymentDueDay = 1,
      status = 'draft',
      nextPaymentDue,
      balanceDue,
      totalPaid = 0
    } = body;
    
    // Validation
    const errors = [];
    
    if (!propertyId) errors.push('Property ID is required');
    if (!tenantId) errors.push('Tenant ID is required');
    if (!landlordId) errors.push('Landlord ID is required');
    if (!startDate) errors.push('Start date is required');
    if (!endDate) errors.push('End date is required');
    if (!monthlyRent || monthlyRent <= 0) errors.push('Monthly rent must be greater than 0');
    if (!securityDeposit || securityDeposit < 0) errors.push('Security deposit must be 0 or greater');
    
    // Validate ObjectIds
    if (propertyId && !mongoose.Types.ObjectId.isValid(propertyId)) {
      errors.push('Invalid property ID format');
    }
    if (tenantId && !mongoose.Types.ObjectId.isValid(tenantId)) {
      errors.push('Invalid tenant ID format');
    }
    if (landlordId && !mongoose.Types.ObjectId.isValid(landlordId)) {
      errors.push('Invalid landlord ID format');
    }
    
    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime())) errors.push('Invalid start date');
    if (isNaN(end.getTime())) errors.push('Invalid end date');
    if (start >= end) errors.push('End date must be after start date');
    
    // Validate payment due day
    if (paymentDueDay < 1 || paymentDueDay > 31) {
      errors.push('Payment due day must be between 1 and 31');
    }
    
    // Validate status
    const validStatuses = ['draft', 'active', 'terminated', 'expired'];
    if (!validStatuses.includes(status)) {
      errors.push('Invalid status. Must be: ' + validStatuses.join(', '));
    }
    
    if (errors.length > 0) {
      console.log('Validation errors:', errors);
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      );
    }
    
    // Verify referenced documents exist
    try {
      const [property, tenant, landlord] = await Promise.all([
        Property.findById(propertyId),
        User.findById(tenantId),
        User.findById(landlordId)
      ]);
      
      if (!property) {
        return NextResponse.json(
          { error: 'Property not found', details: `Property with ID ${propertyId} does not exist` },
          { status: 404 }
        );
      }
      
      if (!tenant) {
        return NextResponse.json(
          { error: 'Tenant not found', details: `User with ID ${tenantId} does not exist` },
          { status: 404 }
        );
      }
      
      if (!landlord) {
        return NextResponse.json(
          { error: 'Landlord not found', details: `User with ID ${landlordId} does not exist` },
          { status: 404 }
        );
      }
      
      console.log('All referenced entities exist:', {
        property: property.address || property.name,
        tenant: tenant.name || `${tenant.firstName} ${tenant.lastName}`,
        landlord: landlord.name || `${landlord.firstName} ${landlord.lastName}`
      });
    } catch (refError) {
      console.error('Error verifying references:', refError);
      return NextResponse.json(
        { error: 'Failed to verify referenced entities', details: refError.message },
        { status: 500 }
      );
    }
    
    // Check for overlapping leases (optional business rule)
    const overlappingLease = await Lease.findOne({
      propertyId,
      $or: [
        {
          startDate: { $lte: new Date(endDate) },
          endDate: { $gte: new Date(startDate) }
        }
      ],
      status: { $in: ['active', 'draft'] }
    });
    
    if (overlappingLease) {
      return NextResponse.json(
        { 
          error: 'Lease conflict', 
          details: 'There is already an active or draft lease for this property during the specified period',
          conflictingLease: overlappingLease._id
        },
        { status: 409 }
      );
    }
    
    // Create the lease
    const leaseData = {
      propertyId,
      tenantId,
      landlordId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      monthlyRent: parseFloat(monthlyRent),
      securityDeposit: parseFloat(securityDeposit),
      paymentDueDay: parseInt(paymentDueDay),
      status,
      totalPaid: parseFloat(totalPaid) || 0,
      balanceDue: parseFloat(balanceDue) || parseFloat(monthlyRent)
    };
    
    // Add nextPaymentDue if provided
    if (nextPaymentDue) {
      const nextPayment = new Date(nextPaymentDue);
      if (!isNaN(nextPayment.getTime())) {
        leaseData.nextPaymentDue = nextPayment;
      }
    }
    
    console.log('Creating lease with data:', leaseData);
    
    const lease = new Lease(leaseData);
    const savedLease = await lease.save();
    
    // Populate the response with referenced data
    const populatedLease = await Lease.findById(savedLease._id)
      .populate('propertyId', 'address name type')
      .populate('tenantId', 'name firstName lastName email phone')
      .populate('landlordId', 'name firstName lastName email');
    
    console.log('Lease created successfully:', populatedLease._id);
    
    return NextResponse.json(populatedLease, { status: 201 });
    
  } catch (error) {
    console.error('Error creating lease:', error);
    
    // Handle specific MongoDB errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      );
    }
    
    if (error.name === 'CastError') {
      return NextResponse.json(
        { error: 'Invalid data format', details: error.message },
        { status: 400 }
      );
    }
    
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Duplicate entry', details: 'A lease with these details already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create lease', details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update an existing lease
export async function PUT(request) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Lease ID is required for updates' },
        { status: 400 }
      );
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid lease ID format' },
        { status: 400 }
      );
    }
    
    // Find and update the lease
    const updatedLease = await Lease.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('propertyId', 'address name type')
    .populate('tenantId', 'name firstName lastName email phone')
    .populate('landlordId', 'name firstName lastName email');
    
    if (!updatedLease) {
      return NextResponse.json(
        { error: 'Lease not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(updatedLease);
    
  } catch (error) {
    console.error('Error updating lease:', error);
    return NextResponse.json(
      { error: 'Failed to update lease', details: error.message },
      { status: 500 }
    );
  }
}