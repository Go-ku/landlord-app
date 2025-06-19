// src/app/api/invoices/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from 'lib/db';
import Invoice  from 'models';
import User from 'models';
import Property from 'models';
import Lease from 'models';
import Notification from 'models';
import mongoose from 'mongoose';

// Helper function to get models
function getModels() {
  return {
    Invoice: mongoose.model('Invoice'),
    User: mongoose.model('User'),
    Property: mongoose.model('Property'),
    Lease: mongoose.model('Lease'),
    Notification: mongoose.model('Notification')
  };
}

// Helper function to create notification
async function createNotification(recipientId, senderId, type, message, relatedDocument = null, relatedDocumentModel = null) {
  try {
    const { Notification } = getModels();
    const notification = new Notification({
      recipient: recipientId,
      sender: senderId,
      type,
      message,
      relatedDocument,
      relatedDocumentModel,
      actionRequired: type === 'invoice_created' || type === 'payment_due'
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
    await dbConnect();
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { Invoice, Property } = getModels();
    const { searchParams } = new URL(request.url);
    
    // Build base query based on user role
    let baseQuery = {};
    
    if (session.user.role === 'tenant') {
      // Tenants can only see their own invoices
      baseQuery.tenant = session.user.id;
    } else if (session.user.role === 'landlord') {
      // Landlords can only see invoices for their properties
      const landlordProperties = await Property.find({ 
        landlord: session.user.id 
      }).select('_id').lean();
      
      baseQuery.property = { 
        $in: landlordProperties.map(p => p._id) 
      };
    }
    // Managers and admins can see all invoices (no additional filtering)
    
    // Apply search filters
    const query = { ...baseQuery };
    const sort = { createdAt: -1 };
    
    // Status filter
    if (searchParams.get('status')) {
      query.status = searchParams.get('status');
    }
    
    // Approval status filter
    if (searchParams.get('approvalStatus')) {
      query.approvalStatus = searchParams.get('approvalStatus');
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
    
    // Due date range filter
    if (searchParams.get('dueDateFrom') || searchParams.get('dueDateTo')) {
      query.dueDate = {};
      if (searchParams.get('dueDateFrom')) {
        query.dueDate.$gte = new Date(searchParams.get('dueDateFrom'));
      }
      if (searchParams.get('dueDateTo')) {
        const toDate = new Date(searchParams.get('dueDateTo'));
        toDate.setHours(23, 59, 59, 999);
        query.dueDate.$lte = toDate;
      }
    }
    
    // Tenant filter
    if (searchParams.get('tenant')) {
      query.tenant = searchParams.get('tenant');
    }

    // Property filter
    if (searchParams.get('property')) {
      query.property = searchParams.get('property');
    }

    // Outstanding invoices filter
    if (searchParams.get('outstanding') === 'true') {
      query.status = { $in: ['sent', 'viewed', 'overdue'] };
      query.paidAmount = { $lt: '$totalAmount' };
    }

    // Pagination
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 50;
    const skip = (page - 1) * limit;

    // Fetch invoices
    let invoicesQuery = Invoice.find(query)
      .populate('tenant', 'name firstName lastName email phone')
      .populate('property', 'address name type bedrooms bathrooms')
      .populate('lease', 'monthlyRent startDate endDate')
      .populate('createdBy', 'name firstName lastName email')
      .populate('approvedBy', 'name firstName lastName email')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    let invoices = await invoicesQuery;

    // Search filter (applied after population for tenant names)
    if (searchParams.get('search')) {
      const searchLower = searchParams.get('search').toLowerCase();
      invoices = invoices.filter(invoice => {
        const tenantName = invoice.tenant?.name || 
          `${invoice.tenant?.firstName || ''} ${invoice.tenant?.lastName || ''}`.trim();
        const propertyAddress = invoice.property?.address || '';
        
        return invoice.invoiceNumber.toLowerCase().includes(searchLower) ||
               tenantName.toLowerCase().includes(searchLower) ||
               propertyAddress.toLowerCase().includes(searchLower);
      });
    }

    // Update overdue status for invoices that are past due
    const currentDate = new Date();
    const overdueInvoices = invoices.filter(invoice => 
      ['sent', 'viewed'].includes(invoice.status) && 
      new Date(invoice.dueDate) < currentDate &&
      invoice.paidAmount < invoice.totalAmount
    );

    if (overdueInvoices.length > 0) {
      await Invoice.updateMany(
        { 
          _id: { $in: overdueInvoices.map(inv => inv._id) },
          status: { $in: ['sent', 'viewed'] },
          dueDate: { $lt: currentDate }
        },
        { status: 'overdue' }
      );

      // Update local data
      overdueInvoices.forEach(invoice => {
        invoice.status = 'overdue';
      });

      // Create overdue notifications for tenants (only once per invoice)
      for (const invoice of overdueInvoices) {
        if (invoice.tenant?._id) {
          const tenantName = invoice.tenant?.name || 
            `${invoice.tenant?.firstName || ''} ${invoice.tenant?.lastName || ''}`.trim();
          
          await createNotification(
            invoice.tenant._id,
            session.user.id,
            'payment_due',
            `Your invoice ${invoice.invoiceNumber} is now overdue. Please make payment as soon as possible.`,
            invoice._id,
            'Invoice'
          );
        }
      }
    }

    // Get total count for pagination
    const totalCount = await Invoice.countDocuments(query);

    // Calculate summary statistics
    const summaryStats = await Invoice.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: null,
          totalInvoices: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          totalPaid: { $sum: '$paidAmount' },
          totalOutstanding: { $sum: { $subtract: ['$totalAmount', '$paidAmount'] } },
          overdueCount: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ['$status', 'overdue'] },
                  { $lt: ['$paidAmount', '$totalAmount'] }
                ]},
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    return NextResponse.json({
      invoices,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1
      },
      summary: summaryStats[0] || {
        totalInvoices: 0,
        totalAmount: 0,
        totalPaid: 0,
        totalOutstanding: 0,
        overdueCount: 0
      },
      userRole: session.user.role
    });

  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

// POST - Create new invoice
export async function POST(request) {
  try {
    await dbConnect();
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check permissions
    const allowedRoles = ['landlord', 'manager', 'admin'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { Invoice, User, Property, Lease } = getModels();
    const body = await request.json();
    
    // Validate required fields
    if (!body.tenant || !body.property || !body.dueDate) {
      return NextResponse.json(
        { error: 'Tenant, Property, and Due Date are required' },
        { status: 400 }
      );
    }

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: 'At least one invoice item is required' },
        { status: 400 }
      );
    }

    // Validate invoice items
    for (const item of body.items) {
      if (!item.description || !item.unitPrice || item.unitPrice <= 0) {
        return NextResponse.json(
          { error: 'Each item must have a description and positive unit price' },
          { status: 400 }
        );
      }
      
      // Calculate amount if not provided
      if (!item.amount) {
        item.amount = (item.quantity || 1) * item.unitPrice;
      }
    }

    // Verify tenant and property exist
    const [tenant, property] = await Promise.all([
      User.findOne({ _id: body.tenant, role: 'tenant' }),
      Property.findById(body.property)
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

    // Check if landlord owns the property (unless user is manager/admin)
    if (session.user.role === 'landlord' && property.landlord.toString() !== session.user.id) {
      return NextResponse.json(
        { error: 'You can only create invoices for your own properties' },
        { status: 403 }
      );
    }

    // Find active lease if not provided
    let leaseId = body.lease;
    if (!leaseId) {
      const activeLease = await Lease.findOne({
        tenant: body.tenant,
        property: body.property,
        status: 'active'
      });
      leaseId = activeLease?._id;
    }

    // Calculate totals
    const items = body.items;
    const subtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
    const taxAmount = body.taxAmount || 0;
    const totalAmount = subtotal + taxAmount;

    // Create invoice data
    const invoiceData = {
      tenant: body.tenant,
      property: body.property,
      lease: leaseId,
      issueDate: body.issueDate ? new Date(body.issueDate) : new Date(),
      dueDate: new Date(body.dueDate),
      status: body.status || 'draft',
      approvalStatus: body.approvalStatus || 'pending',
      items,
      subtotal,
      taxAmount,
      totalAmount,
      paidAmount: 0,
      notes: body.notes || '',
      paymentTerms: body.paymentTerms || 'Net 30',
      createdBy: session.user.id
    };

    // If user is manager/admin, auto-approve
    if (['manager', 'admin'].includes(session.user.role)) {
      invoiceData.approvalStatus = 'approved';
      invoiceData.approvedBy = session.user.id;
      invoiceData.approvedAt = new Date();
      invoiceData.approvalNotes = 'Auto-approved by system administrator';
    }

    const invoice = new Invoice(invoiceData);
    
    // Add to approval history
    if (!invoice.approvalHistory) {
      invoice.approvalHistory = [];
    }
    
    invoice.approvalHistory.push({
      action: 'submitted',
      user: session.user.id,
      notes: `Invoice created by ${session.user.role}`,
      timestamp: new Date()
    });

    if (invoiceData.approvalStatus === 'approved') {
      invoice.approvalHistory.push({
        action: 'approved',
        user: session.user.id,
        notes: invoiceData.approvalNotes,
        timestamp: new Date()
      });
    }

    await invoice.save();

    // Populate the created invoice
    await invoice.populate([
      { path: 'tenant', select: 'name firstName lastName email phone' },
      { path: 'property', select: 'address name type' },
      { path: 'lease', select: 'monthlyRent startDate endDate' },
      { path: 'createdBy', select: 'name firstName lastName email' },
      { path: 'approvedBy', select: 'name firstName lastName email' }
    ]);

    // Create notification for tenant
    const tenantName = tenant.name || 
      `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim();
    
    let notificationMessage = '';
    
    if (invoice.status === 'sent' && invoice.approvalStatus === 'approved') {
      notificationMessage = `New invoice ${invoice.invoiceNumber} has been sent to you. Amount: ZMW ${invoice.totalAmount.toLocaleString()}. Due date: ${new Date(invoice.dueDate).toLocaleDateString()}.`;
      
      await createNotification(
        body.tenant,
        session.user.id,
        'invoice_created',
        notificationMessage,
        invoice._id,
        'Invoice'
      );
    } else if (invoice.status === 'draft') {
      notificationMessage = `A new invoice ${invoice.invoiceNumber} has been created for you. It will be sent once approved and finalized.`;
      
      await createNotification(
        body.tenant,
        session.user.id,
        'general',
        notificationMessage,
        invoice._id,
        'Invoice'
      );
    }

    // If invoice is being sent immediately, also create a system notification for the creator
    if (invoice.status === 'sent' && invoice.approvalStatus === 'approved') {
      await createNotification(
        session.user.id,
        null, // System notification
        'general',
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
      { error: 'Failed to create invoice', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

// PUT - Update invoice
export async function PUT(request) {
  try {
    await dbConnect();
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { Invoice, Property } = getModels();
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('id');

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // Find the invoice
    const invoice = await Invoice.findById(invoiceId);
    
    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Check permissions
    if (session.user.role === 'landlord') {
      const property = await Property.findById(invoice.property);
      if (property.landlord.toString() !== session.user.id) {
        return NextResponse.json(
          { error: 'You can only update invoices for your own properties' },
          { status: 403 }
        );
      }
    } else if (!['manager', 'admin'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Don't allow editing paid invoices
    if (invoice.status === 'paid') {
      return NextResponse.json(
        { error: 'Cannot edit paid invoices' },
        { status: 400 }
      );
    }

    // Update allowed fields
    const allowedUpdates = ['dueDate', 'items', 'taxAmount', 'notes', 'paymentTerms', 'status'];
    const updates = {};
    
    allowedUpdates.forEach(field => {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    });

    // Recalculate totals if items changed
    if (body.items) {
      const subtotal = body.items.reduce((sum, item) => sum + (item.amount || 0), 0);
      updates.subtotal = subtotal;
      updates.totalAmount = subtotal + (body.taxAmount || invoice.taxAmount || 0);
    }

    // Update the invoice
    Object.assign(invoice, updates);
    
    // Add to approval history
    invoice.approvalHistory.push({
      action: 'updated',
      user: session.user.id,
      notes: `Invoice updated by ${session.user.role}`,
      timestamp: new Date()
    });

    await invoice.save();

    // Populate the updated invoice
    await invoice.populate([
      { path: 'tenant', select: 'name firstName lastName email phone' },
      { path: 'property', select: 'address name type' },
      { path: 'lease', select: 'monthlyRent startDate endDate' },
      { path: 'createdBy', select: 'name firstName lastName email' },
      { path: 'approvedBy', select: 'name firstName lastName email' }
    ]);

    return NextResponse.json({
      message: 'Invoice updated successfully',
      invoice: invoice.toObject()
    });

  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to update invoice', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

// DELETE - Cancel invoice
export async function DELETE(request) {
  try {
    await dbConnect();
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { Invoice, Property } = getModels();
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('id');

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    // Find the invoice
    const invoice = await Invoice.findById(invoiceId);
    
    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Check permissions
    if (session.user.role === 'landlord') {
      const property = await Property.findById(invoice.property);
      if (property.landlord.toString() !== session.user.id) {
        return NextResponse.json(
          { error: 'You can only cancel invoices for your own properties' },
          { status: 403 }
        );
      }
    } else if (!['manager', 'admin'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Don't allow cancelling paid invoices
    if (invoice.status === 'paid') {
      return NextResponse.json(
        { error: 'Cannot cancel paid invoices' },
        { status: 400 }
      );
    }

    // Update invoice status
    invoice.status = 'cancelled';
    invoice.approvalStatus = 'rejected';
    
    // Add to approval history
    invoice.approvalHistory.push({
      action: 'cancelled',
      user: session.user.id,
      notes: `Invoice cancelled by ${session.user.role}`,
      timestamp: new Date()
    });

    await invoice.save();

    // Notify tenant of cancellation
    await createNotification(
      invoice.tenant,
      session.user.id,
      'general',
      `Invoice ${invoice.invoiceNumber} has been cancelled.`,
      invoice._id,
      'Invoice'
    );

    return NextResponse.json({
      message: 'Invoice cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling invoice:', error);
    return NextResponse.json(
      { error: 'Failed to cancel invoice', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}