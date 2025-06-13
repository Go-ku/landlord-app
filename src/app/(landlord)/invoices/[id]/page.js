// src/app/invoices/[id]/page.js
import { notFound } from 'next/navigation';
import dbConnect from 'lib/db';
// import Invoice from 'models/Invoice';
import InvoiceDetailClient from './InvoiceDetailClient';
import mongoose from 'mongoose';
// Instead of individual imports
import { Invoice, Payment, User, Property, Lease } from 'models';

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

async function getInvoiceWithDetails(id) {
  try {
    await dbConnect();
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    
    // Fetch invoice with populated references
    const invoice = await Invoice.findById(id)
      .populate('tenantId', 'name firstName lastName email phone')
      .populate('propertyId', 'address name type bedrooms bathrooms')
      .populate('leaseId', 'monthlyRent startDate endDate')
      .populate('paymentHistory.paymentId', 'amount paymentDate paymentMethod reference status')
      .lean();

    if (!invoice) {
      return null;
    }

    // Update status if needed (check if overdue)
    const currentDate = new Date();
    if (invoice.status === 'sent' && new Date(invoice.dueDate) < currentDate) {
      await Invoice.findByIdAndUpdate(id, { status: 'overdue' });
      invoice.status = 'overdue';
    }

    return serializeData(invoice);

  } catch (error) {
    console.error('Error fetching invoice details:', error);
    return null;
  }
}

export default async function InvoiceDetailPage({ params }) {
  const invoice = await getInvoiceWithDetails(params.id);
  
  if (!invoice) {
    notFound();
  }
  
  const data = {
    invoice
  };
  
  return <InvoiceDetailClient invoiceData={data} />;
}

export async function generateMetadata({ params }) {
  const invoice = await getInvoiceWithDetails(params.id);
  
  if (!invoice) {
    return {
      title: 'Invoice Not Found',
    };
  }
  
  const tenantName = invoice.tenantId?.name || 
    `${invoice.tenantId?.firstName || ''} ${invoice.tenantId?.lastName || ''}`.trim() || 
    'Unknown Tenant';
  
  return {
    title: `Invoice ${invoice.invoiceNumber} - ${tenantName}`,
    description: `Invoice details for ${tenantName} - ${invoice.status} - ${invoice.total ? `Total: ${invoice.total}` : ''}`,
  };
}
