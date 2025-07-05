// app/api/payments/route.js - Enhanced with better error handling and validation
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import dbConnect from 'lib/db';
import mongoose from 'mongoose';
import Payment from 'models/Payment';
import User from 'models/User';
import Lease from 'models/Lease';
import Property from 'models/Property';
import Notification from 'models/Notification';
import { rateLimit } from 'lib/utils/rate-limit';

// Rate limiting configuration
const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500, // Allow up to 500 unique users per minute
});

// Helper function to get models safely
function getModels() {
  try {
    return {
      Payment: mongoose.model('Payment'),
      User: mongoose.model('User'),
      Property: mongoose.model('Property'),
      Lease: mongoose.model('Lease'),
      Notification: mongoose.model('Notification')
    };
  } catch (error) {
    console.error('Error getting models:', error);
    throw new Error('Database models not available');
  }
}

// Helper function for role-based filtering
async function buildPaymentFilter(session) {
  const { Property } = getModels();
  let filter = {};
  
  switch (session.user.role) {
    case 'tenant':
      filter.tenant = session.user.id;
      break;
      
    case 'landlord':
      const landlordProperties = await Property.find({ 
        landlord: session.user.id 
      }).select('_id').lean();
      const propertyIds = landlordProperties.map(p => p._id);
      filter.property = { $in: propertyIds };
      break;
      
    case 'admin':
    case 'manager':
      // Can see all payments - no additional filter
      break;
      
    default:
      throw new Error('Insufficient permissions');
  }
  
  return filter;
}

