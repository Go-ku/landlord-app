// src/app/api/invoices/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from 'lib/db';
import Invoice from 'models/Invoice';
import User from 'models/User';
import Property from 'models/Property';
import Lease from 'models/Lease';
import Notification from 'models/Notification';

// Helper function to create notification
async function createNotification(recipientId, senderId, type, message, relatedDocument = null, relatedDocumentModel = null) {
  try {
    const notification = new Notification({
      recipient: recipientId,
      sender: senderId,
      type,
      message,
      relatedDocument,
      relatedDocumentModel,
      actionRequired: type === 'payment'
    });
    
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    // Don't fail the main operation if notification fails
    return null;
  }
}

// GET - Fetch invoices with filtering (role-based)
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check permissions
    const allowedRoles = ['landlord', 'manager'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    
    // Build base query based on user role
    let baseQuery = {};
    
    if (session.user.role === 'landlord') {
      // Landlords can only see invoices for their properties
      const landlordProperties = await Property.find({ 
        landlord: session.user.id 
      }).select('_id').lean();
      
      baseQuery.propertyId = { 
        $in: landlordProperties.map(p => p._id) 
      };
    }
    // Managers can see all invoices (no additional filtering)
    
    // Apply search filters
    const query = { ...baseQuery };
    const sort = { createdAt: -1 };
    
    // Status filter
    if (searchParams.get('status')) {
      query.status = searchParams.get('status');
    }
    
    // Date range filter
    if (searchParams.get('dateFrom') || searchParams.get('dateTo')) {
      query.issueDate = {};
      if (searchParams.get('dateFrom')) {
        query.issueDate.$gte = new Date(searchParams.get('dateFrom'));
      }
      if (searchParams.get('dateTo')) {
        const toDate = new Date(searchParams.get('dateTo'));
        toDate.setHours(23, 59, 59, 999);
        query.issueDate.$lte = toDate;
      }
    }
    
    // Tenant filter
    if (searchParams.get('tenant')) {
      query.tenantId = searchParams.get('tenant');
    }

    // Pagination
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 50;
    const skip = (page - 1) * limit;

    // Fetch invoices
    let invoicesQuery = Invoice.find(query)
      .populate('tenantId', 'name firstName lastName email phone')
      .populate('propertyId', 'address name type bedrooms bathrooms')
      .populate('leaseId', 'monthlyRent startDate endDate')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    let invoices = await invoicesQuery;

    // Search filter (applied after population for tenant names)
    if (searchParams.get('search')) {
      const searchLower = searchParams.get('search').toLowerCase();
      invoices = invoices.filter(invoice => {
        const tenantName = invoice.tenantId?.name || 
          `${invoice.tenantId?.firstName || ''} ${invoice.tenantId?.lastName || ''}`.trim();
        const propertyAddress = invoice.propertyId?.address || '';
        
        return invoice.invoiceNumber.toLowerCase().includes(searchLower) ||
               tenantName.toLowerCase().includes(searchLower) ||
               propertyAddress.toLowerCase().includes(searchLower);
      });
    }

    // Update overdue status
    const currentDate = new Date();
    const overdueInvoices = invoices.filter(invoice => 
      invoice.status === 'sent' && new Date(invoice.dueDate) < currentDate
    );

    if (overdueInvoices.length > 0) {
      await Invoice.updateMany(
        { 
          _id: { $in: overdueInvoices.map(inv => inv._id) },
          status: 'sent',
          dueDate: { $lt: currentDate }
        },
        { status: 'overdue' }
      );

      // Update local data
      overdueInvoices.forEach(invoice => {
        invoice.status = 'overdue';
      });

      // Create overdue notifications for tenants
      for (const invoice of overdueInvoices) {
        if (invoice.tenantId?._id) {
          const tenantName = invoice.tenantId?.name || 
            `${invoice.tenantId?.firstName || ''} ${invoice.tenantId?.lastName || ''}`.trim();
          
          await createNotification(
            invoice.tenantId._id,
            session.user.id,
            'payment',
            `Your invoice ${invoice.invoiceNumber} is now overdue. Please make payment as soon as possible.`,
            invoice._id,
            'Invoice'
          );
        }
      }
    }

    // Get total count for pagination
    const totalCount = await Invoice.countDocuments(query);

    return NextResponse.json({
      invoices,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      },
      userRole: session.user.role
    });

  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}

// POST - Create new invoice
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check permissions
    const allowedRoles = ['landlord', 'manager'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    await dbConnect();
    
    const body = await request.json();
    
    // Validate required fields
    if (!body.tenantId || !body.propertyId || !body.dueDate) {
      return NextResponse.json(
        { error: 'Tenant ID, Property ID, and Due Date are required' },
        { status: 400 }
      );
    }

    // Verify tenant and property exist
    const [tenant, property] = await Promise.all([
      User.findOne({ _id: body.tenantId, role: 'tenant' }),
      Property.findById(body.propertyId)
    ]);

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    // Check if landlord owns the property (unless user is manager)
    if (session.user.role === 'landlord' && property.landlord.toString() !== session.user.id) {
      return NextResponse.json(
        { error: 'You can only create invoices for your own properties' },
        { status: 403 }
      );
    }

    // Find active lease if leaseId not provided
    let leaseId = body.leaseId;
    if (!leaseId) {
      const activeLease = await Lease.findOne({
        tenantId: body.tenantId,
        propertyId: body.propertyId,
        status: 'active'
      });
      leaseId = activeLease?._id;
    }

    // Calculate totals
    const items = body.items || [];
    const subtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
    const tax = items.reduce((sum, item) => sum + ((item.amount || 0) * (item.taxRate || 0) / 100), 0);
    const total = subtotal + tax;

    // Create invoice
    const invoiceData = {
      tenantId: body.tenantId,
      propertyId: body.propertyId,
      leaseId,
      issueDate: body.issueDate || new Date(),
      dueDate: new Date(body.dueDate),
      status: body.status || 'draft',
      items,
      subtotal,
      tax,
      total,
      balanceDue: total,
      notes: body.notes || ''
    };

    const invoice = new Invoice(invoiceData);
    await invoice.save();

    // Populate the created invoice
    await invoice.populate([
      { path: 'tenantId', select: 'name firstName lastName email phone' },
      { path: 'propertyId', select: 'address name type' },
      { path: 'leaseId', select: 'monthlyRent startDate endDate' }
    ]);

    // Create notification for tenant
    const tenantName = tenant.name || 
      `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim();
    
    let notificationMessage = '';
    
    if (invoice.status === 'sent') {
      notificationMessage = `New invoice ${invoice.invoiceNumber} has been sent to you. Amount: ${invoice.total.toLocaleString('en-ZM', { style: 'currency', currency: 'ZMW' })}. Due date: ${new Date(invoice.dueDate).toLocaleDateString()}.`;
    } else {
      notificationMessage = `A new invoice ${invoice.invoiceNumber} has been created for you. It will be sent once finalized.`;
    }

    await createNotification(
      body.tenantId,
      session.user.id,
      'payment',
      notificationMessage,
      invoice._id,
      'Invoice'
    );

    // If invoice is being sent immediately, also create a system notification for landlord
    if (invoice.status === 'sent') {
      await createNotification(
        session.user.id,
        null, // System notification
        'system',
        `Invoice ${invoice.invoiceNumber} has been sent to ${tenantName} successfully.`,
        invoice._id,
        'Invoice'
      );
    }

    return NextResponse.json({
      message: 'Invoice created successfully',
      invoice: invoice.toObject()
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating invoice:', error);
    
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    );
  }
}