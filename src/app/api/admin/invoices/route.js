// app/api/admin/invoices/route.js
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { NextResponse } from 'next/server';
import dbConnect from 'lib/db';
import Invoice from 'models/Invoice';
import User from 'models/User';
import Property from 'models/Property';

// GET /api/admin/invoices - List invoices with filtering
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!await checkAdminPermission(session, 'manage_invoices')) {
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
    const tenantId = searchParams.get('tenant');
    const propertyId = searchParams.get('property');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const overdue = searchParams.get('overdue') === 'true';

    // Build filter query
    const filter = {};
    
    if (status) filter.status = status;
    if (tenantId) filter.tenant = tenantId;
    if (propertyId) filter.property = propertyId;
    if (overdue) filter.isOverdue = true;
    
    if (startDate || endDate) {
      filter.issueDate = {};
      if (startDate) filter.issueDate.$gte = new Date(startDate);
      if (endDate) filter.issueDate.$lte = new Date(endDate);
    }

    // Get invoices with populated references
    const [invoices, totalCount] = await Promise.all([
      Invoice.find(filter)
        .populate('tenant', 'name email phone')
        .populate('property', 'address type')
        .populate('createdBy', 'name')
        .populate('payments')
        .sort({ issueDate: -1 })
        .skip(skip)
        .limit(limit),
      
      Invoice.countDocuments(filter)
    ]);

    // Get summary statistics
    const stats = await Invoice.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$totalAmount' },
          totalPaid: { $sum: '$amountPaid' },
          totalDue: { $sum: '$amountDue' },
          count: { $sum: 1 }
        }
      }
    ]);

    return NextResponse.json({
      success: true,
      data: {
        invoices,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1
        },
        stats: stats[0] || { 
          totalAmount: 0, 
          totalPaid: 0, 
          totalDue: 0, 
          count: 0 
        }
      }
    });

  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch invoices',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

// POST /api/admin/invoices - Create new invoice
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!await checkAdminPermission(session, 'manage_invoices')) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized - Admin permissions required'
      }, { status: 403 });
    }

    await dbConnect();

    const data = await request.json();
    const {
      tenant,
      property,
      items,
      dueDate,
      periodStart,
      periodEnd,
      taxRate,
      discountAmount,
      notes
    } = data;

    // Validation
    if (!tenant || !property || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: tenant, property, items'
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

    // Process and validate items
    const processedItems = items.map(item => ({
      description: item.description,
      quantity: parseFloat(item.quantity) || 1,
      unitPrice: parseFloat(item.unitPrice),
      amount: parseFloat(item.quantity || 1) * parseFloat(item.unitPrice),
      itemType: item.itemType || 'rent'
    }));

    // Create invoice
    const invoice = await Invoice.create({
      tenant,
      property,
      items: processedItems,
      dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
      periodStart: periodStart ? new Date(periodStart) : undefined,
      periodEnd: periodEnd ? new Date(periodEnd) : undefined,
      taxRate: parseFloat(taxRate) || 0,
      discountAmount: parseFloat(discountAmount) || 0,
      notes: notes || undefined,
      createdBy: session.user.id,
      status: 'draft'
    });

    // Populate the created invoice
    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate('tenant', 'name email')
      .populate('property', 'address')
      .populate('createdBy', 'name');

    return NextResponse.json({
      success: true,
      data: populatedInvoice,
      message: 'Invoice created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create invoice',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

// Helper function to check admin permissions (shared)
async function checkAdminPermission(session, requiredPermission) {
  if (!session?.user?.id || session.user.role !== 'admin') {
    return false;
  }
  
  if (!session.user.permissions?.includes(requiredPermission)) {
    return false;
  }
  
  return true;
}