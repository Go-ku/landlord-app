// src/app/api/invoices/[id]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from 'lib/db';
import Invoice from 'models/Invoice';
import User from 'models/User';
import Property from 'models/Property';
import Notification from 'models/Notification';
import mongoose from 'mongoose';

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
    return null;
  }
}

// Helper function to check invoice access
async function checkInvoiceAccess(invoiceId, userId, userRole) {
  const invoice = await Invoice.findById(invoiceId)
    .populate('propertyId', 'landlord')
    .populate('tenantId', 'name firstName lastName email');

  if (!invoice) {
    return { error: 'Invoice not found', status: 404 };
  }

  // Check access based on role
  if (userRole === 'landlord') {
    if (invoice.propertyId?.landlord?.toString() !== userId) {
      return { error: 'You can only manage invoices for your own properties', status: 403 };
    }
  } else if (userRole === 'tenant') {
    return { error: 'Tenants cannot edit invoices', status: 403 };
  }
  // Managers have access to all invoices

  return { invoice };
}

// GET - Fetch single invoice for editing
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    await dbConnect();
    
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { error: 'Invalid invoice ID' },
        { status: 400 }
      );
    }

    // Check invoice access
    const accessCheck = await checkInvoiceAccess(params.id, session.user.id, session.user.role);
    if (accessCheck.error) {
      return NextResponse.json(
        { error: accessCheck.error },
        { status: accessCheck.status }
      );
    }

    const invoice = accessCheck.invoice;

    // Populate additional fields for editing
    await invoice.populate([
      { path: 'leaseId', select: 'monthlyRent startDate endDate' },
      { path: 'paymentHistory.paymentId', select: 'amount paymentDate paymentMethod reference status' }
    ]);

    return NextResponse.json({
      invoice: invoice.toObject()
    });

  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
}

