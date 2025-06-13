// src/app/api/dashboard/analytics/route.js
import { NextResponse } from 'next/server';
import dbConnect from 'lib/db';
import Property from 'models/Property';
import Lease from 'models/Lease';
import Payment from 'models/Payment';
import User from 'models/User';

export async function GET(request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'current'; // current, last3months, last6months, year
    
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const startOfLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const endOfLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);

    // Define date ranges based on period
    let dateRange = {};
    switch (period) {
      case 'last3months':
        dateRange = {
          $gte: new Date(currentDate.getFullYear(), currentDate.getMonth() - 3, 1)
        };
        break;
      case 'last6months':
        dateRange = {
          $gte: new Date(currentDate.getFullYear(), currentDate.getMonth() - 6, 1)
        };
        break;
      case 'year':
        dateRange = {
          $gte: new Date(currentDate.getFullYear(), 0, 1)
        };
        break;
      default:
        dateRange = { $gte: startOfMonth };
    }

    // Fetch comprehensive data
    const [
      propertiesData,
      leasesData,
      paymentsData,
      usersData,
      maintenanceData
    ] = await Promise.all([
      // Properties with detailed info
      Property.aggregate([
        {
          $lookup: {
            from: 'leases',
            localField: '_id',
            foreignField: 'propertyId',
            as: 'leases'
          }
        },
        {
          $addFields: {
            isOccupied: { $gt: [{ $size: '$leases' }, 0] },
            activeLeases: {
              $filter: {
                input: '$leases',
                cond: { $eq: ['$$this.status', 'active'] }
              }
            }
          }
        }
      ]),

      // Leases with payment history
      Lease.find({})
        .populate('tenantId', 'firstName lastName name email phone')
        .populate('propertyId', 'address name type')
        .lean(),

      // Payments for the period
      Payment.find({
        paymentDate: dateRange
      })
        .populate('tenantId', 'firstName lastName name')
        .populate('propertyId', 'address name')
        .lean(),

      // Users data
      User.find({}).lean(),

      // Maintenance requests (if you have a Maintenance model)
      // Maintenance.find({}).lean() // Uncomment if you have maintenance model
      []
    ]);

    // Calculate basic stats
    const totalProperties = propertiesData.length;
    const occupiedProperties = propertiesData.filter(p => p.activeLeases.length > 0).length;
    const activeLeases = leasesData.filter(l => l.status === 'active');
    const activeTenants = activeLeases.length;

    // Calculate financial metrics
    const totalMonthlyRent = activeLeases.reduce((sum, lease) => sum + (lease.monthlyRent || 0), 0);
    const occupancyRate = totalProperties > 0 ? Math.round((occupiedProperties / totalProperties) * 100) : 0;

    // Calculate overdue information
    const currentDateForOverdue = new Date();
    let overdueRentals = 0;
    let overdueAmount = 0;
    const overdueDetails = [];

    activeLeases.forEach(lease => {
      const balanceDue = lease.balanceDue || 0;
      const nextPaymentDue = lease.nextPaymentDue ? new Date(lease.nextPaymentDue) : null;
      
      if (balanceDue > 0 && nextPaymentDue && nextPaymentDue < currentDateForOverdue) {
        overdueRentals++;
        overdueAmount += balanceDue;
        
        const daysOverdue = Math.floor((currentDateForOverdue - nextPaymentDue) / (1000 * 60 * 60 * 24));
        
        overdueDetails.push({
          leaseId: lease._id,
          tenantName: lease.tenantId?.name || `${lease.tenantId?.firstName} ${lease.tenantId?.lastName}`,
          propertyAddress: lease.propertyId?.address,
          amount: balanceDue,
          daysOverdue,
          nextPaymentDue: nextPaymentDue
        });
      }
    });

    // Calculate payment statistics
    const thisMonthPayments = paymentsData.filter(p => p.paymentDate >= startOfMonth);
    const lastMonthPayments = paymentsData.filter(p => 
      p.paymentDate >= startOfLastMonth && p.paymentDate <= endOfLastMonth
    );

    const thisMonthCollected = thisMonthPayments
      .filter(p => p.status === 'verified')
      .reduce((sum, payment) => sum + (payment.amount || 0), 0);

    const lastMonthCollected = lastMonthPayments
      .filter(p => p.status === 'verified')
      .reduce((sum, payment) => sum + (payment.amount || 0), 0);

    const pendingPayments = await Payment.countDocuments({ status: 'pending' });
    const disputedPayments = await Payment.countDocuments({ status: 'disputed' });

    // Calculate collection rate and trends
    const collectionRate = totalMonthlyRent > 0 
      ? Math.round((thisMonthCollected / totalMonthlyRent) * 100) 
      : 0;

    const collectionTrend = lastMonthCollected > 0
      ? Math.round(((thisMonthCollected - lastMonthCollected) / lastMonthCollected) * 100)
      : 0;

    // Property type breakdown
    const propertyTypeBreakdown = propertiesData.reduce((acc, property) => {
      const type = property.type || 'Unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    // Payment method breakdown for this period
    const paymentMethodBreakdown = paymentsData.reduce((acc, payment) => {
      const method = payment.paymentMethod || 'unknown';
      acc[method] = (acc[method] || 0) + 1;
      return acc;
    }, {});

    // Monthly revenue trend (last 6 months)
    const monthlyRevenue = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 0);
      
      const monthPayments = paymentsData.filter(p => 
        p.paymentDate >= monthStart && 
        p.paymentDate <= monthEnd && 
        p.status === 'verified'
      );
      
      const monthTotal = monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      
      monthlyRevenue.push({
        month: monthStart.toISOString().slice(0, 7), // YYYY-MM format
        revenue: monthTotal,
        paymentCount: monthPayments.length
      });
    }

    // Lease expiration alerts (next 90 days)
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
    
    const expiringLeases = activeLeases.filter(lease => {
      const endDate = lease.endDate ? new Date(lease.endDate) : null;
      return endDate && endDate <= ninetyDaysFromNow && endDate >= currentDate;
    }).map(lease => ({
      leaseId: lease._id,
      tenantName: lease.tenantId?.name || `${lease.tenantId?.firstName} ${lease.tenantId?.lastName}`,
      propertyAddress: lease.propertyId?.address,
      endDate: lease.endDate,
      daysUntilExpiry: Math.floor((new Date(lease.endDate) - currentDate) / (1000 * 60 * 60 * 24))
    }));

    // Compile comprehensive response
    const analytics = {
      // Core dashboard stats
      summary: {
        properties: totalProperties,
        tenants: activeTenants,
        rent: totalMonthlyRent,
        occupancy: occupancyRate,
        overdueRentals,
        overdueAmount,
        thisMonthCollected,
        collectionRate,
        pendingPayments,
        disputedPayments
      },

      // Trends and comparisons
      trends: {
        collectionTrend,
        monthlyRevenue,
        lastMonthCollected,
        thisMonthPaymentCount: thisMonthPayments.length
      },

      // Detailed breakdowns
      breakdowns: {
        propertyTypes: propertyTypeBreakdown,
        paymentMethods: paymentMethodBreakdown,
        occupancyByType: propertiesData.reduce((acc, prop) => {
          const type = prop.type || 'Unknown';
          if (!acc[type]) acc[type] = { total: 0, occupied: 0 };
          acc[type].total++;
          if (prop.activeLeases.length > 0) acc[type].occupied++;
          return acc;
        }, {})
      },

      // Alerts and notifications
      alerts: {
        overdueDetails: overdueDetails.sort((a, b) => b.daysOverdue - a.daysOverdue),
        expiringLeases: expiringLeases.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry),
        pendingPaymentsCount: pendingPayments,
        disputedPaymentsCount: disputedPayments
      },

      // Meta information
      meta: {
        lastUpdated: new Date().toISOString(),
        currency: 'ZMW',
        period: period,
        dateRange: {
          start: dateRange.$gte?.toISOString(),
          end: currentDate.toISOString()
        }
      }
    };

    return NextResponse.json(analytics);

  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch dashboard analytics',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}