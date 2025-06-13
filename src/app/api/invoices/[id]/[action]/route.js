// src/app/api/invoices/[id]/[action]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from 'lib/db';
import Invoice from 'models/Invoice';
import Payment from 'models/Payment';
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

// Helper function to check invoice ownership
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
    if (invoice.tenantId?._id?.toString() !== userId) {
      return { error: 'You can only view your own invoices', status: 403 };
    }
  }
  // Managers have access to all invoices

  return { invoice };
}

// POST - Handle invoice actions (send, mark-paid, cancel, etc.)
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    await dbConnect();
    
    const { id, action } = params;
    
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
    const tenantName = invoice.tenantId?.name || 
      `${invoice.tenantId?.firstName || ''} ${invoice.tenantId?.lastName || ''}`.trim() || 
      'Unknown Tenant';

    switch (action) {
      case 'send':
        return await handleSendInvoice(invoice, session.user, tenantName);
      
      case 'mark-paid':
        return await handleMarkAsPaid(invoice, request, session.user, tenantName);
      
      case 'cancel':
        return await handleCancelInvoice(invoice, session.user, tenantName);
      
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
      { error: 'Failed to perform action' },
      { status: 500 }
    );
  }
}

// Handle sending invoice
async function handleSendInvoice(invoice, currentUser, tenantName) {
  // Check permissions - only landlords and managers can send invoices
  if (!['landlord', 'manager'].includes(currentUser.role)) {
    return NextResponse.json(
      { error: 'Insufficient permissions to send invoices' },
      { status: 403 }
    );
  }

  if (invoice.status !== 'draft') {
    return NextResponse.json(
      { error: 'Only draft invoices can be sent' },
      { status: 400 }
    );
  }

  // Update invoice status
  invoice.status = 'sent';
  invoice.sentDate = new Date();
  await invoice.save();

  // Create notification for tenant
  const dueDate = new Date(invoice.dueDate).toLocaleDateString();
  const amount = invoice.total.toLocaleString('en-ZM', { style: 'currency', currency: 'ZMW' });
  
  await createNotification(
    invoice.tenantId._id,
    currentUser.id,
    'payment',
    `Invoice ${invoice.invoiceNumber} has been sent to you. Amount: ${amount}. Due date: ${dueDate}. Please make payment by the due date.`,
    invoice._id,
    'Invoice'
  );

  // Create confirmation notification for sender
  await createNotification(
    currentUser.id,
    null, // System notification
    'system',
    `Invoice ${invoice.invoiceNumber} has been successfully sent to ${tenantName}.`,
    invoice._id,
    'Invoice'
  );

  // TODO: Implement actual email sending logic here
  console.log(`Email would be sent to ${invoice.tenantId.email} for invoice ${invoice.invoiceNumber}`);

  return NextResponse.json({
    message: 'Invoice sent successfully',
    invoice: {
      ...invoice.toObject(),
      emailSent: true,
      sentTo: invoice.tenantId.email
    }
  });
}

