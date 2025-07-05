// app/api/payments/route.js - Enhanced with better error handling and validation
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import dbConnect from 'lib/db';
import mongoose from 'mongoose';
import Payment from 'models/Payment';
import User from 'models/User';
import Lease from 'models/Lease';
import Property from 'models/Property';
import Notification from 'models/Notification';
import { rateLimit } from 'lib/rate-limit';

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

// POST - Create payment with enhanced validation (supports tenant mobile money payments)
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

    const { Payment, User, Property, Lease, Notification } = getModels();

    // Parse request body
    const body = await request.json();
    const { paymentMethod } = body;

    // Check if this is a tenant mobile money payment
    const isTenantMoMoPayment = session.user.role === 'tenant' && paymentMethod === 'mobile_money';

    // Role-based access control
    if (!isTenantMoMoPayment) {
      const allowedRoles = ['manager', 'landlord', 'admin'];
      if (!allowedRoles.includes(session.user.role)) {
        return NextResponse.json({ 
          error: 'Insufficient permissions. Only managers, landlords, and admins can record payments directly.',
          code: 'INSUFFICIENT_PERMISSIONS'
        }, { status: 403 });
      }
    }

    // Validate and transform payment data based on user role
    let paymentData;
    if (isTenantMoMoPayment) {
      paymentData = await validateAndTransformTenantMoMoData(body, session);
      
      // For tenant payments, we need to get lease details first
      const lease = await Lease.findOne({
        _id: paymentData.lease,
        tenantId: session.user.id,
        status: { $in: ['signed', 'active'] }
      }).populate('propertyId landlordId');
      
      if (!lease) {
        return NextResponse.json({ 
          error: 'Lease not found or you do not have permission to make payments for this lease',
          code: 'LEASE_NOT_FOUND'
        }, { status: 404 });
      }
      
      // Update payment data with lease information
      paymentData.property = lease.propertyId._id;
      paymentData.propertyId = lease.propertyId._id;
      paymentData.landlordId = lease.landlordId?._id || lease.propertyId?.landlord;
      
    } else {
      paymentData = await validateAndTransformPaymentData(body, session);
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

    // Additional validation for tenant payments
    if (isTenantMoMoPayment) {
      // Verify tenant owns the lease
      if (!lease || lease.tenantId.toString() !== session.user.id) {
        return NextResponse.json({ 
          error: 'You can only make payments for your own lease',
          code: 'LEASE_ACCESS_DENIED'
        }, { status: 403 });
      }

      // Check for recent pending MoMo payments to prevent duplicates
      const recentPending = await Payment.findOne({
        tenant: session.user.id,
        lease: paymentData.lease,
        status: 'pending',
        paymentMethod: 'mobile_money',
        createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
      });

      if (recentPending) {
        return NextResponse.json({
          error: 'You have a pending MoMo payment. Please wait for it to complete or try again in 5 minutes.',
          code: 'PENDING_PAYMENT_EXISTS',
          existingPaymentId: recentPending._id
        }, { status: 409 });
      }
    } else {
      // For landlords, verify they own the property
      if (session.user.role === 'landlord' && property.landlord.toString() !== session.user.id) {
        return NextResponse.json({ 
          error: 'You can only record payments for your own properties',
          code: 'PROPERTY_ACCESS_DENIED'
        }, { status: 403 });
      }

      // Check for duplicate payments (non-MoMo)
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
    }

    // Create the payment with transaction
    const session_db = await mongoose.startSession();
    let payment;
    
    try {
      await session_db.withTransaction(async () => {
        payment = new Payment(paymentData);
        await payment.save({ session: session_db });

        // Create appropriate notifications
        if (isTenantMoMoPayment) {
          // Notify landlord about tenant's payment initiation
          if (lease.landlordId) {
            await Notification.create([{
              recipient: lease.landlordId,
              sender: session.user.id,
              type: 'payment_submitted',
              title: 'MoMo Payment Initiated',
              message: `${tenant.name || tenant.firstName + ' ' + tenant.lastName} has initiated a payment of ZMW ${payment.amount.toLocaleString()} via MTN Mobile Money.`,
              relatedDocument: payment._id,
              relatedDocumentModel: 'Payment',
              priority: 'medium'
            }], { session: session_db });
          }
        } else {
          // Notify tenant about recorded payment
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
        }

        // Update lease balance if payment is completed
        if (lease && (payment.status === 'completed' || payment.status === 'verified')) {
          await updateLeaseBalance(lease, payment.amount, session_db);
        }

        // Handle first payment activation for tenants
        if (isTenantMoMoPayment && paymentData.paymentType === 'first_payment' && lease.status === 'signed') {
          // This will be updated when the MoMo payment is confirmed
          payment.isFirstPayment = true;
        }
      });
    } finally {
      await session_db.endSession();
    }

    // For tenant MoMo payments, initiate MoMo transaction
    if (isTenantMoMoPayment && paymentData.momoPhoneNumber) {
      try {
        const momoResult = await initiateMoMoPayment(payment, paymentData.momoPhoneNumber, lease);
        
        if (momoResult.success) {
          // Update payment with MoMo reference
          payment.referenceNumber = momoResult.referenceId;
          payment.transactionDetails = {
            ...payment.transactionDetails,
            transactionId: momoResult.referenceId,
            confirmationCode: momoResult.referenceId,
            momoRequestId: momoResult.requestId
          };
          await payment.save();
          
          // Return success response with MoMo reference
          return NextResponse.json({
            success: true,
            payment: {
              id: payment._id,
              amount: payment.amount,
              status: payment.status,
              referenceNumber: payment.referenceNumber,
              paymentMethod: payment.paymentMethod
            },
            momoData: {
              referenceId: momoResult.referenceId,
              phoneNumber: paymentData.momoPhoneNumber,
              expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
            },
            message: 'MoMo payment initiated successfully'
          });
          
        } else {
          // Update payment status to failed
          payment.status = 'failed';
          payment.approvalStatus = 'rejected';
          payment.rejectionReason = `MoMo initiation failed: ${momoResult.error}`;
          await payment.save();
          
          return NextResponse.json({
            error: 'Failed to initiate MoMo payment',
            details: momoResult.error,
            code: 'MOMO_INITIATION_FAILED',
            paymentId: payment._id
          }, { status: 400 });
        }
      } catch (momoError) {
        console.error('MoMo initiation error:', momoError);
        payment.status = 'failed';
        payment.rejectionReason = 'MoMo service error';
        await payment.save();
        
        return NextResponse.json({
          error: 'MoMo service temporarily unavailable',
          code: 'MOMO_SERVICE_ERROR',
          paymentId: payment._id
        }, { status: 503 });
      }
    }

    // Populate and return the created payment (for non-MoMo payments)
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

// Helper function to validate and transform payment data (for non-tenant payments)
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

// Helper function to validate and transform tenant mobile money data
async function validateAndTransformTenantMoMoData(body, session) {
  const errors = [];

  // Required field validation for tenant MoMo payments
  if (!body.leaseId) {
    errors.push('Lease ID is required');
  }

  if (!body.amount || parseFloat(body.amount) <= 0) {
    errors.push('Valid payment amount is required');
  }

  if (!body.momoPhoneNumber) {
    errors.push('MTN phone number is required');
  }

  if (!body.paymentType) {
    errors.push('Payment type is required');
  }

  // Amount validation
  const amount = parseFloat(body.amount);
  if (amount < 5) {
    errors.push('Minimum payment amount is ZMW 5');
  }
  if (amount > 50000) {
    errors.push('Maximum payment amount is ZMW 50,000');
  }

  // Phone number validation
  if (body.momoPhoneNumber && !validateMTNPhoneNumber(body.momoPhoneNumber)) {
    errors.push('Invalid MTN phone number format');
  }

  // Payment type validation
  const validPaymentTypes = ['first_payment', 'rent', 'partial', 'utilities', 'maintenance'];
  if (!validPaymentTypes.includes(body.paymentType)) {
    errors.push('Invalid payment type');
  }

  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }

  // Generate unique receipt number
  const receiptNumber = await generateUniqueReceiptNumber();

  return {
    receiptNumber,
    amount: amount,
    expectedAmount: amount,
    currency: 'ZMW',
    paymentDate: new Date(),
    paymentMethod: 'mobile_money',
    paymentType: body.paymentType,
    
    // Get lease details to populate tenant/property
    tenant: session.user.id,
    tenantId: session.user.id,
    lease: body.leaseId,
    leaseId: body.leaseId,
    
    // These will be populated after lease lookup
    property: null,
    propertyId: null,
    landlordId: null,
    
    // Status
    status: 'pending',
    approvalStatus: 'pending',
    
    // Details
    description: body.description || `${body.paymentType} payment via MTN MoMo`,
    notes: body.notes || 'MTN Mobile Money payment',
    
    // Mobile Money specific details
    transactionDetails: {
      transactionDate: new Date(),
      mobileMoneyNumber: body.momoPhoneNumber,
      provider: 'MTN',
      notes: 'MTN Mobile Money payment'
    },
    
    // Store phone number for MoMo initiation
    momoPhoneNumber: body.momoPhoneNumber,
    
    // Audit
    recordedBy: session.user.id,
    createdBy: session.user.id,
    
    // Payment period
    paymentPeriod: {
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear()
    },
    
    // Security metadata
    metadata: {
      userAgent: 'tenant-mobile-app', // You can get this from request headers
      ipAddress: 'tenant-ip', // You can get this from request headers
      sessionId: session.user.id
    }
  };
}

