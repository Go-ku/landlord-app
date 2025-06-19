// app/invoices/[id]/edit/page.js - Fixed Edit Invoice Page
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect, notFound } from 'next/navigation';
import dbConnect from 'lib/db';
import EditInvoiceClient from './EditInvoiceClient';
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

// Server function to get invoice for editing with role-based access control
async function getInvoiceForEdit(invoiceId, userId, userRole) {
  try {
    await dbConnect();
    
    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
      return null;
    }
    
    const { Invoice, Property } = getModels();
    
    // Fetch invoice with populated references
    const invoice = await Invoice.findById(invoiceId)
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
      // Tenants cannot edit invoices, but can view their own
      if (invoice.tenant.toString() !== userId) {
        throw new Error('You can only view your own invoices');
      }
      // Allow view access but will be read-only
    } else if (userRole === 'landlord') {
      // Landlords can only edit invoices for their own properties
      if (invoice.property?.landlord?.toString() !== userId) {
        throw new Error('You can only edit invoices for your own properties');
      }
    }
    // Managers and admins can edit all invoices (no additional check needed)

    return serializeData(invoice);

  } catch (error) {
    console.error('Error fetching invoice for edit:', error);
    if (error.message.includes('can only edit') || 
        error.message.includes('cannot edit') || 
        error.message.includes('can only view')) {
      throw error; // Re-throw permission errors
    }
    return null;
  }
}

// Server function to get related data for the edit form
async function getInvoiceEditData(invoiceId, userId, userRole) {
  try {
    await dbConnect();
    
    const { User, Property, Lease } = getModels();
    
    let tenants = [];
    let properties = [];
    let leases = [];

    if (userRole === 'tenant') {
      // Tenants don't need edit data since they can't edit
      return { tenants: [], properties: [], leases: [] };
    } else if (userRole === 'landlord') {
      // Get landlord's properties and their tenants
      const landlordProperties = await Property.find({ 
        landlord: userId 
      }).select('_id address name type').lean();
      
      properties = landlordProperties;

      // Get active leases for landlord's properties
      const propertyIds = landlordProperties.map(p => p._id);
      
      const activeLeases = await Lease.find({
        property: { $in: propertyIds },
        status: 'active'
      }).populate('tenant', 'name firstName lastName email')
        .populate('property', 'address name')
        .lean();

      leases = activeLeases;

      // Extract unique tenants from leases
      const tenantMap = new Map();
      activeLeases.forEach(lease => {
        if (lease.tenant) {
          tenantMap.set(lease.tenant._id.toString(), lease.tenant);
        }
      });
      
      tenants = Array.from(tenantMap.values());
    } else if (['manager', 'admin'].includes(userRole)) {
      // Get all data for managers/admins
      [tenants, properties, leases] = await Promise.all([
        User.find({ role: 'tenant' }).select('name firstName lastName email').lean(),
        Property.find({}).select('address name type landlord').lean(),
        Lease.find({ status: 'active' })
          .populate('tenant', 'name firstName lastName email')
          .populate('property', 'address name')
          .lean()
      ]);
    }

    return serializeData({ tenants, properties, leases });

  } catch (error) {
    console.error('Error fetching invoice edit data:', error);
    return { tenants: [], properties: [], leases: [] };
  }
}

// Server function to get payment history for the invoice
async function getInvoicePayments(invoiceId) {
  try {
    await dbConnect();
    
    const { Payment } = getModels();
    
    // Find all payments related to this invoice
    const payments = await Payment.find({
      $or: [
        { 'invoiceId': invoiceId },
        { 'relatedInvoice': invoiceId }
      ]
    })
    .populate('tenant', 'name firstName lastName email')
    .populate('recordedBy', 'name firstName lastName email')
    .sort({ paymentDate: -1 })
    .lean();

    return serializeData(payments);

  } catch (error) {
    console.error('Error fetching invoice payments:', error);
    return [];
  }
}

// Main server component
export default async function EditInvoicePage({ params }) {
  // Check authentication
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/invoices/${params.id}/edit`);
  }

  // Await params for Next.js 15 compatibility
  const { id } = await params;

  // Check if user has permission to access invoices
  const allowedRoles = ['tenant', 'landlord', 'manager', 'admin'];
  if (!allowedRoles.includes(session.user.role)) {
    redirect('/dashboard?error=insufficient_permissions');
  }

  let invoice;
  try {
    invoice = await getInvoiceForEdit(id, session.user.id, session.user.role);
  } catch (error) {
    // Handle permission errors
    if (error.message.includes('can only edit') || 
        error.message.includes('cannot edit') || 
        error.message.includes('can only view')) {
      redirect('/invoices?error=access_denied');
    }
    throw error;
  }
  
  if (!invoice) {
    notFound();
  }

  // Determine edit permissions
  const canEdit = () => {
    // Tenants cannot edit invoices
    if (session.user.role === 'tenant') {
      return false;
    }
    
    // Cannot edit paid or cancelled invoices
    if (['paid', 'cancelled'].includes(invoice.status)) {
      return false;
    }
    
    // Landlords can edit their own property invoices in certain statuses
    if (session.user.role === 'landlord') {
      return ['draft', 'sent', 'viewed'].includes(invoice.status);
    }
    
    // Managers and admins can edit most statuses except paid
    if (['manager', 'admin'].includes(session.user.role)) {
      return !['paid', 'cancelled'].includes(invoice.status);
    }
    
    return false;
  };

  const canApprove = () => {
    return ['manager', 'admin'].includes(session.user.role) && 
           invoice.approvalStatus === 'pending';
  };

  // Fetch additional data in parallel
  const [editData, payments] = await Promise.all([
    getInvoiceEditData(id, session.user.id, session.user.role),
    getInvoicePayments(id)
  ]);
  
  const data = {
    invoice,
    editData,
    payments,
    permissions: {
      canEdit: canEdit(),
      canApprove: canApprove(),
      canView: true // All authenticated users with access can view
    },
    currentUser: {
      id: session.user.id,
      role: session.user.role,
      name: session.user.name,
      email: session.user.email
    }
  };
  
  return <EditInvoiceClient invoiceData={data} />;
}

// Generate metadata
export async function generateMetadata({ params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return {
        title: 'Edit Invoice - Authentication Required',
        description: 'Please sign in to edit invoices'
      };
    }

    const { id } = await params;
    
    let invoice;
    try {
      invoice = await getInvoiceForEdit(id, session.user.id, session.user.role);
    } catch (error) {
      return {
        title: 'Access Denied - Invoice Edit',
        description: 'You do not have permission to access this invoice'
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
    
    const canEdit = () => {
      if (session.user.role === 'tenant') return false;
      if (['paid', 'cancelled'].includes(invoice.status)) return false;
      if (session.user.role === 'landlord') {
        return ['draft', 'sent', 'viewed'].includes(invoice.status);
      }
      return ['manager', 'admin'].includes(session.user.role);
    };
    
    const actionWord = canEdit() ? 'Edit' : 'View';
    
    return {
      title: `${actionWord} Invoice ${invoice.invoiceNumber} - ${tenantName}`,
      description: `${actionWord} invoice details for ${tenantName} - Status: ${invoice.status}, Amount: ZMW ${invoice.totalAmount?.toLocaleString()}`,
      openGraph: {
        title: `${actionWord} Invoice ${invoice.invoiceNumber}`,
        description: `Invoice for ${tenantName} - ${invoice.status}`,
        type: 'website'
      }
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Invoice Management - Property System',
      description: 'Manage invoice details and track payments'
    };
  }
}

// Page configuration
export const dynamic = 'force-dynamic';
export const revalidate = 0;