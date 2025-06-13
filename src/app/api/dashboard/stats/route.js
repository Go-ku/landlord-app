// src/app/api/dashboard/stats/route.js
import { NextResponse } from 'next/server';
import dbConnect from 'lib/db';
import Property from 'models/Property';
import Lease from 'models/Lease';
import Payment from 'models/Payment';
import User from 'models/User';
import dashboardCache, { generateCacheKey, getCachedStats } from 'lib/dashboardCache';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';
    
    // Generate cache key
    const cacheKey = generateCacheKey('dashboard-stats');
    
    // If not forcing refresh, try to get from cache
    if (!forceRefresh) {
      const cachedStats = dashboardCache.get(cacheKey);
      if (cachedStats) {
        return NextResponse.json({
          ...cachedStats,
          cached: true,
          lastUpdated: cachedStats.lastUpdated
        });
      }
    }

    // Fetch fresh data
    const stats = await getCachedStats(
      cacheKey,
      fetchDashboardStats,
      5 * 60 * 1000 // 5 minutes cache
    );

    return NextResponse.json({
      ...stats,
      cached: false
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch dashboard statistics',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

async function fetchDashboardStats() {
    await dbConnect();

    // Get current date for overdue calculations
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

    // Fetch all required data in parallel
    const [
      propertiesCount,
      activeLeases,
      allProperties,
      thisMonthPayments,
      allUsers
    ] = await Promise.all([
      // Total properties count
      Property.countDocuments({}),
      
      // Active leases with populated data
      Lease.find({ status: 'active' })
        .populate('tenantId', 'firstName lastName name email')
        .populate('propertyId', 'address name')
        .lean(),
      
      // All properties for occupancy calculation
      Property.find({}).lean(),
      
      // This month's verified payments
      Payment.find({
        status: 'verified',
        paymentDate: { $gte: startOfMonth }
      }).lean(),
      
      // All users (to count tenants)
      User.find({ role: 'tenant' }).lean()
    ]);

    // Calculate active tenants (unique tenants with active leases)
    const activeTenants = activeLeases.length;

    // Calculate total monthly rent from active leases
    const totalMonthlyRent = activeLeases.reduce((sum, lease) => {
      return sum + (lease.monthlyRent || 0);
    }, 0);

    // Calculate occupancy rate
    const occupancyRate = propertiesCount > 0 
      ? Math.round((activeLeases.length / propertiesCount) * 100) 
      : 0;

    // Calculate overdue rentals and amounts
    let overdueRentals = 0;
    let overdueAmount = 0;

    activeLeases.forEach(lease => {
      const balanceDue = lease.balanceDue || 0;
      const nextPaymentDue = lease.nextPaymentDue ? new Date(lease.nextPaymentDue) : null;
      
      // Consider overdue if there's a balance and the due date has passed
      if (balanceDue > 0 && nextPaymentDue && nextPaymentDue < currentDate) {
        overdueRentals++;
        overdueAmount += balanceDue;
      }
    });

    // Calculate this month's collected rent
    const thisMonthCollected = thisMonthPayments.reduce((sum, payment) => {
      return sum + (payment.amount || 0);
    }, 0);

    // Additional useful stats
    const pendingPayments = await Payment.countDocuments({ status: 'pending' });
    const disputedPayments = await Payment.countDocuments({ status: 'disputed' });

    // Calculate collection rate (this month collected vs expected)
    const expectedThisMonth = totalMonthlyRent;
    const collectionRate = expectedThisMonth > 0 
      ? Math.round((thisMonthCollected / expectedThisMonth) * 100) 
      : 0;

    // Prepare response data
    const stats = {
      // Core stats
      properties: propertiesCount,
      tenants: activeTenants,
      rent: totalMonthlyRent,
      occupancy: occupancyRate,
      overdueRentals,
      overdueAmount,
      
      // Additional stats
      thisMonthCollected,
      collectionRate,
      pendingPayments,
      disputedPayments,
      
      // Meta information
      lastUpdated: new Date().toISOString(),
      currency: 'ZMW'
    };

    return stats;
}

// Optional: Add caching for better performance
export async function POST() {
  // This endpoint can be used to manually refresh cached stats
  try {
    const cacheKey = generateCacheKey('dashboard-stats');
    dashboardCache.delete(cacheKey); // Clear cache
    
    const freshStats = await fetchDashboardStats();
    dashboardCache.set(cacheKey, freshStats, 5 * 60 * 1000);
    
    return NextResponse.json({
      ...freshStats,
      refreshed: true,
      message: 'Dashboard stats refreshed successfully'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to refresh dashboard stats' },
      { status: 500 }
    );
  }
}