// app/invoices/page.js - Server Component
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import dbConnect from 'lib/db';
import InvoicesClient from './InvoicesClient';
// Import models
import Invoice from 'models';
import User from 'models';
import Property from 'models';
import Lease from 'models';
import Payment from 'models';
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

// Server function to get invoices with role-based filtering
async function getInvoicesWithFilters(searchParams, userId, userRole) {
  try {
    await dbConnect();
    
    const { Invoice, Property } = getModels();
    
    // Build base query based on user role
    let baseQuery = {};
    
    if (userRole === 'tenant') {
      // Tenants can only see their own invoices
      baseQuery.tenant = userId;
    } else if (userRole === 'landlord') {
      // Landlords can only see invoices for their properties
      const landlordProperties = await Property.find({ 
        landlord: userId 
      }).select('_id').lean();
      
      baseQuery.property = { 
        $in: landlordProperties.map(p => p._id) 
      };
    }
    // Managers and admins can see all invoices (no additional filtering)
    
    // Apply search filters
    const query = { ...baseQuery };
    const sort = { createdAt: -1 }; // Default sort by newest first
    
    // Search functionality
    if (searchParams.search) {
      const searchRegex = new RegExp(searchParams.search, 'i');
      query.$or = [
        { invoiceNumber: searchRegex },
        // We'll also search tenant names after population
      ];
    }
    
    // Status filter
    if (searchParams.status && searchParams.status !== 'all') {
      query.status = searchParams.status;
    }

    // Approval status filter
    if (searchParams.approvalStatus && searchParams.approvalStatus !== 'all') {
      query.approvalStatus = searchParams.approvalStatus;
    }
    
    // Date range filter for issue date
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

    // Date range filter for due date
    if (searchParams.dueDateFrom || searchParams.dueDateTo) {
      query.dueDate = {};
      if (searchParams.dueDateFrom) {
        query.dueDate.$gte = new Date(searchParams.dueDateFrom);
      }
      if (searchParams.dueDateTo) {
        const toDate = new Date(searchParams.dueDateTo);
        toDate.setHours(23, 59, 59, 999);
        query.dueDate.$lte = toDate;
      }
    }
    
    // Tenant filter (for managers/admins)
    if (searchParams.tenant && ['manager', 'admin'].includes(userRole)) {
      query.tenant = searchParams.tenant;
    }

    // Property filter (for managers/admins)
    if (searchParams.property && ['manager', 'admin'].includes(userRole)) {
      query.property = searchParams.property;
    }

    // Outstanding invoices filter
    if (searchParams.outstanding === 'true') {
      query.status = { $in: ['sent', 'viewed', 'overdue'] };
      query.$expr = { $lt: ['$paidAmount', '$totalAmount'] };
    }

    // Overdue filter
    if (searchParams.overdue === 'true') {
      query.status = 'overdue';
      query.dueDate = { $lt: new Date() };
    }

    // Pagination
    const page = parseInt(searchParams.page) || 1;
    const limit = parseInt(searchParams.limit) || 50;
    const skip = (page - 1) * limit;

    // Fetch invoices with populated references
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

    // Update overdue status for sent/viewed invoices that are past due
    const currentDate = new Date();
    const overdueInvoices = invoices.filter(invoice => 
      ['sent', 'viewed'].includes(invoice.status) && 
      new Date(invoice.dueDate) < currentDate &&
      invoice.paidAmount < invoice.totalAmount
    );

    // Update overdue invoices in database
    if (overdueInvoices.length > 0) {
      await Invoice.updateMany(
        { 
          _id: { $in: overdueInvoices.map(inv => inv._id) },
          status: { $in: ['sent', 'viewed'] },
          dueDate: { $lt: currentDate }
        },
        { status: 'overdue' }
      );

      // Update the status in our local data
      overdueInvoices.forEach(invoice => {
        invoice.status = 'overdue';
      });
    }

    // Apply search filter to tenant names (after population)
    if (searchParams.search && !searchParams.tenant) {
      const searchLower = searchParams.search.toLowerCase();
      invoices = invoices.filter(invoice => {
        const tenantName = invoice.tenant?.name || 
          `${invoice.tenant?.firstName || ''} ${invoice.tenant?.lastName || ''}`.trim();
        const propertyAddress = invoice.property?.address || '';
        
        return invoice.invoiceNumber.toLowerCase().includes(searchLower) ||
               tenantName.toLowerCase().includes(searchLower) ||
               propertyAddress.toLowerCase().includes(searchLower);
      });
    }

    // Get total count for pagination
    const totalCount = await Invoice.countDocuments(query);

    return {
      invoices: serializeData(invoices),
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1
      }
    };

  } catch (error) {
    console.error('Error fetching invoices:', error);
    return {
      invoices: [],
      pagination: {
        page: 1,
        limit: 50,
        total: 0,
        pages: 0,
        hasNextPage: false,
        hasPrevPage: false
      }
    };
  }
}