// GET - Fetch payments with enhanced filtering and security
export async function GET(request) {
  try {
    // Rate limiting
    await limiter.check(request, 10, 'CACHE_TOKEN'); // 10 requests per minute per IP
    
    await dbConnect();
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      }, { status: 401 });
    }

    const { Payment } = getModels();
    const { searchParams } = new URL(request.url);
    
    // Parse and validate query parameters
    const status = searchParams.get('status');
    const sortBy = searchParams.get('sortBy') || 'newest';
    const page = Math.max(1, parseInt(searchParams.get('page')) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit')) || 20)); // Max 100 items
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const minAmount = searchParams.get('minAmount');
    const maxAmount = searchParams.get('maxAmount');

    // Build role-based filter
    let filter = await buildPaymentFilter(session);

    // Add additional filters
    if (status && status !== 'all') {
      if (status === 'overdue') {
        filter.dueDate = { $lt: new Date() };
        filter.status = { $nin: ['completed', 'verified'] };
      } else {
        filter.status = status;
      }
    }

    // Date range filter
    if (dateFrom || dateTo) {
      filter.paymentDate = {};
      if (dateFrom) filter.paymentDate.$gte = new Date(dateFrom);
      if (dateTo) filter.paymentDate.$lte = new Date(dateTo);
    }

    // Amount range filter
    if (minAmount || maxAmount) {
      filter.amount = {};
      if (minAmount) filter.amount.$gte = parseFloat(minAmount);
      if (maxAmount) filter.amount.$lte = parseFloat(maxAmount);
    }

    // Build sort
    const sortOptions = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      amount_high: { amount: -1 },
      amount_low: { amount: 1 },
      date_recent: { paymentDate: -1 },
      date_old: { paymentDate: 1 }
    };
    const sort = sortOptions[sortBy] || { createdAt: -1 };

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute queries in parallel for better performance
    const [payments, totalCount, statusCounts] = await Promise.all([
      Payment.find(filter)
        .populate('tenant', 'name email firstName lastName')
        .populate('property', 'address type name city')
        .populate('lease', 'monthlyRent status')
        .populate('recordedBy', 'name email firstName lastName')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      
      Payment.countDocuments(filter),
      
      // Get status distribution for the current filter
      Payment.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    // Transform payments for backward compatibility
    const populatedPayments = payments.map(payment => ({
      ...payment,
      tenantId: payment.tenant,
      propertyId: payment.property,
      formattedAmount: `ZMW ${payment.amount?.toLocaleString() || '0.00'}`
    }));

    const totalPages = Math.ceil(totalCount / limit);
    const statusCountsMap = statusCounts.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      data: populatedPayments,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      filters: {
        statusCounts: statusCountsMap,
        appliedFilters: {
          status: status || 'all',
          dateFrom,
          dateTo,
          minAmount,
          maxAmount
        }
      }
    });

  } catch (error) {
    console.error('Error fetching payments:', error);
    
    if (error.message === 'Rate limit exceeded') {
      return NextResponse.json({ 
        error: 'Too many requests. Please try again later.',
        code: 'RATE_LIMITED'
      }, { status: 429 });
    }

    return NextResponse.json({ 
      error: 'Failed to fetch payments',
      code: 'FETCH_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

// POST - Create payment with enhanced validation
export async function POST(request) {
  try {
    // Rate limiting for POST requests (stricter)
    await limiter.check(request, 5, 'CACHE_TOKEN'); // 5 payments per minute per IP
    
    await dbConnect();
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      }, { status: 401 });
    }

    // Role-based access control
    const allowedRoles = ['manager', 'landlord', 'admin'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions. Only managers, landlords, and admins can record payments directly.',
        code: 'INSUFFICIENT_PERMISSIONS'
      }, { status: 403 });
    }

    const { Payment, User, Property, Lease, Notification } = getModels();

    // Parse request body with validation
    let paymentData;
    const contentType = request.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      const body = await request.json();
      paymentData = await validateAndTransformPaymentData(body, session);
    } else if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData();
      paymentData = await validateAndTransformFormData(formData, session);
    } else {
      return NextResponse.json({ 
        error: 'Unsupported content type',
        code: 'INVALID_CONTENT_TYPE'
      }, { status: 400 });
    }

    // Verify relationships exist and user has permission
    const [tenant, property, lease] = await Promise.all([
      User.findById(paymentData.tenant),
      Property.findById(paymentData.property),
      paymentData.lease ? Lease.findById(paymentData.lease) : null
    ]);

    if (!tenant || tenant.role !== 'tenant') {
      return NextResponse.json({ 
        error: 'Valid tenant not found',
        code: 'TENANT_NOT_FOUND'
      }, { status: 404 });
    }

    if (!property) {
      return NextResponse.json({ 
        error: 'Property not found',
        code: 'PROPERTY_NOT_FOUND'
      }, { status: 404 });
    }

    // For landlords, verify they own the property
    if (session.user.role === 'landlord' && property.landlord.toString() !== session.user.id) {
      return NextResponse.json({ 
        error: 'You can only record payments for your own properties',
        code: 'PROPERTY_ACCESS_DENIED'
      }, { status: 403 });
    }

    // Check for duplicate payments
    const duplicateCheck = await Payment.findOne({
      tenant: paymentData.tenant,
      amount: paymentData.amount,
      paymentDate: paymentData.paymentDate,
      referenceNumber: paymentData.referenceNumber,
      status: { $nin: ['cancelled', 'failed'] }
    });

    if (duplicateCheck) {
      return NextResponse.json({ 
        error: 'Duplicate payment detected',
        code: 'DUPLICATE_PAYMENT',
        existingPaymentId: duplicateCheck._id
      }, { status: 409 });
    }

    // Create the payment with transaction
    const session_db = await mongoose.startSession();
    let payment;
    
    try {
      await session_db.withTransaction(async () => {
        payment = new Payment(paymentData);
        await payment.save({ session: session_db });

        // Create notification for tenant
        await Notification.create([{
          recipient: tenant._id,
          sender: session.user.id,
          type: 'payment_submitted',
          title: 'Payment Recorded',
          message: `A payment of ZMW ${payment.amount.toLocaleString()} has been recorded for your account.`,
          relatedDocument: payment._id,
          relatedDocumentModel: 'Payment',
          priority: 'medium'
        }], { session: session_db });

        // Update lease balance if applicable
        if (lease && payment.status === 'completed') {
          await updateLeaseBalance(lease, payment.amount, session_db);
        }
      });
    } finally {
      await session_db.endSession();
    }

    // Populate the created payment
    const populatedPayment = await Payment.findById(payment._id)
      .populate('tenant', 'name email firstName lastName')
      .populate('property', 'address type name city')
      .populate('lease', 'monthlyRent status')
      .populate('recordedBy', 'name email firstName lastName');

    return NextResponse.json({
      success: true,
      data: populatedPayment,
      message: 'Payment recorded successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating payment:', error);
    
    if (error.message === 'Rate limit exceeded') {
      return NextResponse.json({ 
        error: 'Too many payment requests. Please try again later.',
        code: 'RATE_LIMITED'
      }, { status: 429 });
    }

    return NextResponse.json({ 
      error: 'Failed to record payment',
      code: 'CREATE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

// Helper function to validate and transform payment data
async function validateAndTransformPaymentData(body, session) {
  const errors = [];

  // Required field validation
  if (!body.amount || parseFloat(body.amount) <= 0) {
    errors.push('Valid payment amount is required');
  }

  if (!body.tenant && !body.tenantId) {
    errors.push('Tenant is required');
  }

  if (!body.property && !body.propertyId) {
    errors.push('Property is required');
  }

  if (!body.paymentMethod) {
    errors.push('Payment method is required');
  }

  if (!body.referenceNumber?.trim()) {
    errors.push('Payment reference is required');
  }

  if (!body.paymentDate) {
    errors.push('Payment date is required');
  }

  // Amount validation
  const amount = parseFloat(body.amount);
  if (amount > 1000000) { // ZMW 1 million limit
    errors.push('Payment amount exceeds maximum limit');
  }

  // Date validation
  const paymentDate = new Date(body.paymentDate);
  if (isNaN(paymentDate.getTime())) {
    errors.push('Invalid payment date');
  }

  if (paymentDate > new Date()) {
    errors.push('Payment date cannot be in the future');
  }

  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }

  return {
    amount: amount,
    paymentDate: paymentDate,
    paymentMethod: body.paymentMethod,
    referenceNumber: body.referenceNumber.trim(),
    description: body.description?.trim() || '',
    paymentType: body.paymentType || 'rent',
    
    // Relationships
    tenant: body.tenant || body.tenantId,
    property: body.property || body.propertyId,
    lease: body.lease || body.leaseId || null,
    
    // Status and approval
    status: body.status || 'pending',
    approvalStatus: session.user.role === 'admin' ? 'approved' : 'pending',
    approvedBy: session.user.role === 'admin' ? session.user.id : null,
    approvedAt: session.user.role === 'admin' ? new Date() : null,
    
    // Audit fields
    recordedBy: session.user.id,
    createdBy: session.user.id,
    
    // Approval history
    approvalHistory: [{
      action: 'created',
      user: session.user.id,
      notes: `Payment recorded by ${session.user.role}`,
      timestamp: new Date()
    }]
  };
}

// Helper function to update lease balance
async function updateLeaseBalance(lease, paymentAmount, session) {
  lease.totalPaid = (lease.totalPaid || 0) + paymentAmount;
  lease.balanceDue = Math.max(0, (lease.balanceDue || 0) - paymentAmount);
  lease.lastPaymentDate = new Date();
  
  // Update next payment due if this covers monthly rent
  if (paymentAmount >= lease.monthlyRent && lease.status === 'active') {
    const nextDue = new Date(lease.nextPaymentDue || lease.startDate);
    nextDue.setMonth(nextDue.getMonth() + Math.floor(paymentAmount / lease.monthlyRent));
    lease.nextPaymentDue = nextDue;
  }
  
  await lease.save({ session });
}

