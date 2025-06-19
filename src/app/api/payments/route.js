// app/api/payments/route.js - Updated for Next.js 15 compatibility
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import dbConnect from 'lib/db';
import mongoose from 'mongoose';
import Payment from 'models';
import User from 'models';
import Lease from 'models';
import Property from 'models';

// Helper function to get models
function getModels() {
  return {
    Payment: mongoose.model('Payment'),
    User: mongoose.model('User'),
    Property: mongoose.model('Property'),
    Lease: mongoose.model('Lease')
  };
}

// GET - Fetch payments with role-based filtering
export async function GET(request) {
  try {
    await dbConnect();
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized - No valid session' }, { status: 401 });
    }

    const { Payment, Property } = getModels();
    const { searchParams } = new URL(request.url);
    
    const status = searchParams.get('status');
    const sortBy = searchParams.get('sortBy') || 'newest';
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;

    // Role-based filtering
    let filter = {};
    
    if (session.user.role === 'tenant') {
      // Tenants can only see their own payments
      filter.tenant = session.user.id;
    } else if (session.user.role === 'landlord') {
      // Landlords can see payments for their properties
      const landlordProperties = await Property.find({ landlord: session.user.id }).select('_id');
      const propertyIds = landlordProperties.map(p => p._id);
      filter.property = { $in: propertyIds };
    } else if (!['manager', 'admin'].includes(session.user.role)) {
      // Other roles have no access
      return NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 });
    }
    // Managers and admins can see all payments (no additional filter)

    // Add status filter
    if (status && status !== 'all') {
      if (status === 'overdue') {
        filter.dueDate = { $lt: new Date() };
        filter.status = { $nin: ['completed', 'paid', 'verified'] };
      } else {
        filter.status = status;
      }
    }

    // Build sort
    let sort = {};
    switch (sortBy) {
      case 'newest':
        sort = { createdAt: -1 };
        break;
      case 'oldest':
        sort = { createdAt: 1 };
        break;
      case 'amount_high':
        sort = { amount: -1 };
        break;
      case 'amount_low':
        sort = { amount: 1 };
        break;
      case 'date_recent':
        sort = { paymentDate: -1 };
        break;
      case 'date_old':
        sort = { paymentDate: 1 };
        break;
      default:
        sort = { createdAt: -1 };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch payments with pagination
    const [payments, totalCount] = await Promise.all([
      Payment.find(filter)
        .populate('tenant', 'name email firstName lastName')
        .populate('property', 'address type name')
        .populate('lease', 'monthlyRent')
        .populate('recordedBy', 'name email firstName lastName')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Payment.countDocuments(filter)
    ]);

    // For backward compatibility, also populate tenantId and propertyId fields
    const populatedPayments = payments.map(payment => ({
      ...payment,
      tenantId: payment.tenant,
      propertyId: payment.property
    }));

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      payments: populatedPayments,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch payments',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

// POST - Create payment (for managers/landlords only)
export async function POST(request) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized - No valid session' }, { status: 401 });
    }

    // Only managers and landlords can create payments via this endpoint
    // Tenants use the /api/tenant/payments endpoint
    if (!['manager', 'landlord', 'admin'].includes(session.user.role)) {
      return NextResponse.json({ 
        error: 'Forbidden - Only managers and landlords can record payments directly' 
      }, { status: 403 });
    }

    const { Payment, User, Property } = getModels();

    // Parse request body (JSON or FormData)
    let paymentData;
    const contentType = request.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      const body = await request.json();
      paymentData = {
        amount: parseFloat(body.amount),
        paymentDate: new Date(body.paymentDate),
        paymentMethod: body.paymentMethod,
        reference: body.reference,
        description: body.description || '',
        paymentType: body.paymentType || 'rent',
        
        // Get IDs from body
        tenant: body.tenantId || body.tenant,
        property: body.propertyId || body.property,
        lease: body.leaseId || body.lease || null,
        
        // Status and approval
        status: body.status || 'verified',
        approvalStatus: 'approved',
        approvedBy: session.user.id,
        approvedAt: new Date(),
        
        // Record who created this
        recordedBy: session.user.id,
        receiptUrl: body.receiptUrl || null
      };
    } else {
      // Handle FormData
      const formData = await request.formData();
      
      paymentData = {
        amount: parseFloat(formData.get('amount')),
        paymentDate: new Date(formData.get('paymentDate')),
        paymentMethod: formData.get('paymentMethod'),
        reference: formData.get('reference'),
        description: formData.get('description') || '',
        paymentType: formData.get('paymentType') || 'rent',
        
        // Get IDs from form
        tenant: formData.get('tenantId') || formData.get('tenant'),
        property: formData.get('propertyId') || formData.get('property'),
        lease: formData.get('leaseId') || formData.get('lease') || null,
        
        // Status and approval
        status: formData.get('status') || 'verified',
        approvalStatus: 'approved',
        approvedBy: session.user.id,
        approvedAt: new Date(),
        
        // Record who created this
        recordedBy: session.user.id
      };

      // Handle file upload if present
      const receiptFile = formData.get('receiptFile');
      if (receiptFile && receiptFile.size > 0) {
        // TODO: Implement file upload to cloud storage
        paymentData.receiptUrl = `/uploads/receipts/${Date.now()}-${receiptFile.name}`;
      }
    }

    // Validate required fields
    if (!paymentData.amount || paymentData.amount <= 0) {
      return NextResponse.json({ error: 'Valid payment amount is required' }, { status: 400 });
    }

    if (!paymentData.tenant) {
      return NextResponse.json({ error: 'Tenant is required' }, { status: 400 });
    }

    if (!paymentData.property) {
      return NextResponse.json({ error: 'Property is required' }, { status: 400 });
    }

    if (!paymentData.paymentMethod) {
      return NextResponse.json({ error: 'Payment method is required' }, { status: 400 });
    }

    if (!paymentData.reference?.trim()) {
      return NextResponse.json({ error: 'Payment reference is required' }, { status: 400 });
    }

    // Verify the tenant and property exist
    const [tenant, property] = await Promise.all([
      User.findById(paymentData.tenant),
      Property.findById(paymentData.property)
    ]);

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // For landlords, verify they own the property
    if (session.user.role === 'landlord' && property.landlord.toString() !== session.user.id) {
      return NextResponse.json({ 
        error: 'You can only record payments for your own properties' 
      }, { status: 403 });
    }

    // Create the payment
    const payment = new Payment(paymentData);
    
    // Add to approval history
    if (!payment.approvalHistory) {
      payment.approvalHistory = [];
    }
    
    payment.approvalHistory.push({
      action: 'approved',
      user: session.user.id,
      notes: `Payment recorded by ${session.user.role}`,
      timestamp: new Date()
    });

    await payment.save();

    // Populate the created payment
    const populatedPayment = await Payment.findById(payment._id)
      .populate('tenant', 'name email firstName lastName')
      .populate('property', 'address type name')
      .populate('lease', 'monthlyRent')
      .populate('recordedBy', 'name email firstName lastName');

    return NextResponse.json({
      success: true,
      data: populatedPayment,
      message: 'Payment recorded successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json({ 
      error: 'Failed to record payment',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

// PUT - Update payment
export async function PUT(request) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized - No valid session' }, { status: 401 });
    }

    // Only managers and admins can update payments
    if (!['manager', 'admin'].includes(session.user.role)) {
      return NextResponse.json({ 
        error: 'Forbidden - Only managers and admins can update payments' 
      }, { status: 403 });
    }

    const { Payment } = getModels();
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('id');

    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
    }

    // Parse request body
    let updateData;
    const contentType = request.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      const body = await request.json();
      updateData = {
        amount: body.amount ? parseFloat(body.amount) : undefined,
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : undefined,
        paymentMethod: body.paymentMethod,
        reference: body.reference,
        description: body.description,
        status: body.status,
        approvalStatus: body.status === 'verified' ? 'approved' : body.approvalStatus,
        receiptUrl: body.receiptUrl
      };
    } else {
      // Handle FormData
      const formData = await request.formData();
      
      updateData = {
        amount: formData.get('amount') ? parseFloat(formData.get('amount')) : undefined,
        paymentDate: formData.get('paymentDate') ? new Date(formData.get('paymentDate')) : undefined,
        paymentMethod: formData.get('paymentMethod'),
        reference: formData.get('reference'),
        description: formData.get('description') || '',
        status: formData.get('status'),
        approvalStatus: formData.get('status') === 'verified' ? 'approved' : formData.get('approvalStatus')
      };

      // Handle file upload/removal
      const receiptFile = formData.get('receiptFile');
      const removeExistingReceipt = formData.get('removeExistingReceipt') === 'true';

      if (removeExistingReceipt) {
        updateData.receiptUrl = null;
      } else if (receiptFile && receiptFile.size > 0) {
        // TODO: Implement file upload to cloud storage
        updateData.receiptUrl = `/uploads/receipts/${Date.now()}-${receiptFile.name}`;
      }
    }

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    // Update the payment
    const payment = await Payment.findByIdAndUpdate(
      paymentId,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('tenant', 'name email firstName lastName')
    .populate('property', 'address type name')
    .populate('lease', 'monthlyRent')
    .populate('recordedBy', 'name email firstName lastName');

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Add to approval history
    if (!payment.approvalHistory) {
      payment.approvalHistory = [];
    }
    
    payment.approvalHistory.push({
      action: 'updated',
      user: session.user.id,
      notes: `Payment updated by ${session.user.role}`,
      timestamp: new Date()
    });

    await payment.save();

    return NextResponse.json({
      success: true,
      data: payment,
      message: 'Payment updated successfully'
    });

  } catch (error) {
    console.error('Error updating payment:', error);
    return NextResponse.json({ 
      error: 'Failed to update payment',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

// DELETE - Cancel payment
export async function DELETE(request) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized - No valid session' }, { status: 401 });
    }

    // Only managers and admins can cancel payments
    if (!['manager', 'admin'].includes(session.user.role)) {
      return NextResponse.json({ 
        error: 'Forbidden - Only managers and admins can cancel payments' 
      }, { status: 403 });
    }

    const { Payment } = getModels();
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('id');

    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
    }

    // Update payment status to cancelled
    const payment = await Payment.findByIdAndUpdate(
      paymentId,
      { 
        status: 'cancelled',
        approvalStatus: 'rejected',
        rejectionReason: 'Payment cancelled by manager',
        cancelledBy: session.user.id,
        cancelledAt: new Date()
      },
      { new: true }
    );

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Add to approval history
    if (!payment.approvalHistory) {
      payment.approvalHistory = [];
    }
    
    payment.approvalHistory.push({
      action: 'cancelled',
      user: session.user.id,
      notes: `Payment cancelled by ${session.user.role}`,
      timestamp: new Date()
    });

    await payment.save();

    return NextResponse.json({
      success: true,
      message: 'Payment cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling payment:', error);
    return NextResponse.json({ 
      error: 'Failed to cancel payment',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}