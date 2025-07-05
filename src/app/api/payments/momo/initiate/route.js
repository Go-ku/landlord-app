// app/api/payments/momo/initiate/route.js - Enhanced with better security
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import momoService from 'lib/momo-api';
import dbConnect from 'lib/db';
import { Payment, Lease, User, Property, Notification } from 'models';
import { rateLimit } from 'lib/utils/rate-limit';

// Stricter rate limiting for MoMo payments
const momoLimiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 100, // Limit unique users
});

export async function POST(request) {
  try {
    // Apply rate limiting - max 3 MoMo requests per minute per user
    await momoLimiter.check(request, 3, 'MOMO_TOKEN');
    
    await dbConnect();
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || session.user.role !== 'tenant') {
      return NextResponse.json({
        error: 'Unauthorized. Only tenants can initiate MoMo payments.',
        code: 'AUTH_REQUIRED'
      }, { status: 401 });
    }

    const body = await request.json();
    const {
      leaseId,
      amount,
      phoneNumber,
      paymentType = 'rent',
      description = '',
      notes = ''
    } = body;

    // Enhanced validation
    const validationErrors = [];
    
    if (!leaseId) validationErrors.push('Lease ID is required');
    if (!amount || amount <= 0) validationErrors.push('Valid amount is required');
    if (!phoneNumber) validationErrors.push('Phone number is required');
    
    // Amount limits
    if (amount < 5) validationErrors.push('Minimum payment amount is ZMW 5');
    if (amount > 50000) validationErrors.push('Maximum payment amount is ZMW 50,000');
    
    if (validationErrors.length > 0) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationErrors,
        code: 'VALIDATION_ERROR'
      }, { status: 400 });
    }

    // Format and validate phone number
    const formattedPhone = momoService.formatPhoneNumber(phoneNumber);
    if (!momoService.validatePhoneNumber(formattedPhone)) {
      return NextResponse.json({
        error: 'Invalid MTN phone number. Use format: 097xxxxxxx or 076xxxxxxx',
        code: 'INVALID_PHONE'
      }, { status: 400 });
    }

    // Get lease with enhanced security check
    const lease = await Lease.findOne({
      _id: leaseId,
      tenantId: session.user.id, // Ensure tenant owns this lease
      status: { $in: ['signed', 'active'] }
    })
    .populate('tenantId', 'firstName lastName email phone')
    .populate('propertyId', 'address name landlord')
    .populate('landlordId', 'firstName lastName email');

    if (!lease) {
      return NextResponse.json({
        error: 'Lease not found or you do not have permission to make payments for this lease',
        code: 'LEASE_NOT_FOUND'
      }, { status: 404 });
    }

    // Check for recent pending payments to prevent duplicates
    const recentPending = await Payment.findOne({
      tenant: session.user.id,
      lease: leaseId,
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

    // Generate unique receipt number with better collision handling
    const receiptNumber = await generateUniqueReceiptNumber();

    // Create payment record with enhanced data
    const paymentData = {
      receiptNumber,
      amount: parseFloat(amount),
      expectedAmount: parseFloat(amount),
      currency: 'ZMW',
      paymentDate: new Date(),
      paymentMethod: 'mobile_money',
      paymentType: paymentType,
      
      // Relationships
      tenant: lease.tenantId._id,
      tenantId: lease.tenantId._id,
      property: lease.propertyId._id,
      propertyId: lease.propertyId._id,
      lease: leaseId,
      leaseId: leaseId,
      landlordId: lease.landlordId?._id || lease.propertyId?.landlord,
      
      // Status
      status: 'pending',
      approvalStatus: 'pending',
      
      // Details
      description: description || `${paymentType} payment via MTN MoMo`,
      notes: notes,
      
      // MoMo specific details
      transactionDetails: {
        transactionDate: new Date(),
        mobileMoneyNumber: formattedPhone,
        provider: 'MTN',
        notes: 'MTN Mobile Money payment'
      },
      
      // Audit
      recordedBy: lease.tenantId._id,
      createdBy: lease.tenantId._id,
      
      // Payment period
      paymentPeriod: {
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
      },
      
      // Security metadata
      metadata: {
        userAgent: request.headers.get('user-agent'),
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        sessionId: session.user.id
      }
    };

    const payment = new Payment(paymentData);
    await payment.save();

    // Prepare MoMo payment request with enhanced security
    const momoPaymentData = {
      amount: parseFloat(amount),
      phoneNumber: formattedPhone,
      externalId: payment._id.toString(),
      payerMessage: `Rent payment for ${lease.propertyId.address}`.substring(0, 160), // MTN limit
      payeeNote: `Payment from ${lease.tenantId.firstName} ${lease.tenantId.lastName}`.substring(0, 160)
    };

    // Request payment from MoMo with timeout
    const momoResult = await Promise.race([
      momoService.requestToPay(momoPaymentData),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('MoMo request timeout')), 30000)
      )
    ]);

    if (!momoResult.success) {
      // Update payment status to failed
      payment.status = 'failed';
      payment.approvalStatus = 'rejected';
      payment.rejectionReason = `MoMo initiation failed: ${momoResult.error}`;
      payment.failureDetails = {
        error: momoResult.error,
        timestamp: new Date(),
        step: 'initiation'
      };
      await payment.save();

      return NextResponse.json({
        error: 'Failed to initiate MoMo payment',
        details: momoResult.error,
        code: 'MOMO_INITIATION_FAILED',
        paymentId: payment._id
      }, { status: 400 });
    }

    // Update payment with MoMo reference
    payment.referenceNumber = momoResult.referenceId;
    payment.transactionDetails.transactionId = momoResult.referenceId;
    payment.transactionDetails.confirmationCode = momoResult.referenceId;
    payment.transactionDetails.momoRequestId = momoResult.requestId; // If available
    await payment.save();
    console.log('From intiiate api',payment.referenceNumber)
    // Create notification asynchronously
    if (lease.landlordId || lease.propertyId?.landlord) {
      Notification.create({
        recipient: lease.landlordId?._id || lease.propertyId?.landlord,
        sender: lease.tenantId._id,
        type: 'payment_submitted',
        title: 'MoMo Payment Initiated',
        message: `${lease.tenantId.firstName} ${lease.tenantId.lastName} has initiated a ${paymentData.currency} ${paymentData.amount.toLocaleString()} payment via MTN MoMo.`,
        relatedDocument: payment._id,
        relatedDocumentModel: 'Payment',
        actionRequired: false,
        priority: 'medium'
      }).catch(err => console.error('Failed to create notification:', err));
    }

    return NextResponse.json({
      success: true,
      message: 'MoMo payment initiated successfully',
      data: {
        paymentId: payment._id,
        receiptNumber: payment.receiptNumber,
        momoReferenceId: momoResult.referenceId,
        amount: paymentData.amount,
        currency: paymentData.currency,
        phoneNumber: formattedPhone,
        status: payment.status,
        tenant: {
          name: `${lease.tenantId.firstName} ${lease.tenantId.lastName}`,
          email: lease.tenantId.email
        },
        property: {
          address: lease.propertyId.address,
          name: lease.propertyId.name
        },
        expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes timeout
      }
    });

  } catch (error) {
    console.error('Error in MoMo payment initiation:', error);
    
    if (error.message === 'Rate limit exceeded') {
      return NextResponse.json({
        error: 'Too many payment requests. Please wait before trying again.',
        code: 'RATE_LIMITED'
      }, { status: 429 });
    }

    return NextResponse.json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Payment processing failed',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

// Enhanced receipt number generation
async function generateUniqueReceiptNumber() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
    const receiptNumber = `PAY-${year}${month}${day}-${random}`;

    const existing = await Payment.findOne({ receiptNumber }).lean();
    if (!existing) {
      return receiptNumber;
    }
  }
  
  throw new Error('Could not generate unique receipt number');
}