// Server function to get invoices summary with role-based filtering
async function getInvoicesSummary(userId, userRole) {
  try {
    await dbConnect();
    
    const { Invoice, Property } = getModels();
    
    // Build base query based on user role
    let baseQuery = {};
    
    if (userRole === 'tenant') {
      baseQuery.tenant = userId;
    } else if (userRole === 'landlord') {
      const landlordProperties = await Property.find({ 
        landlord: userId 
      }).select('_id').lean();
      
      baseQuery.property = { 
        $in: landlordProperties.map(p => p._id) 
      };
    }
    
    // Get summary statistics
    const [totalInvoices, statusCounts, overdueCount, monthlyStats] = await Promise.all([
      Invoice.countDocuments(baseQuery),
      
      Invoice.aggregate([
        { $match: baseQuery },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' },
            paidAmount: { $sum: '$paidAmount' }
          }
        }
      ]),

      Invoice.countDocuments({
        ...baseQuery,
        status: 'overdue',
        dueDate: { $lt: new Date() }
      }),

      Invoice.aggregate([
        { $match: baseQuery },
        {
          $group: {
            _id: {
              year: { $year: '$issueDate' },
              month: { $month: '$issueDate' }
            },
            count: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' },
            paidAmount: { $sum: '$paidAmount' }
          }
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 12 }
      ])
    ]);

    const summary = {
      total: totalInvoices,
      overdue: overdueCount,
      statusBreakdown: statusCounts.reduce((acc, item) => {
        acc[item._id] = {
          count: item.count,
          totalAmount: item.totalAmount,
          paidAmount: item.paidAmount,
          outstandingAmount: item.totalAmount - item.paidAmount
        };
        return acc;
      }, {}),
      monthlyTrends: monthlyStats.map(stat => ({
        year: stat._id.year,
        month: stat._id.month,
        count: stat.count,
        totalAmount: stat.totalAmount,
        paidAmount: stat.paidAmount,
        outstandingAmount: stat.totalAmount - stat.paidAmount
      })),
      totals: statusCounts.reduce((acc, item) => {
        acc.totalAmount += item.totalAmount;
        acc.paidAmount += item.paidAmount;
        acc.outstandingAmount += (item.totalAmount - item.paidAmount);
        return acc;
      }, { totalAmount: 0, paidAmount: 0, outstandingAmount: 0 })
    };

    return serializeData(summary);

  } catch (error) {
    console.error('Error fetching invoices summary:', error);
    return {
      total: 0,
      overdue: 0,
      statusBreakdown: {},
      monthlyTrends: [],
      totals: { totalAmount: 0, paidAmount: 0, outstandingAmount: 0 }
    };
  }
}

// Server function to get filter options
async function getFilterOptions(userId, userRole) {
  try {
    await dbConnect();
    
    const { User, Property } = getModels();
    
    let tenants = [];
    let properties = [];

    if (userRole === 'tenant') {
      // Tenants don't need filter options
      return { tenants: [], properties: [] };
    } else if (userRole === 'landlord') {
      // Get landlord's properties and their tenants
      const landlordProperties = await Property.find({ 
        landlord: userId 
      }).select('_id address name').lean();
      
      properties = landlordProperties;

      // Get tenants from active leases on landlord's properties
      const { Lease } = getModels();
      const propertyIds = landlordProperties.map(p => p._id);
      
      const activeLeases = await Lease.find({
        property: { $in: propertyIds },
        status: 'active'
      }).populate('tenant', 'name firstName lastName email').lean();

      // Extract unique tenants
      const tenantMap = new Map();
      activeLeases.forEach(lease => {
        if (lease.tenant) {
          tenantMap.set(lease.tenant._id.toString(), lease.tenant);
        }
      });
      
      tenants = Array.from(tenantMap.values());
    } else if (['manager', 'admin'].includes(userRole)) {
      // Get all tenants and properties for managers/admins
      [tenants, properties] = await Promise.all([
        User.find({ role: 'tenant' }).select('name firstName lastName email').lean(),
        Property.find({}).select('address name type').lean()
      ]);
    }

    return serializeData({ tenants, properties });

  } catch (error) {
    console.error('Error fetching filter options:', error);
    return { tenants: [], properties: [] };
  }
}

// Main server component
export default async function InvoicesPage({ searchParams }) {
  // Get session and check authentication
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/login');
  }

  // Check if user has access to invoices
  const allowedRoles = ['tenant', 'landlord', 'manager', 'admin'];
  if (!allowedRoles.includes(session.user.role)) {
    redirect('/dashboard');
  }

  // Await searchParams for Next.js 15 compatibility
  const params = await searchParams;

  // Fetch all data in parallel
  const [invoicesData, summary, filterOptions] = await Promise.all([
    getInvoicesWithFilters(params, session.user.id, session.user.role),
    getInvoicesSummary(session.user.id, session.user.role),
    getFilterOptions(session.user.id, session.user.role)
  ]);

  const data = {
    invoices: invoicesData.invoices,
    pagination: invoicesData.pagination,
    summary,
    filterOptions,
    searchParams: params,
    userRole: session.user.role,
    userId: session.user.id
  };

  return <InvoicesClient initialData={data} />;
}

// Generate metadata
export async function generateMetadata({ searchParams }) {
  const params = await searchParams;
  const statusFilter = params.status;
  const searchFilter = params.search;
  
  let title = 'Invoices - Property Management';
  let description = 'Manage property rental invoices, track payments, and monitor billing status';
  
  if (statusFilter && statusFilter !== 'all') {
    const statusName = statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1);
    title = `${statusName} Invoices - Property Management`;
    description = `View and manage ${statusName.toLowerCase()} invoices for property rentals`;
  } else if (searchFilter) {
    title = `Search: "${searchFilter}" - Invoices - Property Management`;
    description = `Search results for "${searchFilter}" in invoice management`;
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website'
    }
  };
}

// Page configuration
export const dynamic = 'force-dynamic'; // Ensure fresh data
export const revalidate = 0; // Don't cache this page