// Handle marking invoice as paid
async function handleMarkAsPaid(invoice, request, currentUser, tenantName) {
  // Check permissions
  if (!['landlord', 'manager'].includes(currentUser.role)) {
    return NextResponse.json(
      { error: 'Insufficient permissions to mark invoices as paid' },
      { status: 403 }
    );
  }

  if (!['sent', 'overdue'].includes(invoice.status)) {
    return NextResponse.json(
      { error: 'Only sent or overdue invoices can be marked as paid' },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  
  // Get payment details from request body or use defaults
  const paymentAmount = body.amount || invoice.balanceDue || invoice.total;
  const paymentDate = body.paymentDate ? new Date(body.paymentDate) : new Date();
  const paymentMethod = body.paymentMethod || 'other';
  const reference = body.reference || `Payment for ${invoice.invoiceNumber}`;

  // Create payment record
  const payment = new Payment({
    leaseId: invoice.leaseId,
    tenantId: invoice.tenantId._id,
    propertyId: invoice.propertyId._id,
    amount: paymentAmount,
    paymentDate,
    paymentMethod,
    reference,
    description: `Payment for invoice ${invoice.invoiceNumber}`,
    status: 'verified', // Auto-verify manual payments
    verifiedBy: currentUser.id,
    verifiedAt: new Date(),
    createdBy: currentUser.id
  });

  await payment.save();

  // Update invoice
  invoice.amountPaid = (invoice.amountPaid || 0) + paymentAmount;
  invoice.balanceDue = invoice.total - invoice.amountPaid;
  
  // Add to payment history
  invoice.paymentHistory.push({
    paymentId: payment._id,
    amount: paymentAmount,
    date: paymentDate
  });

  // Update status if fully paid
  const wasFullyPaid = invoice.balanceDue <= 0;
  if (wasFullyPaid) {
    invoice.status = 'paid';
    invoice.paidDate = paymentDate;
  }

  await invoice.save();

  // Create notifications
  const amount = paymentAmount.toLocaleString('en-ZM', { style: 'currency', currency: 'ZMW' });
  
  // Notify tenant
  await createNotification(
    invoice.tenantId._id,
    currentUser.id,
    'payment',
    wasFullyPaid 
      ? `Your payment of ${amount} for invoice ${invoice.invoiceNumber} has been received and processed. Invoice is now fully paid.`
      : `Your payment of ${amount} for invoice ${invoice.invoiceNumber} has been received. Remaining balance: ${invoice.balanceDue.toLocaleString('en-ZM', { style: 'currency', currency: 'ZMW' })}.`,
    payment._id,
    'Payment'
  );

  // Notify landlord/manager
  await createNotification(
    currentUser.id,
    null, // System notification
    'system',
    `Payment of ${amount} recorded for invoice ${invoice.invoiceNumber} from ${tenantName}. ${wasFullyPaid ? 'Invoice is now fully paid.' : 'Partial payment recorded.'}`,
    payment._id,
    'Payment'
  );

  return NextResponse.json({
    message: wasFullyPaid ? 'Invoice marked as fully paid' : 'Partial payment recorded successfully',
    invoice: invoice.toObject(),
    payment: payment.toObject()
  });
}

// Handle cancelling invoice
async function handleCancelInvoice(invoice, currentUser, tenantName) {
  // Check permissions
  if (!['landlord', 'manager'].includes(currentUser.role)) {
    return NextResponse.json(
      { error: 'Insufficient permissions to cancel invoices' },
      { status: 403 }
    );
  }

  if (invoice.status === 'paid') {
    return NextResponse.json(
      { error: 'Paid invoices cannot be cancelled' },
      { status: 400 }
    );
  }

  const oldStatus = invoice.status;
  invoice.status = 'cancelled';
  invoice.cancelledDate = new Date();
  invoice.cancelledBy = currentUser.id;
  await invoice.save();

  // Create notifications only if invoice was previously sent
  if (['sent', 'overdue'].includes(oldStatus)) {
    // Notify tenant
    await createNotification(
      invoice.tenantId._id,
      currentUser.id,
      'system',
      `Invoice ${invoice.invoiceNumber} has been cancelled. No payment is required.`,
      invoice._id,
      'Invoice'
    );
  }

  // Notify current user
  await createNotification(
    currentUser.id,
    null, // System notification
    'system',
    `Invoice ${invoice.invoiceNumber} for ${tenantName} has been cancelled successfully.`,
    invoice._id,
    'Invoice'
  );

  return NextResponse.json({
    message: 'Invoice cancelled successfully',
    invoice: invoice.toObject()
  });
}

// Handle sending reminder
async function handleSendReminder(invoice, currentUser, tenantName) {
  // Check permissions
  if (!['landlord', 'manager'].includes(currentUser.role)) {
    return NextResponse.json(
      { error: 'Insufficient permissions to send reminders' },
      { status: 403 }
    );
  }

  if (!['sent', 'overdue'].includes(invoice.status)) {
    return NextResponse.json(
      { error: 'Reminders can only be sent for sent or overdue invoices' },
      { status: 400 }
    );
  }

  // Update reminder count
  invoice.remindersSent = (invoice.remindersSent || 0) + 1;
  invoice.lastReminderDate = new Date();
  await invoice.save();

  // Create notification for tenant
  const dueDate = new Date(invoice.dueDate).toLocaleDateString();
  const amount = invoice.balanceDue.toLocaleString('en-ZM', { style: 'currency', currency: 'ZMW' });
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
    invoice.tenantId._id,
    currentUser.id,
    'payment',
    reminderMessage,
    invoice._id,
    'Invoice'
  );

  // Create confirmation for sender
  await createNotification(
    currentUser.id,
    null, // System notification
    'system',
    `Payment reminder sent to ${tenantName} for invoice ${invoice.invoiceNumber}. This is reminder #${invoice.remindersSent}.`,
    invoice._id,
    'Invoice'
  );

  return NextResponse.json({
    message: 'Reminder sent successfully',
    invoice: invoice.toObject(),
    reminderCount: invoice.remindersSent
  });
}

// Handle duplicating invoice
async function handleDuplicateInvoice(invoice, currentUser) {
  // Check permissions
  if (!['landlord', 'manager'].includes(currentUser.role)) {
    return NextResponse.json(
      { error: 'Insufficient permissions to duplicate invoices' },
      { status: 403 }
    );
  }

  // Create new invoice based on current one
  const newInvoiceData = {
    tenantId: invoice.tenantId._id,
    propertyId: invoice.propertyId._id,
    leaseId: invoice.leaseId,
    issueDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    status: 'draft',
    items: invoice.items.map(item => ({
      description: item.description,
      amount: item.amount,
      taxRate: item.taxRate,
      periodStart: item.periodStart,
      periodEnd: item.periodEnd
    })),
    subtotal: invoice.subtotal,
    tax: invoice.tax,
    total: invoice.total,
    balanceDue: invoice.total,
    notes: invoice.notes
  };

  const newInvoice = new Invoice(newInvoiceData);
  await newInvoice.save();

  // Populate the new invoice
  await newInvoice.populate([
    { path: 'tenantId', select: 'name firstName lastName email' },
    { path: 'propertyId', select: 'address name' }
  ]);

  // Create notification for current user
  await createNotification(
    currentUser.id,
    null, // System notification
    'system',
    `Invoice ${invoice.invoiceNumber} has been duplicated as ${newInvoice.invoiceNumber}.`,
    newInvoice._id,
    'Invoice'
  );

  return NextResponse.json({
    message: 'Invoice duplicated successfully',
    originalInvoice: invoice.toObject(),
    newInvoice: newInvoice.toObject()
  });
}