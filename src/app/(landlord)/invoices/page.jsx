// src/app/invoices/page.js
import dbConnect from 'lib/db';
// import Invoice from 'models/Invoice';
// import User from 'models/User';
// import Property from 'models/Property';
import InvoicesClient from './InvoicesClient';
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

async function getInvoicesWithFilters(searchParams) {
  try {
    await dbConnect();
    
    // Build query based on search parameters
    const query = {};
    const sort = { createdAt: -1 }; // Default sort by newest first
    
    // Search functionality
    if (searchParams.search) {
      const searchRegex = new RegExp(searchParams.search, 'i');
      query.$or = [
        { invoiceNumber: searchRegex },
        // We'll also search tenant names through aggregation
      ];
    }
    
    // Status filter
    if (searchParams.status) {
      query.status = searchParams.status;
    }
    
    // Date range filter
    if (searchParams.dateFrom || searchParams.dateTo) {
      query.issueDate = {};
      if (searchParams.dateFrom) {
        query.issueDate.$gte = new Date(searchParams.dateFrom);
      }
      if (searchParams.dateTo) {
        const toDate = new Date(searchParams.dateTo);
        toDate.setHours(23, 59, 59, 999); // End of day
        query.issueDate.$lte = toDate;
      }
    }
    
    // Tenant filter
    if (searchParams.tenant) {
      query.tenantId = searchParams.tenant;
    }

    // Fetch invoices with populated references
    let invoicesQuery = Invoice.find(query)
      .populate('tenantId', 'name firstName lastName email phone')
      .populate('propertyId', 'address name type bedrooms bathrooms')
      .populate('leaseId', 'monthlyRent startDate endDate')
      .sort(sort)
      .lean();

    // Apply pagination if needed (for large datasets)
    const page = parseInt(searchParams.page) || 1;
    const limit = parseInt(searchParams.limit) || 50;
    const skip = (page - 1) * limit;

    const invoices = await invoicesQuery.skip(skip).limit(limit);

    // Update overdue status for sent invoices
    const currentDate = new Date();
    const overdueInvoices = invoices.filter(invoice => 
      invoice.status === 'sent' && new Date(invoice.dueDate) < currentDate
    );

    // Update overdue invoices in database
    if (overdueInvoices.length > 0) {
      await Invoice.updateMany(
        { 
          _id: { $in: overdueInvoices.map(inv => inv._id) },
          status: 'sent',
          dueDate: { $lt: currentDate }
        },
        { status: 'overdue' }
      );

      // Update the status in our local data
      overdueInvoices.forEach(invoice => {
        invoice.status = 'overdue';
      });
    }

    // If searching by tenant name, filter results
    if (searchParams.search && !searchParams.tenant) {
      const searchLower = searchParams.search.toLowerCase();
      const filteredInvoices = invoices.filter(invoice => {
        const tenantName = invoice.tenantId?.name || 
          `${invoice.tenantId?.firstName || ''} ${invoice.tenantId?.lastName || ''}`.trim();
        return tenantName.toLowerCase().includes(searchLower) ||
               invoice.invoiceNumber.toLowerCase().includes(searchLower);
      });
      return serializeData(filteredInvoices);
    }

    return serializeData(invoices);

  } catch (error) {
    console.error('Error fetching invoices:', error);
    return [];
  }
}

async function getInvoicesSummary() {
  try {
    await dbConnect();
    
    // Get summary statistics
    const totalInvoices = await Invoice.countDocuments();
    const statusCounts = await Invoice.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$total' }
        }
      }
    ]);

    const summary = {
      total: totalInvoices,
      statusBreakdown: statusCounts.reduce((acc, item) => {
        acc[item._id] = {
          count: item.count,
          amount: item.totalAmount
        };
        return acc;
      }, {}),
    };

    return serializeData(summary);

  } catch (error) {
    console.error('Error fetching invoices summary:', error);
    return {
      total: 0,
      statusBreakdown: {}
    };
  }
}

export default async function InvoicesPage({ searchParams }) {
  // Fetch invoices and summary data in parallel
  const [invoices, summary] = await Promise.all([
    getInvoicesWithFilters(searchParams),
    getInvoicesSummary()
  ]);

  const data = {
    invoices,
    summary,
    searchParams
  };

  return <InvoicesClient initialData={data} />;
}

export async function generateMetadata({ searchParams }) {
  const statusFilter = searchParams.status;
  const searchFilter = searchParams.search;
  
  let title = 'Invoices - Property Management';
  
  if (statusFilter) {
    title = `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Invoices - Property Management`;
  } else if (searchFilter) {
    title = `Search: "${searchFilter}" - Invoices - Property Management`;
  }

  return {
    title,
    description: 'Manage property rental invoices, track payments, and monitor billing status',
  };
}