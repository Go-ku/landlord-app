import dbConnect from 'lib/db';
import Property from 'models/properties';
import Lease from 'models/leases';
import Payment from 'models/payments';
import User from 'models/users';

export async function fetchDashboardStats() {
  try {
    await dbConnect();

    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

    // Fetch all relevant data in parallel
    const [
      propertiesCount,
      activeLeases,
      thisMonthPayments,
      tenants
    ] = await Promise.all([
      Property.countDocuments(),
      Lease.find({ status: 'active' }).populate('tenantId').populate('propertyId').lean(),
      Payment.find({ status: 'verified', paymentDate: { $gte: startOfMonth } }).lean(),
      User.find({ role: 'tenant' }).lean()
    ]);

    // Derived metrics
    const activeTenants = tenants.length;

    const totalMonthlyRent = activeLeases.reduce((sum, lease) => {
      return sum + (lease.monthlyRent || 0);
    }, 0);

    const occupancyRate = propertiesCount > 0
      ? Math.round((activeLeases.length / propertiesCount) * 100)
      : 0;

    let overdueRentals = 0;
    let overdueAmount = 0;

    activeLeases.forEach(lease => {
      const balanceDue = lease.balanceDue || 0;
      const nextPaymentDue = lease.nextPaymentDue ? new Date(lease.nextPaymentDue) : null;

      if (balanceDue > 0 && nextPaymentDue && nextPaymentDue < currentDate) {
        overdueRentals++;
        overdueAmount += balanceDue;
      }
    });

    const thisMonthCollected = thisMonthPayments.reduce((sum, payment) => {
      return sum + (payment.amount || 0);
    }, 0);

    const [pendingPayments, disputedPayments] = await Promise.all([
      Payment.countDocuments({ status: 'pending' }),
      Payment.countDocuments({ status: 'disputed' })
    ]);

    const expectedThisMonth = totalMonthlyRent;
    const collectionRate = expectedThisMonth > 0
      ? Math.round((thisMonthCollected / expectedThisMonth) * 100)
      : 0;

    return {
      properties: propertiesCount,
      tenants: activeTenants,
      rent: totalMonthlyRent,
      occupancy: occupancyRate,
      overdueRentals,
      overdueAmount,
      thisMonthCollected,
      collectionRate,
      pendingPayments,
      disputedPayments,
      lastUpdated: new Date().toISOString(),
      currency: 'ZMW'
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return {
      error: 'Failed to fetch dashboard stats',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    };
  }
}
