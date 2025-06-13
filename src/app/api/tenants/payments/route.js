// app/api/tenant/payments/route.js
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

// GET - Fetch tenant's payments
export async function GET(request) {
  try {
    const token = await getUserFromToken(request);
    
    if (!token?.id) {
      return Response.json({ error: 'Unauthorized - No valid session' }, { status: 401 });
    }

    // Only allow tenants
    if (token.role !== 'tenant') {
      return Response.json({ error: 'Forbidden - Tenant access only' }, { status: 403 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const sortBy = searchParams.get('sortBy') || 'newest';

    // Build filter for tenant's payments only
    const filter = { tenant: token.id };
    
    if (status && status !== 'all') {
      if (status === 'overdue') {
        // Get overdue payments
        filter.dueDate = { $lt: new Date() };
        filter.status = { $nin: ['completed', 'paid'] };
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
      case 'due_date':
        sort = { dueDate: 1 };
        break;
      default:
        sort = { createdAt: -1 };
    }

    // Fetch payments
    const payments = await Payment.find(filter)
      .populate('property', 'address type')
      .populate('lease', 'monthlyRent')
      .sort(sort)
      .lean();

    // Add helper flags for each payment
    const currentDate = new Date();
    const paymentsWithFlags = payments.map(payment => ({
      ...payment,
      isUpcoming: payment.dueDate && payment.dueDate > currentDate && (payment.status === 'pending' || payment.status === 'upcoming'),
      isOverdue: payment.dueDate && payment.dueDate < currentDate && payment.status !== 'completed' && payment.status !== 'paid',
      daysPastDue: payment.dueDate && payment.dueDate < currentDate 
        ? Math.floor((currentDate - new Date(payment.dueDate)) / (1000 * 60 * 60 * 24))
        : 0
    }));

    // Calculate statistics
    const stats = {
      totalPaid: payments
        .filter(p => p.status === 'completed' || p.status === 'paid')
        .reduce((sum, p) => sum + (p.amount || 0), 0),
      totalPending: payments
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + (p.amount || 0), 0),
      totalOverdue: paymentsWithFlags
        .filter(p => p.isOverdue)
        .reduce((sum, p) => sum + (p.amount || 0), 0),
      paymentsCount: payments.length
    };

    return Response.json({
      success: true,
      data: {
        payments: paymentsWithFlags,
        stats
      }
    });

  } catch (error) {
    console.error('Error fetching tenant payments:', error);
    return Response.json({ 
      error: 'Failed to fetch payments',
      details: error.message 
    }, { status: 500 });
  }
}

// POST - Create new payment (tenant submitting payment)
export async function POST(request) {
  try {
    const token = await getUserFromToken(request);
    
    if (!token?.id) {
      return Response.json({ error: 'Unauthorized - No valid session' }, { status: 401 });
    }

    // Only allow tenants
    if (token.role !== 'tenant') {
      return Response.json({ error: 'Forbidden - Tenant access only' }, { status: 403 });
    }

    await dbConnect();

    // Get the tenant's data
    const tenant = await User.findById(token.id)
      .populate('currentProperty')
      .populate('currentLease');

    if (!tenant) {
      return Response.json({ error: 'Tenant not found' }, { status: 404 });
    }

    if (!tenant.currentProperty) {
      return Response.json({ error: 'No property assigned to tenant' }, { status: 400 });
    }

    // Parse form data
    const formData = await request.formData();
    
    const paymentData = {
      amount: parseFloat(formData.get('amount')),
      paymentType: formData.get('paymentType') || 'rent',
      paymentMethod: formData.get('paymentMethod'),
      reference: formData.get('reference'),
      description: formData.get('description') || '',
      paymentDate: new Date(), // Current date
      
      // Relationships
      tenant: token.id,
      property: tenant.currentProperty._id,
      lease: tenant.currentLease?._id || null,
      
      // Status
      status: 'pending', // Tenant payments start as pending
      approvalStatus: 'pending',
      
      // Record who submitted this
      recordedBy: token.id
    };

    // Validate required fields
    if (!paymentData.amount || paymentData.amount <= 0) {
      return Response.json({ error: 'Valid payment amount is required' }, { status: 400 });
    }

    if (!paymentData.paymentMethod) {
      return Response.json({ error: 'Payment method is required' }, { status: 400 });
    }

    if (!paymentData.reference?.trim()) {
      return Response.json({ error: 'Payment reference is required' }, { status: 400 });
    }

    // Handle file upload if present
    const receiptFile = formData.get('receiptFile');
    if (receiptFile && receiptFile.size > 0) {
      // TODO: Implement file upload to cloud storage (AWS S3, Cloudinary, etc.)
      // For now, we'll just note that a receipt was uploaded
      paymentData.receiptUrl = `/uploads/receipts/${Date.now()}-${receiptFile.name}`;
      paymentData.notes = `${paymentData.notes || ''} Receipt uploaded: ${receiptFile.name}`.trim();
    }

    // Create the payment
    const payment = new Payment(paymentData);
    
    // Add to approval history
    payment.approvalHistory.push({
      action: 'submitted',
      user: token.id,
      notes: 'Payment submitted by tenant'
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
      message: 'Payment submitted successfully. It will be reviewed by management.'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating tenant payment:', error);
    return Response.json({ 
      error: 'Failed to submit payment',
      details: error.message 
    }, { status: 500 });
  }
}

// ========================================