// Helper function to validate MTN phone numbers
function validateMTNPhoneNumber(phoneNumber) {
  console.log(phoneNumber)
    // Zambian phone number validation (260XXXXXXXXX or starting with +260)
    const zambianPhoneRegex = /^(\+260|260)?[79]\d{8}$/;
    return zambianPhoneRegex.test(phoneNumber);
}

// Helper function to generate unique receipt numbers
async function generateUniqueReceiptNumber() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
    const receiptNumber = `PAY-${year}${month}${day}-${random}`;

    const { Payment } = getModels();
    const existing = await Payment.findOne({ receiptNumber }).lean();
    if (!existing) {
      return receiptNumber;
    }
  }
  
  throw new Error('Could not generate unique receipt number');
}

// Helper function to initiate MoMo payment
async function initiateMoMoPayment(payment, phoneNumber, lease) {
  try {
    // Import MoMo service (you might need to adjust the import path)
    const momoService = require('lib/momo-api').default || require('lib/momo-api');
    
    // Format phone number
    const formattedPhone = momoService.formatPhoneNumber(phoneNumber);
    
    // Validate phone number
    if (!momoService.validatePhoneNumber(formattedPhone)) {
      return {
        success: false,
        error: 'Invalid phone number format'
      };
    }

    // Prepare MoMo payment data
    const momoPaymentData = {
      amount: payment.amount,
      phoneNumber: formattedPhone,
      externalId: payment._id.toString(),
      payerMessage: `Rent payment for ${lease.propertyId?.address || 'property'}`.substring(0, 160),
      payeeNote: `Payment from ${lease.tenantId?.firstName || 'tenant'}`.substring(0, 160)
    };

    // Request payment from MoMo
    const momoResult = await momoService.requestToPay(momoPaymentData);

    return momoResult;

  } catch (error) {
    console.error('Error initiating MoMo payment:', error);
    return {
      success: false,
      error: error.message || 'MoMo service error'
    };
  }
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
