// app/invoices/[id]/page.js - Fixed Invoice Detail Page
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect, notFound } from 'next/navigation';
import dbConnect from 'lib/db';
import InvoiceDetailClient from './InvoiceDetailClient';
// Import models
import Payment from 'models';
import User from 'models';
import Lease from 'models';
import Property from 'models';
import mongoose from 'mongoose';

// Helper function to get models
function getModels() {
  return {
    Invoice: mongoose.model('Invoice'),
    User: mongoose.model('User'),
    Property: mongoose.model('Property'),
    Lease: mongoose.model('Lease'),
    Payment: mongoose.model('Payment')
  };
}

// Helper function to serialize MongoDB data
function serializeData(data) {
  if (!data) return null;
  
  return JSON.parse(JSON.stringify(data, (key, value) => {
    if (value && typeof value === 'object' && value.constructor?.name === 'ObjectId') {
      return value.toString();
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  }));
}

// Server function to get invoice with role-based access control
async function getInvoiceWithDetails(id, userId, userRole) {
  try {
    await dbConnect();
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    const { Invoice, Property } = getModels();
    
    // Fetch invoice with populated references
    const invoice = await Invoice.findById(id)
      .populate('tenant', 'name firstName lastName email phone')
      .populate('property', 'address name type bedrooms bathrooms landlord')
      .populate('lease', 'monthlyRent startDate endDate')
      .populate('createdBy', 'name firstName lastName email')
      .populate('approvedBy', 'name firstName lastName email')
      .populate('payments.payment', 'amount paymentDate paymentMethod reference status')
      .lean();

    if (!invoice) {
      return null;
    }

    // Check access permissions based on user role
    if (userRole === 'tenant') {
      // Tenants can only view their own invoices
      if (invoice.tenant._id.toString() !== userId) {
        throw new Error('You can only view your own invoices');
      }
    } else if (userRole === 'landlord') {
      // Landlords can only view invoices for their properties
      if (invoice.property?.landlord?.toString() !== userId) {
        throw new Error('You can only view invoices for your own properties');
      }
    }
    // Managers and admins can view all invoices (no additional check needed)

    // Update status if needed (check if overdue)
    const currentDate = new Date();
    if (['sent', 'viewed'].includes(invoice.status) && 
        new Date(invoice.dueDate) < currentDate &&
        invoice.paidAmount < invoice.totalAmount) {
      
      await Invoice.findByIdAndUpdate(id, { status: 'overdue' });
      invoice.status = 'overdue';
    }

    return serializeData(invoice);

  } catch (error) {
    console.error('Error fetching invoice details:', error);
    if (error.message.includes('can only view')) {
      throw error; // Re-throw permission errors
    }
    return null;
  }
}

// Server function to get related payments for the invoice
async function getInvoicePayments(invoiceId, userId, userRole) {
  try {
    await dbConnect();
    
    const { Payment, Property } = getModels();
    
    // Build query based on user role
    let baseQuery = {
      $or: [
        { 'relatedInvoice': invoiceId },
        { 'invoiceId': invoiceId }, // Legacy field support
      ]
    };

    // Apply role-based filtering for payments
    if (userRole === 'tenant') {
      baseQuery.tenant = userId;
    } else if (userRole === 'landlord') {
      // Get landlord's properties
      const landlordProperties = await Property.find({ 
        landlord: userId 
      }).select('_id').lean();
      
      baseQuery.property = { 
        $in: landlordProperties.map(p => p._id) 
      };
    }
    // Managers and admins can see all payments

    const payments = await Payment.find(baseQuery)
      .populate('tenant', 'name firstName lastName email')
      .populate('property', 'address name')
      .populate('recordedBy', 'name firstName lastName email')
      .populate('approvedBy', 'name firstName lastName email')
      .sort({ paymentDate: -1, createdAt: -1 })
      .lean();

    return serializeData(payments);

  } catch (error) {
    console.error('Error fetching invoice payments:', error);
    return [];
  }
}

// Server function to get invoice activity/history
async function getInvoiceActivity(invoice) {
  try {
    const activities = [];

    // Add creation activity
    if (invoice.createdAt) {
      activities.push({
        type: 'created',
        date: invoice.createdAt,
        user: invoice.createdBy,
        description: 'Invoice created'
      });
    }

    // Add approval history
    if (invoice.approvalHistory && invoice.approvalHistory.length > 0) {
      invoice.approvalHistory.forEach(entry => {
        activities.push({
          type: entry.action,
          date: entry.timestamp,
          user: entry.user,
          description: entry.notes || `Invoice ${entry.action}`,
          notes: entry.notes
        });
      });
    }

    // Add payment activities
    if (invoice.payments && invoice.payments.length > 0) {
      invoice.payments.forEach(payment => {
        activities.push({
          type: 'payment',
          date: payment.date,
          description: `Payment received: ZMW ${payment.amount?.toLocaleString()}`,
          amount: payment.amount,
          paymentId: payment.payment
        });
      });
    }

    // Sort activities by date (newest first)
    activities.sort((a, b) => new Date(b.date) - new Date(a.date));

    return serializeData(activities);

  } catch (error) {
    console.error('Error getting invoice activity:', error);
    return [];
  }
}

// Server function to calculate invoice summary
function calculateInvoiceSummary(invoice) {
  try {
    const summary = {
      subtotal: invoice.subtotal || 0,
      taxAmount: invoice.taxAmount || 0,
      totalAmount: invoice.totalAmount || 0,
      paidAmount: invoice.paidAmount || 0,
      outstandingAmount: Math.max(0, (invoice.totalAmount || 0) - (invoice.paidAmount || 0)),
      isFullyPaid: (invoice.paidAmount || 0) >= (invoice.totalAmount || 0),
      isOverdue: invoice.status === 'overdue' || 
                 (new Date() > new Date(invoice.dueDate) && 
                  invoice.status !== 'paid' && 
                  (invoice.paidAmount || 0) < (invoice.totalAmount || 0)),
      daysPastDue: invoice.status === 'overdue' ? 
                   Math.max(0, Math.floor((new Date() - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24))) : 0
    };

    return summary;

  } catch (error) {
    console.error('Error calculating invoice summary:', error);
    return {
      subtotal: 0,
      taxAmount: 0,
      totalAmount: 0,
      paidAmount: 0,
      outstandingAmount: 0,
      isFullyPaid: false,
      isOverdue: false,
      daysPastDue: 0
    };
  }
}

// Main server component
export default async function InvoiceDetailPage({ params }) {
  // Check authentication
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/invoices/${params.id}`);
  }

  // Await params for Next.js 15 compatibility
  const { id } = await params;

  // Check if user has permission to view invoices
  const allowedRoles = ['tenant', 'landlord', 'manager', 'admin'];
  if (!allowedRoles.includes(session.user.role)) {
    redirect('/dashboard?error=insufficient_permissions');
  }

  let invoice;
  try {
    invoice = await getInvoiceWithDetails(id, session.user.id, session.user.role);
  } catch (error) {
    // Handle permission errors
    if (error.message.includes('can only view')) {
      redirect('/invoices?error=access_denied');
    }
    throw error;
  }
  
  if (!invoice) {
    notFound();
  }

  // Fetch related data in parallel
  const [payments, activities] = await Promise.all([
    getInvoicePayments(id, session.user.id, session.user.role),
    getInvoiceActivity(invoice)
  ]);

  // Calculate summary
  const summary = calculateInvoiceSummary(invoice);

  // Determine user permissions
  const permissions = {
    canEdit: () => {
      if (session.user.role === 'tenant') return false;
      if (['paid', 'cancelled'].includes(invoice.status)) return false;
      if (session.user.role === 'landlord') {
        return ['draft', 'sent', 'viewed'].includes(invoice.status);
      }
      return ['manager', 'admin'].includes(session.user.role);
    },
    canApprove: ['manager', 'admin'].includes(session.user.role) && 
                invoice.approvalStatus === 'pending',
    canMarkPaid: ['landlord', 'manager', 'admin'].includes(session.user.role) && 
                 invoice.status !== 'paid' && 
                 invoice.status !== 'cancelled',
    canCancel: ['manager', 'admin'].includes(session.user.role) && 
               invoice.status !== 'paid' && 
               invoice.status !== 'cancelled',
    canDownload: true, // All users can download their accessible invoices
    canAddPayment: ['landlord', 'manager', 'admin'].includes(session.user.role) && 
                   summary.outstandingAmount > 0
  };

  const data = {
    invoice,
    payments,
    activities,
    summary,
    permissions: {
      canEdit: permissions.canEdit(),
      canApprove: permissions.canApprove,
      canMarkPaid: permissions.canMarkPaid,
      canCancel: permissions.canCancel,
      canDownload: permissions.canDownload,
      canAddPayment: permissions.canAddPayment
    },
    currentUser: {
      id: session.user.id,
      role: session.user.role,
      name: session.user.name,
      email: session.user.email
    }
  };

  return <InvoiceDetailClient initialData={data} />;
}

// Generate metadata
export async function generateMetadata({ params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return {
        title: 'Invoice Details - Authentication Required',
        description: 'Please sign in to view invoice details'
      };
    }

    const { id } = await params;
    
    let invoice;
    try {
      invoice = await getInvoiceWithDetails(id, session.user.id, session.user.role);
    } catch (error) {
      return {
        title: 'Access Denied - Invoice Details',
        description: 'You do not have permission to view this invoice'
      };
    }
    
    if (!invoice) {
      return {
        title: 'Invoice Not Found',
        description: 'The requested invoice could not be found'
      };
    }
    
    const tenantName = invoice.tenant?.name || 
      `${invoice.tenant?.firstName || ''} ${invoice.tenant?.lastName || ''}`.trim() || 
      'Unknown Tenant';

    const propertyAddress = invoice.property?.address || invoice.property?.name || 'Unknown Property';
    
    const statusText = invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1);
    const amountText = invoice.totalAmount ? 
      `ZMW ${invoice.totalAmount.toLocaleString()}` : 
      'Amount not specified';

    return {
      title: `Invoice ${invoice.invoiceNumber} - ${tenantName}`,
      description: `Invoice for ${tenantName} at ${propertyAddress} - Status: ${statusText} - Total: ${amountText}`,
      openGraph: {
        title: `Invoice ${invoice.invoiceNumber}`,
        description: `${statusText} invoice for ${tenantName}`,
        type: 'website'
      }
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Invoice Details - Property Management',
      description: 'View detailed invoice information and payment history'
    };
  }
}

// Page configuration
export const dynamic = 'force-dynamic';
export const revalidate = 0;