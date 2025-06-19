// app/api/invoices/[id]/[action]/route.js - Fixed Invoice Actions API
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from 'lib/db';
// Import models
import Invoice from 'models/Invoice';
import User from 'models/User';
import Property from 'models/Property';
import Notification from 'models/Notification';
import Payment from 'models';
import mongoose from 'mongoose';

// Helper function to get models
function getModels() {
  return {
    Invoice: mongoose.model('Invoice'),
    Payment: mongoose.model('Payment'),
    Property: mongoose.model('Property'),
    User: mongoose.model('User'),
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
      actionRequired: ['invoice_created', 'payment_due'].includes(type)
    });
    
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

// Helper function to check invoice ownership and permissions
async function checkInvoiceAccess(invoiceId, userId, userRole) {
  const { Invoice, Property } = getModels();
  
  const invoice = await Invoice.findById(invoiceId)
    .populate('property', 'landlord address name')
    .populate('tenant', 'name firstName lastName email')
    .lean();

  if (!invoice) {
    return { error: 'Invoice not found', status: 404 };
  }

  // Check access based on role
  if (userRole === 'tenant') {
    if (invoice.tenant?._id?.toString() !== userId) {
      return { error: 'You can only view your own invoices', status: 403 };
    }
    // Tenants have read-only access
    return { invoice, readOnly: true };
  } else if (userRole === 'landlord') {
    if (invoice.property?.landlord?.toString() !== userId) {
      return { error: 'You can only manage invoices for your own properties', status: 403 };
    }
  }
  // Managers and admins have full access to all invoices

  return { invoice };
}

// Generate invoice number if not present
function generateInvoiceNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `INV-${year}${month}-${random}`;
}

