// app/api/payments/route.js - Updated with role-based access
import { getToken } from 'next-auth/jwt';
import Payment from 'models/Payment';
import User from 'models/User';
import Property from 'models/Property';
import Lease from 'models/Lease';
import dbConnect from 'lib/db';

async function getUserFromToken(request) {
  try {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    });
    return token;
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
}

// GET - Fetch payments with role-based filtering
export async function GET(request) {
  try {
    const token = await getUserFromToken(request);
    
    if (!token?.id) {
      return Response.json({ error: 'Unauthorized - No valid session' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const sortBy = searchParams.get('sortBy') || 'newest';
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;

    // Role-based filtering
    let filter = {};
    
    if (token.role === 'tenant') {
      // Tenants can only see their own payments
      filter.tenant = token.id;
    } else if (token.role === 'landlord') {
      // Landlords can see payments for their properties
      const landlordProperties = await Property.find({ landlord: token.id }).select('_id');
      const propertyIds = landlordProperties.map(p => p._id);
      filter.property = { $in: propertyIds };
    } else if (!['manager', 'admin'].includes(token.role)) {
      // Other roles have no access
      return Response.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 });
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
        .populate('recordedBy', 'name email')
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

    return Response.json({
      success: true,
      payments: populatedPayments,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit
      }
    });

  } catch (error) {
    console.error('Error fetching payments:', error);
    return Response.json({ 
      error: 'Failed to fetch payments',
      details: error.message 
    }, { status: 500 });
  }
}

// POST - Create payment (for managers/landlords only)
export async function POST(request) {
  try {
    const token = await getUserFromToken(request);
    
    if (!token?.id) {
      return Response.json({ error: 'Unauthorized - No valid session' }, { status: 401 });
    }

    // Only managers and landlords can create payments via this endpoint
    // Tenants use the /api/tenant/payments endpoint
    if (!['manager', 'landlord'].includes(token.role)) {
      return Response.json({ 
        error: 'Forbidden - Only managers and landlords can record payments directly' 
      }, { status: 403 });
    }

    await dbConnect();

    // Parse form data
    const formData = await request.formData();
    
    const paymentData = {
      amount: parseFloat(formData.get('amount')),
      paymentDate: new Date(formData.get('paymentDate')),
      paymentMethod: formData.get('paymentMethod'),
      reference: formData.get('reference'),
      description: formData.get('description') || '',
      paymentType: formData.get('paymentType') || 'rent',
      
      // Get IDs from form
      tenant: formData.get('tenantId'),
      property: formData.get('propertyId'),
      lease: formData.get('leaseId') || null,
      
      // Status and approval
      status: formData.get('status') || 'verified', // Manager-created payments are typically verified
      approvalStatus: 'approved',
      approvedBy: token.id,
      approvedAt: new Date(),
      
      // Record who created this
      recordedBy: token.id
    };

    // Validate required fields
    if (!paymentData.amount || paymentData.amount <= 0) {
      return Response.json({ error: 'Valid payment amount is required' }, { status: 400 });
    }

    if (!paymentData.tenant) {
      return Response.json({ error: 'Tenant is required' }, { status: 400 });
    }

    if (!paymentData.property) {
      return Response.json({ error: 'Property is required' }, { status: 400 });
    }

    if (!paymentData.paymentMethod) {
      return Response.json({ error: 'Payment method is required' }, { status: 400 });
    }

    if (!paymentData.reference?.trim()) {
      return Response.json({ error: 'Payment reference is required' }, { status: 400 });
    }

    // Verify the tenant and property exist
    const [tenant, property] = await Promise.all([
      User.findById(paymentData.tenant),
      Property.findById(paymentData.property)
    ]);

    if (!tenant) {
      return Response.json({ error: 'Tenant not found' }, { status: 404 });
    }

    if (!property) {
      return Response.json({ error: 'Property not found' }, { status: 404 });
    }

    // For landlords, verify they own the property
    if (token.role === 'landlord' && property.landlord.toString() !== token.id) {
      return Response.json({ 
        error: 'You can only record payments for your own properties' 
      }, { status: 403 });
    }

    // Handle file upload if present
    const receiptFile = formData.get('receiptFile');
    if (receiptFile && receiptFile.size > 0) {
      // TODO: Implement file upload to cloud storage
      paymentData.receiptUrl = `/uploads/receipts/${Date.now()}-${receiptFile.name}`;
    }

    // Create the payment
    const payment = new Payment(paymentData);
    
    // Add to approval history
    payment.approvalHistory.push({
      action: 'approved',
      user: token.id,
      notes: `Payment recorded by ${token.role}`
    });

    await payment.save();

    // Populate the created payment
    const populatedPayment = await Payment.findById(payment._id)
      .populate('tenant', 'name email')
      .populate('property', 'address type')
      .populate('lease', 'monthlyRent');

    return Response.json({
      success: true,
      data: populatedPayment,
      message: 'Payment recorded successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating payment:', error);
    return Response.json({ 
      error: 'Failed to record payment',
      details: error.message 
    }, { status: 500 });
  }
}

// PUT - Update payment
export async function PUT(request) {
  try {
    const token = await getUserFromToken(request);
    
    if (!token?.id) {
      return Response.json({ error: 'Unauthorized - No valid session' }, { status: 401 });
    }

    // Only managers can update payments
    if (token.role !== 'manager') {
      return Response.json({ 
        error: 'Forbidden - Only managers can update payments' 
      }, { status: 403 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('id');

    if (!paymentId) {
      return Response.json({ error: 'Payment ID is required' }, { status: 400 });
    }

    // Parse form data
    const formData = await request.formData();
    
    const updateData = {
      amount: parseFloat(formData.get('amount')),
      paymentDate: new Date(formData.get('paymentDate')),
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

    // Update the payment
    const payment = await Payment.findByIdAndUpdate(
      paymentId,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('tenant', 'name email')
    .populate('property', 'address type')
    .populate('lease', 'monthlyRent');

    if (!payment) {
      return Response.json({ error: 'Payment not found' }, { status: 404 });
    }

    return Response.json({
      success: true,
      data: payment,
      message: 'Payment updated successfully'
    });

  } catch (error) {
    console.error('Error updating payment:', error);
    return Response.json({ 
      error: 'Failed to update payment',
      details: error.message 
    }, { status: 500 });
  }
}

// DELETE - Cancel payment
export async function DELETE(request) {
  try {
    const token = await getUserFromToken(request);
    
    if (!token?.id) {
      return Response.json({ error: 'Unauthorized - No valid session' }, { status: 401 });
    }

    // Only managers can cancel payments
    if (token.role !== 'manager') {
      return Response.json({ 
        error: 'Forbidden - Only managers can cancel payments' 
      }, { status: 403 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('id');

    if (!paymentId) {
      return Response.json({ error: 'Payment ID is required' }, { status: 400 });
    }

    // Update payment status to cancelled
    const payment = await Payment.findByIdAndUpdate(
      paymentId,
      { 
        status: 'cancelled',
        approvalStatus: 'rejected',
        rejectionReason: 'Payment cancelled by manager'
      },
      { new: true }
    );

    if (!payment) {
      return Response.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Add to approval history
    payment.approvalHistory.push({
      action: 'rejected',
      user: token.id,
      notes: 'Payment cancelled by manager'
    });

    await payment.save();

    return Response.json({
      success: true,
      message: 'Payment cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling payment:', error);
    return Response.json({ 
      error: 'Failed to cancel payment',
      details: error.message 
    }, { status: 500 });
  }
}