// PATCH - Update invoice
export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check permissions - only landlords and managers can edit invoices
    const allowedRoles = ['landlord', 'manager'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to edit invoices' },
        { status: 403 }
      );
    }

    await dbConnect();
    
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { error: 'Invalid invoice ID' },
        { status: 400 }
      );
    }

    // Check invoice access
    const accessCheck = await checkInvoiceAccess(params.id, session.user.id, session.user.role);
    if (accessCheck.error) {
      return NextResponse.json(
        { error: accessCheck.error },
        { status: accessCheck.status }
      );
    }

    const invoice = accessCheck.invoice;

    // Check if invoice can be edited
    const editableStatuses = ['draft', 'sent'];
    if (!editableStatuses.includes(invoice.status)) {
      return NextResponse.json(
        { error: `Cannot edit ${invoice.status} invoices. Only draft and sent invoices can be modified.` },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: 'At least one invoice item is required' },
        { status: 400 }
      );
    }

    // Validate dates
    const issueDate = new Date(body.issueDate);
    const dueDate = new Date(body.dueDate);
    
    if (dueDate <= issueDate) {
      return NextResponse.json(
        { error: 'Due date must be after issue date' },
        { status: 400 }
      );
    }

    // Store original values for comparison
    const originalTotal = invoice.total || 0;
    const originalStatus = invoice.status;

    // Validate and process items
    const validItems = body.items.filter(item => 
      item.description && item.description.trim() && parseFloat(item.amount) > 0
    ).map(item => ({
      description: item.description.trim(),
      amount: parseFloat(item.amount),
      taxRate: parseFloat(item.taxRate) || 0,
      periodStart: item.periodStart ? new Date(item.periodStart) : null,
      periodEnd: item.periodEnd ? new Date(item.periodEnd) : null,
    }));

    if (validItems.length === 0) {
      return NextResponse.json(
        { error: 'At least one valid item with description and amount is required' },
        { status: 400 }
      );
    }

    // Calculate totals
    const subtotal = validItems.reduce((sum, item) => sum + item.amount, 0);
    const tax = validItems.reduce((sum, item) => sum + (item.amount * item.taxRate / 100), 0);
    const total = subtotal + tax;

    // Update invoice
    const updateData = {
      issueDate: new Date(body.issueDate),
      dueDate: new Date(body.dueDate),
      status: body.status || invoice.status,
      items: validItems,
      subtotal,
      tax,
      total,
      notes: body.notes?.trim() || '',
      updatedAt: new Date()
    };

    // If total changed and invoice has payments, recalculate balance
    if (invoice.amountPaid > 0) {
      updateData.balanceDue = total - invoice.amountPaid;
      
      // If new total is less than amount paid, mark as overpaid or adjust
      if (total <= invoice.amountPaid) {
        updateData.status = 'paid';
        updateData.balanceDue = 0;
      }
    } else {
      updateData.balanceDue = total;
    }

    // Update the invoice
    const updatedInvoice = await Invoice.findByIdAndUpdate(
      params.id,
      updateData,
      { 
        new: true, 
        runValidators: true 
      }
    );

    if (!updatedInvoice) {
      return NextResponse.json(
        { error: 'Failed to update invoice' },
        { status: 500 }
      );
    }

    // Populate the updated invoice for response
    await updatedInvoice.populate([
      { path: 'tenantId', select: 'name firstName lastName email phone' },
      { path: 'propertyId', select: 'address name type' },
      { path: 'leaseId', select: 'monthlyRent startDate endDate' }
    ]);

    // Create notifications
    const tenantName = invoice.tenantId?.name || 
      `${invoice.tenantId?.firstName || ''} ${invoice.tenantId?.lastName || ''}`.trim() || 
      'Unknown Tenant';

    const totalChanged = Math.abs(total - originalTotal) > 0.01;
    const statusChanged = body.status !== originalStatus;

    // Notify tenant about changes
    let tenantMessage = '';
    if (totalChanged && statusChanged) {
      tenantMessage = `Invoice ${invoice.invoiceNumber} has been updated. New amount: ${total.toLocaleString('en-ZM', { style: 'currency', currency: 'ZMW' })}. Status: ${body.status}.`;
    } else if (totalChanged) {
      tenantMessage = `Invoice ${invoice.invoiceNumber} amount has been updated to ${total.toLocaleString('en-ZM', { style: 'currency', currency: 'ZMW' })}.`;
    } else if (statusChanged) {
      tenantMessage = `Invoice ${invoice.invoiceNumber} status has been updated to ${body.status}.`;
    } else {
      tenantMessage = `Invoice ${invoice.invoiceNumber} has been updated with new information.`;
    }

    if (totalChanged || statusChanged || body.notes !== invoice.notes) {
      await createNotification(
        invoice.tenantId._id,
        session.user.id,
        'payment',
        tenantMessage,
        updatedInvoice._id,
        'Invoice'
      );
    }

    // Notify the user who made the update
    let updateSummary = 'Invoice updated successfully';
    if (totalChanged) {
      const difference = total - originalTotal;
      updateSummary += `. Amount ${difference > 0 ? 'increased' : 'decreased'} by ${Math.abs(difference).toLocaleString('en-ZM', { style: 'currency', currency: 'ZMW' })}`;
    }

    await createNotification(
      session.user.id,
      null, // System notification
      'system',
      `${updateSummary} for ${tenantName}.`,
      updatedInvoice._id,
      'Invoice'
    );

    // Special handling if invoice was sent for the first time
    if (originalStatus === 'draft' && body.status === 'sent') {
      await createNotification(
        invoice.tenantId._id,
        session.user.id,
        'payment',
        `Invoice ${invoice.invoiceNumber} has been sent to you. Amount: ${total.toLocaleString('en-ZM', { style: 'currency', currency: 'ZMW' })}. Due date: ${new Date(body.dueDate).toLocaleDateString()}.`,
        updatedInvoice._id,
        'Invoice'
      );
    }

    return NextResponse.json({
      message: 'Invoice updated successfully',
      invoice: updatedInvoice.toObject(),
      changes: {
        totalChanged,
        statusChanged,
        originalTotal,
        newTotal: total,
        originalStatus,
        newStatus: body.status
      }
    });

  } catch (error) {
    console.error('Error updating invoice:', error);
    
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update invoice' },
      { status: 500 }
    );
  }
}

// DELETE - Delete invoice (only for draft invoices)
export async function DELETE(request, { params }) {
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
        { error: 'Insufficient permissions to delete invoices' },
        { status: 403 }
      );
    }

    await dbConnect();
    
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { error: 'Invalid invoice ID' },
        { status: 400 }
      );
    }

    // Check invoice access
    const accessCheck = await checkInvoiceAccess(params.id, session.user.id, session.user.role);
    if (accessCheck.error) {
      return NextResponse.json(
        { error: accessCheck.error },
        { status: accessCheck.status }
      );
    }

    const invoice = accessCheck.invoice;

    // Only allow deletion of draft invoices
    if (invoice.status !== 'draft') {
      return NextResponse.json(
        { error: 'Only draft invoices can be deleted' },
        { status: 400 }
      );
    }

    // Delete the invoice
    await Invoice.findByIdAndDelete(params.id);

    // Create notification for the user
    const tenantName = invoice.tenantId?.name || 
      `${invoice.tenantId?.firstName || ''} ${invoice.tenantId?.lastName || ''}`.trim() || 
      'Unknown Tenant';

    await createNotification(
      session.user.id,
      null, // System notification
      'system',
      `Draft invoice ${invoice.invoiceNumber} for ${tenantName} has been deleted.`,
      null,
      null
    );

    return NextResponse.json({
      message: 'Invoice deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json(
      { error: 'Failed to delete invoice' },
      { status: 500 }
    );
  }
}