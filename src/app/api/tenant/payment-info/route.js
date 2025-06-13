// app/api/tenant/payment-info/route.js
import { getToken } from 'next-auth/jwt';
import User from 'models/User';
import Payment from 'models/StripePayment';
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

// GET - Fetch tenant's payment information (for making payments)
export async function GET(request) {
  try {
    const token = await getUserFromToken(request);
    
    if (!token?.id) {
      return Response.json({ error: 'Unauthorized - No valid session' }, { status: 401 });
    }

    // Only allow tenants
    if (token.role !== 'tenant') {
      return Response.json({ error: 'Forbidden - Tenant access only' }, { status: 403 });
    }

    await dbConnect();

    // Get tenant with property and lease info
    const tenant = await User.findById(token.id)
      .populate({
        path: 'currentProperty',
        select: 'address type monthlyRent landlord'
      })
      .populate({
        path: 'currentLease',
        select: 'monthlyRent startDate endDate status balanceDue',
        populate: {
          path: 'landlordId',
          select: 'name email phone'
        }
      })
      .select('-password')
      .lean();

    if (!tenant) {
      return Response.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Get upcoming payments (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const upcomingPayments = await Payment.find({
      tenantId: tenant._id,
      dueDate: { 
        $gte: new Date(), 
        $lte: thirtyDaysFromNow 
      },
      status: { $nin: ['completed', 'paid', 'cancelled'] }
    })
    .sort({ dueDate: 1 })
    .limit(5)
    .lean();

    // Calculate balance due (if any)
    const totalUnpaid = await Payment.aggregate([
      {
        $match: {
          tenantId: tenant._id,
          status: { $nin: ['completed', 'paid', 'cancelled'] },
          dueDate: { $lt: new Date() }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const balanceDue = totalUnpaid.length > 0 ? totalUnpaid[0].total : 0;

    // Format upcoming payments for display
    const formattedUpcomingPayments = upcomingPayments.map(payment => ({
      type: payment.paymentType === 'rent' ? 'Monthly Rent' : 
            payment.paymentType === 'utilities' ? 'Utilities' :
            payment.paymentType === 'fees' ? 'Late Fees' : 'Payment',
      amount: payment.amount,
      dueDate: payment.dueDate,
      id: payment._id
    }));

    return Response.json({
      success: true,
      data: {
        tenant: {
          _id: tenant._id,
          name: tenant.name,
          email: tenant.email,
          phone: tenant.phone
        },
        property: tenant.currentProperty,
        lease: tenant.currentLease,
        balanceDue,
        upcomingPayments: formattedUpcomingPayments
      }
    });

  } catch (error) {
    console.error('Error fetching tenant payment info:', error);
    return Response.json({ 
      error: 'Failed to fetch payment information',
      details: error.message 
    }, { status: 500 });
  }
}