// POST - Handle invoice actions
export async function POST(request, { params }) {
  try {
    await dbConnect();
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id, action } = await params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid invoice ID' },
        { status: 400 }
      );
    }

    // Check invoice access
    const accessCheck = await checkInvoiceAccess(id, session.user.id, session.user.role);
    if (accessCheck.error) {
      return NextResponse.json(
        { error: accessCheck.error },
        { status: accessCheck.status }
      );
    }

    const invoice = accessCheck.invoice;
    const isReadOnly = accessCheck.readOnly;

    // Prevent write operations for read-only users
    if (isReadOnly && !['view', 'download'].includes(action)) {
      return NextResponse.json(
        { error: 'Insufficient permissions for this action' },
        { status: 403 }
      );
    }

    const tenantName = invoice.tenant?.name || 
      `${invoice.tenant?.firstName || ''} ${invoice.tenant?.lastName || ''}`.trim() || 
      'Unknown Tenant';

    switch (action) {
      case 'send':
        return await handleSendInvoice(invoice, session.user, tenantName);
      
      case 'approve':
        return await handleApproveInvoice(invoice, request, session.user, tenantName);
      
      case 'reject':
        return await handleRejectInvoice(invoice, request, session.user, tenantName);
      
      case 'mark-paid':
        return await handleMarkAsPaid(invoice, request, session.user, tenantName);
      
      case 'cancel':
        return await handleCancelInvoice(invoice, request, session.user, tenantName);
      
      case 'remind':
        return await handleSendReminder(invoice, session.user, tenantName);
      
      case 'duplicate':
        return await handleDuplicateInvoice(invoice, session.user);
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error(`Error performing invoice action ${params.action}:`, error);
    return NextResponse.json(
      { error: 'Failed to perform action', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

// Handle sending invoice
async function handleSendInvoice(invoice, currentUser, tenantName) {
  const { Invoice } = getModels();
  
  // Check permissions
  if (!['landlord', 'manager', 'admin'].includes(currentUser.role)) {
    return NextResponse.json(
      { error: 'Insufficient permissions to send invoices' },
      { status: 403 }
    );
  }

  if (!['draft', 'approved'].includes(invoice.status)) {
    return NextResponse.json(
      { error: 'Only draft or approved invoices can be sent' },
      { status: 400 }
    );
  }

  // Update invoice status
  const updatedInvoice = await Invoice.findByIdAndUpdate(
    invoice._id,
    {
      status: 'sent',
      approvalStatus: 'approved', // Auto-approve when sending
      sentDate: new Date(),
      $push: {
        approvalHistory: {
          action: 'sent',
          user: currentUser.id,
          notes: `Invoice sent by ${currentUser.role}`,
          timestamp: new Date()
        }
      }
    },
    { new: true }
  );

  // Create notification for tenant
  const dueDate = new Date(invoice.dueDate).toLocaleDateString();
  const amount = invoice.totalAmount?.toLocaleString('en-ZM', { style: 'currency', currency: 'ZMW' });
  
  await createNotification(
    invoice.tenant._id,
    currentUser.id,
    'invoice_created',
    `Invoice ${invoice.invoiceNumber} has been sent to you. Amount: ${amount}. Due date: ${dueDate}. Please make payment by the due date.`,
    invoice._id,
    'Invoice'
  );

  // Create confirmation notification for sender
  await createNotification(
    currentUser.id,
    null, // System notification
    'general',
    `Invoice ${invoice.invoiceNumber} has been successfully sent to ${tenantName}.`,
    invoice._id,
    'Invoice'
  );

  return NextResponse.json({
    message: 'Invoice sent successfully',
    invoice: updatedInvoice
  });
}

// Handle approving invoice
async function handleApproveInvoice(invoice, request, currentUser, tenantName) {
  const { Invoice } = getModels();
  
  // Check permissions
  if (!['manager', 'admin'].includes(currentUser.role)) {
    return NextResponse.json(
      { error: 'Only managers and administrators can approve invoices' },
      { status: 403 }
    );
  }

  if (invoice.approvalStatus !== 'pending') {
    return NextResponse.json(
      { error: 'Only pending invoices can be approved' },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const notes = body.notes || 'Invoice approved';

  // Update invoice
  const updatedInvoice = await Invoice.findByIdAndUpdate(
    invoice._id,
    {
      approvalStatus: 'approved',
      approvedBy: currentUser.id,
      approvedAt: new Date(),
      approvalNotes: notes,
      $push: {
        approvalHistory: {
          action: 'approved',
          user: currentUser.id,
          notes: notes,
          timestamp: new Date()
        }
      }
    },
    { new: true }
  );

  // Create notification for tenant
  await createNotification(
    invoice.tenant._id,
    currentUser.id,
    'general',
    `Your invoice ${invoice.invoiceNumber} has been approved and will be sent shortly.`,
    invoice._id,
    'Invoice'
  );

  return NextResponse.json({
    message: 'Invoice approved successfully',
    invoice: updatedInvoice
  });
}

// Handle rejecting invoice
async function handleRejectInvoice(invoice, request, currentUser, tenantName) {
  const { Invoice } = getModels();
  
  // Check permissions
  if (!['manager', 'admin'].includes(currentUser.role)) {
    return NextResponse.json(
      { error: 'Only managers and administrators can reject invoices' },
      { status: 403 }
    );
  }

  if (invoice.approvalStatus !== 'pending') {
    return NextResponse.json(
      { error: 'Only pending invoices can be rejected' },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const reason = body.reason || 'Invoice rejected';

  // Update invoice
  const updatedInvoice = await Invoice.findByIdAndUpdate(
    invoice._id,
    {
      approvalStatus: 'rejected',
      rejectionReason: reason,
      $push: {
        approvalHistory: {
          action: 'rejected',
          user: currentUser.id,
          notes: reason,
          timestamp: new Date()
        }
      }
    },
    { new: true }
  );

  // Create notification for invoice creator
  await createNotification(
    invoice.createdBy || invoice.tenant._id,
    currentUser.id,
    'general',
    `Invoice ${invoice.invoiceNumber} has been rejected. Reason: ${reason}`,
    invoice._id,
    'Invoice'
  );

  return NextResponse.json({
    message: 'Invoice rejected successfully',
    invoice: updatedInvoice
  });
}

// Handle marking invoice as paid
async function handleMarkAsPaid(invoice, request, currentUser, tenantName) {
  const { Invoice, Payment } = getModels();
  
  // Check permissions
  if (!['landlord', 'manager', 'admin'].includes(currentUser.role)) {
    return NextResponse.json(
      { error: 'Insufficient permissions to mark invoices as paid' },
      { status: 403 }
    );
  }

  if (!['sent', 'viewed', 'overdue'].includes(invoice.status)) {
    return NextResponse.json(
      { error: 'Only sent, viewed, or overdue invoices can be marked as paid' },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  
  // Calculate outstanding amount
  const outstandingAmount = (invoice.totalAmount || 0) - (invoice.paidAmount || 0);
  
  // Get payment details from request body or use defaults
  const paymentAmount = body.amount || outstandingAmount;
  const paymentDate = body.paymentDate ? new Date(body.paymentDate) : new Date();
  const paymentMethod = body.paymentMethod || 'cash';
  const reference = body.reference || `Manual payment for ${invoice.invoiceNumber}`;

  if (paymentAmount <= 0) {
    return NextResponse.json(
      { error: 'Payment amount must be greater than zero' },
      { status: 400 }
    );
  }

  if (paymentAmount > outstandingAmount) {
    return NextResponse.json(
      { error: `Payment amount cannot exceed outstanding balance of ${outstandingAmount.toLocaleString('en-ZM', { style: 'currency', currency: 'ZMW' })}` },
      { status: 400 }
    );
  }

  // Create payment record
  const payment = new Payment({
    tenant: invoice.tenant._id,
    property: invoice.property._id,
    lease: invoice.lease,
    amount: paymentAmount,
    paymentDate,
    paymentMethod,
    referenceNumber: reference,
    description: `Payment for invoice ${invoice.invoiceNumber}`,
    status: 'completed',
    approvalStatus: 'approved',
    approvedBy: currentUser.id,
    approvedAt: new Date(),
    recordedBy: currentUser.id,
    receiptNumber: `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  });

  // Add approval history to payment
  payment.approvalHistory.push({
    action: 'approved',
    user: currentUser.id,
    notes: `Manual payment recorded by ${currentUser.role}`,
    timestamp: new Date()
  });

  await payment.save();

  // Update invoice
  const newPaidAmount = (invoice.paidAmount || 0) + paymentAmount;
  const newOutstandingAmount = (invoice.totalAmount || 0) - newPaidAmount;
  const isFullyPaid = newOutstandingAmount <= 0;

  const updatedInvoice = await Invoice.findByIdAndUpdate(
    invoice._id,
    {
      paidAmount: newPaidAmount,
      status: isFullyPaid ? 'paid' : invoice.status,
      $push: {
        payments: {
          payment: payment._id,
          amount: paymentAmount,
          date: paymentDate
        },
        approvalHistory: {
          action: 'payment_recorded',
          user: currentUser.id,
          notes: `Payment of ${paymentAmount.toLocaleString('en-ZM', { style: 'currency', currency: 'ZMW' })} recorded`,
          timestamp: new Date()
        }
      }
    },
    { new: true }
  );

  // Create notifications
  const amount = paymentAmount.toLocaleString('en-ZM', { style: 'currency', currency: 'ZMW' });
  
  // Notify tenant
  await createNotification(
    invoice.tenant._id,
    currentUser.id,
    'general',
    isFullyPaid 
      ? `Your payment of ${amount} for invoice ${invoice.invoiceNumber} has been received and processed. Invoice is now fully paid.`
      : `Your payment of ${amount} for invoice ${invoice.invoiceNumber} has been received. Remaining balance: ${newOutstandingAmount.toLocaleString('en-ZM', { style: 'currency', currency: 'ZMW' })}.`,
    payment._id,
    'Payment'
  );

  // Notify current user
  await createNotification(
    currentUser.id,
    null,
    'general',
    `Payment of ${amount} recorded for invoice ${invoice.invoiceNumber} from ${tenantName}. ${isFullyPaid ? 'Invoice is now fully paid.' : 'Partial payment recorded.'}`,
    payment._id,
    'Payment'
  );

  return NextResponse.json({
    message: isFullyPaid ? 'Invoice marked as fully paid' : 'Partial payment recorded successfully',
    invoice: updatedInvoice,
    payment: payment.toObject()
  });
}

// Handle cancelling invoice
async function handleCancelInvoice(invoice, request, currentUser, tenantName) {
  const { Invoice } = getModels();
  
  // Check permissions
  if (!['manager', 'admin'].includes(currentUser.role)) {
    return NextResponse.json(
      { error: 'Only managers and administrators can cancel invoices' },
      { status: 403 }
    );
  }

  if (invoice.status === 'paid') {
    return NextResponse.json(
      { error: 'Paid invoices cannot be cancelled' },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const reason = body.reason || 'Invoice cancelled';

  const oldStatus = invoice.status;
  
  // Update invoice
  const updatedInvoice = await Invoice.findByIdAndUpdate(
    invoice._id,
    {
      status: 'cancelled',
      approvalStatus: 'rejected',
      rejectionReason: reason,
      $push: {
        approvalHistory: {
          action: 'cancelled',
          user: currentUser.id,
          notes: reason,
          timestamp: new Date()
        }
      }
    },
    { new: true }
  );

  // Create notifications only if invoice was previously sent
  if (['sent', 'viewed', 'overdue'].includes(oldStatus)) {
    // Notify tenant
    await createNotification(
      invoice.tenant._id,
      currentUser.id,
      'general',
      `Invoice ${invoice.invoiceNumber} has been cancelled. No payment is required. Reason: ${reason}`,
      invoice._id,
      'Invoice'
    );
  }

  // Notify current user
  await createNotification(
    currentUser.id,
    null,
    'general',
    `Invoice ${invoice.invoiceNumber} for ${tenantName} has been cancelled successfully.`,
    invoice._id,
    'Invoice'
  );

  return NextResponse.json({
    message: 'Invoice cancelled successfully',
    invoice: updatedInvoice
  });
}

// Handle sending reminder
async function handleSendReminder(invoice, currentUser, tenantName) {
  const { Invoice } = getModels();
  
  // Check permissions
  if (!['landlord', 'manager', 'admin'].includes(currentUser.role)) {
    return NextResponse.json(
      { error: 'Insufficient permissions to send reminders' },
      { status: 403 }
    );
  }

  if (!['sent', 'viewed', 'overdue'].includes(invoice.status)) {
    return NextResponse.json(
      { error: 'Reminders can only be sent for sent, viewed, or overdue invoices' },
      { status: 400 }
    );
  }

  // Update reminder count
  const reminderCount = (invoice.remindersSent || 0) + 1;
  
  await Invoice.findByIdAndUpdate(
    invoice._id,
    {
      remindersSent: reminderCount,
      lastReminderDate: new Date(),
      $push: {
        approvalHistory: {
          action: 'reminder_sent',
          user: currentUser.id,
          notes: `Reminder #${reminderCount} sent`,
          timestamp: new Date()
        }
      }
    }
  );

  // Create notification for tenant
  const dueDate = new Date(invoice.dueDate).toLocaleDateString();
  const outstandingAmount = (invoice.totalAmount || 0) - (invoice.paidAmount || 0);
  const amount = outstandingAmount.toLocaleString('en-ZM', { style: 'currency', currency: 'ZMW' });
  const daysOverdue = invoice.status === 'overdue' 
    ? Math.ceil((new Date() - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24))
    : 0;

  let reminderMessage = '';
  if (invoice.status === 'overdue') {
    reminderMessage = `PAYMENT REMINDER: Invoice ${invoice.invoiceNumber} is ${daysOverdue} days overdue. Amount due: ${amount}. Please make payment immediately to avoid late fees.`;
  } else {
    reminderMessage = `PAYMENT REMINDER: Invoice ${invoice.invoiceNumber} is due on ${dueDate}. Amount due: ${amount}. Please make payment by the due date.`;
  }

  await createNotification(
    invoice.tenant._id,
    currentUser.id,
    'payment_due',
    reminderMessage,
    invoice._id,
    'Invoice'
  );

  // Create confirmation for sender
  await createNotification(
    currentUser.id,
    null,
    'general',
    `Payment reminder sent to ${tenantName} for invoice ${invoice.invoiceNumber}. This is reminder #${reminderCount}.`,
    invoice._id,
    'Invoice'
  );

  return NextResponse.json({
    message: 'Reminder sent successfully',
    reminderCount
  });
}

// Handle duplicating invoice
async function handleDuplicateInvoice(invoice, currentUser) {
  const { Invoice } = getModels();
  
  // Check permissions
  if (!['landlord', 'manager', 'admin'].includes(currentUser.role)) {
    return NextResponse.json(
      { error: 'Insufficient permissions to duplicate invoices' },
      { status: 403 }
    );
  }

  // Create new invoice based on current one
  const newInvoiceData = {
    tenant: invoice.tenant._id,
    property: invoice.property._id,
    lease: invoice.lease,
    issueDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    status: 'draft',
    approvalStatus: 'pending',
    items: invoice.items?.map(item => ({
      description: item.description,
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice,
      amount: item.amount
    })) || [],
    subtotal: invoice.subtotal || 0,
    taxAmount: invoice.taxAmount || 0,
    totalAmount: invoice.totalAmount || 0,
    paidAmount: 0,
    notes: invoice.notes,
    paymentTerms: invoice.paymentTerms,
    createdBy: currentUser.id,
    approvalHistory: [{
      action: 'submitted',
      user: currentUser.id,
      notes: `Duplicated from invoice ${invoice.invoiceNumber}`,
      timestamp: new Date()
    }]
  };

  const newInvoice = new Invoice(newInvoiceData);
  await newInvoice.save();

  // Populate the new invoice
  await newInvoice.populate([
    { path: 'tenant', select: 'name firstName lastName email' },
    { path: 'property', select: 'address name' }
  ]);

  // Create notification for current user
  await createNotification(
    currentUser.id,
    null,
    'general',
    `Invoice ${invoice.invoiceNumber} has been duplicated as ${newInvoice.invoiceNumber}.`,
    newInvoice._id,
    'Invoice'
  );

  return NextResponse.json({
    message: 'Invoice duplicated successfully',
    originalInvoice: invoice,
    newInvoice: newInvoice.toObject()
  });
}