// src/app/invoices/[id]/edit/page.js
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect, notFound } from 'next/navigation';
import dbConnect from 'lib/db';
import Invoice from 'models/Invoice';
import Payment from 'models/Payment';
import Property from 'models/Property';
import EditInvoiceClient from './EditInvoiceClient';
import mongoose from 'mongoose';

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

async function getInvoiceForEdit(invoiceId, userId, userRole) {
  try {
    await dbConnect();
    
    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
      return null;
    }
    
    // Fetch invoice with populated references
    const invoice = await Invoice.findById(invoiceId)
      .populate('tenantId', 'name firstName lastName email phone')
      .populate('propertyId', 'address name type bedrooms bathrooms landlord')
      .populate('leaseId', 'monthlyRent startDate endDate')
      .populate('paymentHistory.paymentId', 'amount paymentDate paymentMethod reference status')
      .lean();

    if (!invoice) {
      return null;
    }

    // Check access permissions
    if (userRole === 'landlord') {
      // Landlords can only edit invoices for their own properties
      if (invoice.propertyId?.landlord?.toString() !== userId) {
        throw new Error('You can only edit invoices for your own properties');
      }
    } else if (userRole === 'tenant') {
      // Tenants cannot edit invoices
      throw new Error('Tenants cannot edit invoices');
    }
    // Managers can edit all invoices (no additional check needed)

    return serializeData(invoice);

  } catch (error) {
    console.error('Error fetching invoice for edit:', error);
    if (error.message.includes('can only edit') || error.message.includes('cannot edit')) {
      throw error; // Re-throw permission errors
    }
    return null;
  }
}

export default async function EditInvoicePage({ params }) {
  // Check authentication
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect(`/auth/signin?callbackUrl=/invoices/${params.id}/edit`);
  }

  // Check if user has permission to edit invoices
  const allowedRoles = ['landlord', 'manager'];
  if (!allowedRoles.includes(session.user.role)) {
    redirect('/unauthorized?reason=insufficient_permissions');
  }

  let invoice;
  try {
    invoice = await getInvoiceForEdit(params.id, session.user.id, session.user.role);
  } catch (error) {
    // Handle permission errors
    if (error.message.includes('can only edit') || error.message.includes('cannot edit')) {
      redirect('/unauthorized?reason=insufficient_permissions');
    }
    throw error;
  }
  
  if (!invoice) {
    notFound();
  }

  // Additional business logic checks
  const canEdit = ['draft', 'sent'].includes(invoice.status);
  
  // If invoice cannot be edited, we still show the page but with a different UI
  // The client component will handle the read-only state
  
  const data = {
    invoice,
    currentUser: {
      id: session.user.id,
      role: session.user.role,
      name: session.user.name
    }
  };
  
  return <EditInvoiceClient invoiceData={data} currentUser={data.currentUser} />;
}

export async function generateMetadata({ params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return {
        title: 'Edit Invoice - Authentication Required',
      };
    }

    const invoice = await getInvoiceForEdit(params.id, session.user.id, session.user.role);
    
    if (!invoice) {
      return {
        title: 'Invoice Not Found',
      };
    }
    
    const tenantName = invoice.tenantId?.name || 
      `${invoice.tenantId?.firstName || ''} ${invoice.tenantId?.lastName || ''}`.trim() || 
      'Unknown Tenant';
    
    const canEdit = ['draft', 'sent'].includes(invoice.status);
    
    return {
      title: `${canEdit ? 'Edit' : 'View'} Invoice ${invoice.invoiceNumber} - ${tenantName}`,
      description: `${canEdit ? 'Edit' : 'View'} invoice details for ${tenantName} - Status: ${invoice.status}`,
    };
  } catch (error) {
    return {
      title: 'Edit Invoice - Property Management',
      description: 'Edit invoice details and line items',
    };
  }
}