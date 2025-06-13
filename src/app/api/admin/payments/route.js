// app/api/admin/payments/route.js
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { NextResponse } from 'next/server';
import dbConnect from 'lib/db';
import Payment from 'models/Payment';
import Invoice from 'models/Invoice';
import User from 'models/User';
import Property from 'models/Property';

// Helper function to check admin permissions
async function checkAdminPermission(session, requiredPermission) {
  if (!session?.user?.id || session.user.role !== 'admin') {
    return false;
  }
  
  if (!session.user.permissions?.includes(requiredPermission)) {
    return false;
  }
  
  return true;
}

// GET /api/admin/payments - List payments with filtering
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!await checkAdminPermission(session, 'manage_payments')) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized - Admin permissions required'
      }, { status: 403 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const skip = (page - 1) * limit;
    
    // Filtering options
    const status = searchParams.get('status');
    const paymentType = searchParams.get('type');
    const tenantId = searchParams.get('tenant');
    const propertyId = searchParams.get('property');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build filter query
    const filter = {};
    
    if (status) filter.status = status;
    if (paymentType) filter.paymentType = paymentType;
    if (tenantId) filter.tenant = tenantId;
    if (propertyId) filter.property = propertyId;
    
    if (startDate || endDate) {
      filter.paymentDate = {};
      if (startDate) filter.paymentDate.$gte = new Date(startDate);
      if (endDate) filter.paymentDate.$lte = new Date(endDate);
    }

    // Get payments with populated references
    const [payments, totalCount] = await Promise.all([
      Payment.find(filter)
        .populate('tenant', 'name email phone')
        .populate('property', 'address type')
        .populate('recordedBy', 'name')
        .sort({ paymentDate: -1 })
        .skip(skip)
        .limit(limit),
      
      Payment.countDocuments(filter)
    ]);

    // Get summary statistics
    const stats = await Payment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          averageAmount: { $avg: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    return NextResponse.json({
      success: true,
      data: {
        payments,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1
        },
        stats: stats[0] || { totalAmount: 0, averageAmount: 0, count: 0 }
      }
    });

  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch payments',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

// POST /api/admin/payments - Create new payment
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!await checkAdminPermission(session, 'manage_payments')) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized - Admin permissions required'
      }, { status: 403 });
    }

    await dbConnect();

    const data = await request.json();
    const {
      amount,
      tenant,
      property,
      paymentType,
      paymentMethod,
      paymentDate,
      paymentReference,
      description,
      notes,
      periodStart,
      periodEnd,
      invoiceId
    } = data;

    // Validation
    if (!amount || !tenant || !property || !paymentType || !paymentMethod) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: amount, tenant, property, paymentType, paymentMethod'
      }, { status: 400 });
    }

    // Verify tenant and property exist
    const [tenantExists, propertyExists] = await Promise.all([
      User.findById(tenant),
      Property.findById(property)
    ]);

    if (!tenantExists || tenantExists.role !== 'tenant') {
      return NextResponse.json({
        success: false,
        error: 'Invalid tenant ID'
      }, { status: 400 });
    }

    if (!propertyExists) {
      return NextResponse.json({
        success: false,
        error: 'Invalid property ID'
      }, { status: 400 });
    }

    // Create payment
    const payment = await Payment.create({
      amount: parseFloat(amount),
      tenant,
      property,
      paymentType,
      paymentMethod,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      paymentReference: paymentReference || undefined,
      description: description || undefined,
      notes: notes || undefined,
      periodStart: periodStart ? new Date(periodStart) : undefined,
      periodEnd: periodEnd ? new Date(periodEnd) : undefined,
      invoice: invoiceId || undefined,
      recordedBy: session.user.id,
      status: 'completed'
    });

    // If this payment is for an invoice, update the invoice
    if (invoiceId) {
      const invoice = await Invoice.findById(invoiceId);
      if (invoice) {
        invoice.addPayment(payment._id, payment.amount);
        await invoice.save();
      }
    }

    // Populate the created payment
    const populatedPayment = await Payment.findById(payment._id)
      .populate('tenant', 'name email')
      .populate('property', 'address')
      .populate('recordedBy', 'name');

    return NextResponse.json({
      success: true,
      data: populatedPayment,
      message: 'Payment recorded successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create payment',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

