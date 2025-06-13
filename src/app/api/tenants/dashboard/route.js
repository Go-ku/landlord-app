// app/api/tenant/dashboard/route.js
import { getToken } from 'next-auth/jwt';
import User from 'models/User';
import Payment from 'models/StripePayment';
import Maintenance from 'models/Maintenance';
import Property from 'models/Property';
import Lease from 'models/Lease';
import dbConnect from 'lib/db';

async function getUserFromToken(request) {
  try {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    });
    return token;
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
}

// GET - Fetch tenant dashboard data
export async function GET(request) {
  try {
    const token = await getUserFromToken(request);
    
    if (!token?.id) {
      return Response.json({ error: 'Unauthorized - No valid session' }, { status: 401 });
    }

    // Only allow tenants to access this endpoint
    if (token.role !== 'tenant') {
      return Response.json({ error: 'Forbidden - Tenant access only' }, { status: 403 });
    }

    await dbConnect();

    // Get the tenant user with populated property and lease info
    const user = await User.findById(token.id)
      .populate({
        path: 'currentProperty',
        select: 'address type monthlyRent landlord amenities'
      })
      .populate({
        path: 'currentLease',
        select: 'monthlyRent startDate endDate status',
        populate: {
          path: 'landlordId',
          select: 'name email phone company'
        }
      })
      .select('-password')
      .lean();

    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Get lease information separately if not populated through user
    let lease = user.currentLease;
    if (!lease && user.currentProperty) {
      lease = await Lease.findOne({ 
        tenantId: user._id, 
        propertyId: user.currentProperty._id,
        status: { $in: ['active', 'pending'] }
      })
      .populate('landlordId', 'name email phone company')
      .populate('propertyId', 'address type monthlyRent amenities')
      .lean();
    }

    // Get tenant's payments (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const payments = await Payment.find({ 
      tenantId: user._id,
      createdAt: { $gte: sixMonthsAgo }
    })
    .populate('propertyId', 'address')
    .sort({ dueDate: -1, createdAt: -1 })
    .limit(20)
    .lean();

    // Get tenant's maintenance requests (last 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const maintenanceRequests = await Maintenance.find({ 
      tenantId: user._id,
      dateReported: { $gte: threeMonthsAgo }
    })
    .populate('propertyId', 'address')
    .populate('assignedTo', 'name email')
    .sort({ dateReported: -1 })
    .limit(15)
    .lean();

    // Calculate statistics
    const currentDate = new Date();
    const upcomingPayments = payments.filter(p => 
      p.dueDate > currentDate && (p.status === 'pending' || p.status === 'upcoming')
    );
    const overduePayments = payments.filter(p => 
      p.dueDate < currentDate && p.status !== 'completed' && p.status !== 'paid'
    );
    const openMaintenanceRequests = maintenanceRequests.filter(r => 
      r.status !== 'completed' && r.status !== 'cancelled'
    );

    // Get upcoming lease expiry warning (within 60 days)
    const sixtyDaysFromNow = new Date();
    sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);
    const leaseExpiringSoon = lease && new Date(lease.endDate) <= sixtyDaysFromNow;

    // Calculate payment history stats
    const paidPayments = payments.filter(p => p.status === 'completed' || p.status === 'paid');
    const totalPaid = paidPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const averagePaymentTime = paidPayments.length > 0 
      ? paidPayments.reduce((sum, p) => {
          const daysLate = p.paidDate 
            ? Math.max(0, Math.floor((new Date(p.paidDate) - new Date(p.dueDate)) / (1000 * 60 * 60 * 24)))
            : 0;
          return sum + daysLate;
        }, 0) / paidPayments.length
      : 0;

    // Prepare dashboard data
    const dashboardData = {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        currentProperty: user.currentProperty,
        dateOfBirth: user.dateOfBirth,
        emergencyContact: user.emergencyContact
      },
      lease: lease || null,
      payments: payments.map(payment => ({
        ...payment,
        // Add helper flags for UI
        isUpcoming: payment.dueDate > currentDate && (payment.status === 'pending' || payment.status === 'upcoming'),
        isOverdue: payment.dueDate < currentDate && payment.status !== 'completed' && payment.status !== 'paid',
        daysPastDue: payment.dueDate < currentDate 
          ? Math.floor((currentDate - new Date(payment.dueDate)) / (1000 * 60 * 60 * 24))
          : 0
      })),
      maintenanceRequests: maintenanceRequests.map(request => ({
        ...request,
        isOpen: request.status !== 'completed' && request.status !== 'cancelled',
        daysSinceReported: Math.floor((currentDate - new Date(request.dateReported)) / (1000 * 60 * 60 * 24))
      })),
      stats: {
        // Payment stats
        totalPayments: payments.length,
        paidPayments: paidPayments.length,
        upcomingPayments: upcomingPayments.length,
        overduePayments: overduePayments.length,
        totalAmountPaid: totalPaid,
        averagePaymentDelay: Math.round(averagePaymentTime),
        
        // Maintenance stats
        totalMaintenanceRequests: maintenanceRequests.length,
        openMaintenanceRequests: openMaintenanceRequests.length,
        completedMaintenanceRequests: maintenanceRequests.filter(r => r.status === 'completed').length,
        
        // Lease stats
        leaseExpiringSoon,
        daysUntilLeaseExpiry: lease 
          ? Math.floor((new Date(lease.endDate) - currentDate) / (1000 * 60 * 60 * 24))
          : null,
        monthsInCurrentProperty: lease 
          ? Math.floor((currentDate - new Date(lease.startDate)) / (1000 * 60 * 60 * 24 * 30))
          : null
      },
      alerts: [
        // Payment alerts
        ...overduePayments.map(p => ({
          type: 'error',
          title: 'Overdue Payment',
          message: `Payment of $${p.amount} is ${Math.floor((currentDate - new Date(p.dueDate)) / (1000 * 60 * 60 * 24))} days overdue`,
          action: { text: 'Pay Now', href: `/tenant/payments/${p._id}` }
        })),
        
        // Upcoming payment alerts
        ...upcomingPayments.filter(p => {
          const daysUntilDue = Math.floor((new Date(p.dueDate) - currentDate) / (1000 * 60 * 60 * 24));
          return daysUntilDue <= 7; // Alert for payments due within 7 days
        }).map(p => ({
          type: 'warning',
          title: 'Payment Due Soon',
          message: `Payment of $${p.amount} is due ${new Date(p.dueDate).toLocaleDateString()}`,
          action: { text: 'Pay Now', href: `/tenant/payments/${p._id}` }
        })),
        
        // Lease expiry alert
        ...(leaseExpiringSoon ? [{
          type: 'info',
          title: 'Lease Expiring Soon',
          message: `Your lease expires on ${new Date(lease.endDate).toLocaleDateString()}`,
          action: { text: 'Contact Landlord', href: '/tenant/contact' }
        }] : []),
        
        // Open maintenance requests alert
        ...(openMaintenanceRequests.length > 0 ? [{
          type: 'info',
          title: 'Open Maintenance Requests',
          message: `You have ${openMaintenanceRequests.length} open maintenance request${openMaintenanceRequests.length > 1 ? 's' : ''}`,
          action: { text: 'View Requests', href: '/tenant/maintenance' }
        }] : [])
      ],
      quickActions: [
        {
          title: 'Make Payment',
          description: upcomingPayments.length > 0 
            ? `Pay $${upcomingPayments[0].amount} rent`
            : 'Make a payment',
          href: upcomingPayments.length > 0 
            ? `/tenant/payments/${upcomingPayments[0]._id}`
            : '/tenant/payments/new',
          urgent: overduePayments.length > 0
        },
        {
          title: 'Submit Maintenance Request',
          description: 'Report a property issue',
          href: '/tenant/maintenance/new',
          urgent: false
        },
        {
          title: 'View Lease',
          description: 'Review your lease agreement',
          href: '/tenant/lease',
          urgent: leaseExpiringSoon
        },
        {
          title: 'Contact Landlord',
          description: 'Get in touch with your landlord',
          href: '/tenant/contact',
          urgent: false
        }
      ]
    };

    return Response.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Error fetching tenant dashboard:', error);
    return Response.json({ 
      error: 'Failed to fetch dashboard data',
      details: error.message 
    }, { status: 500 });
  }
}