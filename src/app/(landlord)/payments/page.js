// app/payments/page.js - Fixed Payments Server Component
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import dbConnect from 'lib/db';
import PaymentsClient from './PaymentsClient';
// Import models
import User from 'models';
import Property from 'models';
import Lease from 'models';
import Payment from 'models';
import mongoose from 'mongoose';

// Helper function to get models
function getModels() {
  return {
    Payment: mongoose.model('Payment'),
    User: mongoose.model('User'),
    Property: mongoose.model('Property'),
    Lease: mongoose.model('Lease')
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

// Server function to get payments with role-based filtering
async function getPaymentsWithFilters(searchParams, userId, userRole) {
  try {
    await dbConnect();
    
    const { Payment, Property } = getModels();
    
    // Build base query based on user role
    let baseQuery = {};
    
    if (userRole === 'tenant') {
      baseQuery.tenant = userId;
    } else if (userRole === 'landlord') {
      // Get landlord's properties first
      const landlordProperties = await Property.find({ 
        landlord: userId 
      }).select('_id').lean();
      
      baseQuery.property = { 
        $in: landlordProperties.map(p => p._id) 
      };
    }
    // Managers and admins can see all payments (no additional filtering)
    
    // Apply search filters
    const query = { ...baseQuery };
    const sort = { createdAt: -1 }; // Default sort by newest first
    
    // Status filter
    if (searchParams.status && searchParams.status !== 'all') {
      if (searchParams.status === 'overdue') {
        query.dueDate = { $lt: new Date() };
        query.status = { $nin: ['completed', 'verified'] };
      } else {
        query.status = searchParams.status;
      }
    }

    // Approval status filter
    if (searchParams.approvalStatus && searchParams.approvalStatus !== 'all') {
      query.approvalStatus = searchParams.approvalStatus;
    }
    
    // Date range filter
    if (searchParams.dateFrom || searchParams.dateTo) {
      query.paymentDate = {};
      if (searchParams.dateFrom) {
        query.paymentDate.$gte = new Date(searchParams.dateFrom);
      }
      if (searchParams.dateTo) {
        const toDate = new Date(searchParams.dateTo);
        toDate.setHours(23, 59, 59, 999);
        query.paymentDate.$lte = toDate;
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

    // Amount range filter
    if (searchParams.minAmount || searchParams.maxAmount) {
      query.amount = {};
      if (searchParams.minAmount) {
        query.amount.$gte = parseFloat(searchParams.minAmount);
      }
      if (searchParams.maxAmount) {
        query.amount.$lte = parseFloat(searchParams.maxAmount);
      }
    }

    // Payment method filter
    if (searchParams.paymentMethod && searchParams.paymentMethod !== 'all') {
      query.paymentMethod = searchParams.paymentMethod;
    }

    // Sort configuration
    if (searchParams.sortBy) {
      switch (searchParams.sortBy) {
        case 'newest':
          sort.createdAt = -1;
          break;
        case 'oldest':
          sort.createdAt = 1;
          break;
        case 'amount_high':
          sort.amount = -1;
          break;
        case 'amount_low':
          sort.amount = 1;
          break;
        case 'date_recent':
          sort.paymentDate = -1;
          break;
        case 'date_old':
          sort.paymentDate = 1;
          break;
      }
    }

    // Pagination
    const page = parseInt(searchParams.page) || 1;
    const limit = parseInt(searchParams.limit) || 20;
    const skip = (page - 1) * limit;

    // Fetch payments with populated references
    const [payments, totalCount] = await Promise.all([
      Payment.find(query)
        .populate('tenant', 'name firstName lastName email phone')
        .populate('property', 'address name type')
        .populate('lease', 'monthlyRent startDate endDate')
        .populate('recordedBy', 'name firstName lastName email')
        .populate('approvedBy', 'name firstName lastName email')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Payment.countDocuments(query)
    ]);

    // Apply text search filter (after population for tenant names)
    let filteredPayments = payments;
    if (searchParams.search) {
      const searchLower = searchParams.search.toLowerCase();
      filteredPayments = payments.filter(payment => {
        const tenantName = payment.tenant?.name || 
          `${payment.tenant?.firstName || ''} ${payment.tenant?.lastName || ''}`.trim();
        const propertyAddress = payment.property?.address || payment.property?.name || '';
        
        return payment.receiptNumber?.toLowerCase().includes(searchLower) ||
               payment.referenceNumber?.toLowerCase().includes(searchLower) ||
               tenantName.toLowerCase().includes(searchLower) ||
               propertyAddress.toLowerCase().includes(searchLower) ||
               payment.amount?.toString().includes(searchParams.search);
      });
    }

    return {
      payments: serializeData(filteredPayments),
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
    console.error('Error fetching payments:', error);
    return {
      payments: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        pages: 0,
        hasNextPage: false,
        hasPrevPage: false
      }
    };
  }
}

// Server function to get payment statistics
async function getPaymentStatistics(userId, userRole) {
  try {
    await dbConnect();
    
    const { Payment, Property } = getModels();
    
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
    
    // Get comprehensive statistics
    const [statusStats, methodStats, monthlyStats] = await Promise.all([
      Payment.aggregate([
        { $match: baseQuery },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        }
      ]),
      
      Payment.aggregate([
        { $match: baseQuery },
        {
          $group: {
            _id: '$paymentMethod',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        }
      ]),
      
      Payment.aggregate([
        { $match: baseQuery },
        {
          $group: {
            _id: {
              year: { $year: '$paymentDate' },
              month: { $month: '$paymentDate' }
            },
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 12 }
      ])
    ]);

    // Calculate summary statistics
    const totalStats = statusStats.reduce((acc, stat) => {
      acc.totalCount += stat.count;
      acc.totalAmount += stat.totalAmount;
      return acc;
    }, { totalCount: 0, totalAmount: 0 });

    return serializeData({
      statusBreakdown: statusStats.reduce((acc, stat) => {
        acc[stat._id] = {
          count: stat.count,
          amount: stat.totalAmount
        };
        return acc;
      }, {}),
      methodBreakdown: methodStats.reduce((acc, stat) => {
        acc[stat._id] = {
          count: stat.count,
          amount: stat.totalAmount
        };
        return acc;
      }, {}),
      monthlyTrends: monthlyStats,
      totals: totalStats
    });

  } catch (error) {
    console.error('Error fetching payment statistics:', error);
    return {
      statusBreakdown: {},
      methodBreakdown: {},
      monthlyTrends: [],
      totals: { totalCount: 0, totalAmount: 0 }
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
export default async function PaymentsPage({ searchParams }) {
  // Get session and check authentication
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/login');
  }

  // Check if user has access to payments
  const allowedRoles = ['tenant', 'landlord', 'manager', 'admin'];
  if (!allowedRoles.includes(session.user.role)) {
    redirect('/dashboard');
  }

  // Await searchParams for Next.js 15 compatibility
  const params = await searchParams;

  // Fetch all data in parallel
  const [paymentsData, statistics, filterOptions] = await Promise.all([
    getPaymentsWithFilters(params, session.user.id, session.user.role),
    getPaymentStatistics(session.user.id, session.user.role),
    getFilterOptions(session.user.id, session.user.role)
  ]);

  const data = {
    payments: paymentsData.payments,
    pagination: paymentsData.pagination,
    statistics,
    filterOptions,
    searchParams: params,
    userRole: session.user.role,
    userId: session.user.id,
    userName: session.user.name
  };

  return <PaymentsClient initialData={data} />;
}

// Generate metadata
export async function generateMetadata({ searchParams }) {
  const params = await searchParams;
  const statusFilter = params.status;
  const searchFilter = params.search;
  
  let title = 'Payments - Property Management';
  let description = 'Manage rental payments, track payment status, and view payment history';
  
  if (statusFilter && statusFilter !== 'all') {
    const statusName = statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1);
    title = `${statusName} Payments - Property Management`;
    description = `View and manage ${statusName.toLowerCase()} payments for property rentals`;
  } else if (searchFilter) {
    title = `Search: "${searchFilter}" - Payments - Property Management`;
    description = `Search results for "${searchFilter}" in payment management`;
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
export const dynamic = 'force-dynamic';
export const revalidate = 0;