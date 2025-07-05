// app/api/tenant/lease/[leaseId]/payment/route.js - First payment processing
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from 'lib/db';
import Lease from 'models/Lease';
import Payment from 'models/Payment';
import Notification from 'models/Notification';

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'tenant') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { leaseId } = params;
    const { paymentAmount, paymentMethod, transactionId } = await request.json();

    const lease = await Lease.findOne({
      _id: leaseId,
      tenantId: session.user.id,
      status: 'signed'
    }).populate('landlordId propertyId');

    if (!lease) {
      return Response.json({ error: 'Lease not found or not eligible for payment' }, { status: 404 });
    }

    if (paymentAmount < lease.firstPaymentRequired) {
      return Response.json({ 
        error: `Insufficient payment amount. Required: $${lease.firstPaymentRequired}` 
      }, { status: 400 });
    }

    // Create payment record
    const payment = await Payment.create({
      tenant: session.user.id,
      property: lease.propertyId._id,
      lease: lease._id,
      amount: paymentAmount,
      paymentMethod: paymentMethod,
      transactionId: transactionId,
      paymentDate: new Date(),
      status: 'completed',
      type: 'first_payment',
      description: `First payment (Security deposit + First month rent)`
    });

    // Record payment in lease and activate
    lease.recordFirstPayment(paymentAmount, new Date());
    await lease.save();

    // Update user's current lease
    await User.findByIdAndUpdate(session.user.id, {
      currentLease: lease._id,
      currentProperty: lease.propertyId._id
    });

    // Create notifications
    await Notification.create({
      recipient: lease.landlordId._id,
      sender: session.user.id,
      type: 'payment_submitted',
      title: 'First Payment Received',
      message: `Tenant has made the first payment of $${paymentAmount}. Lease is now active.`,
      relatedLease: lease._id,
      relatedDocument: payment._id,
      relatedDocumentModel: 'Payment',
      actionRequired: false,
      priority: 'medium'
    });

    await Notification.create({
      recipient: session.user.id,
      type: 'lease_approved',
      title: 'Lease Activated!',
      message: 'Your lease is now active. Welcome to your new home!',
      relatedLease: lease._id,
      actionRequired: false,
      priority: 'high'
    });

    return Response.json({ 
      success: true, 
      message: 'Payment processed and lease activated',
      paymentId: payment._id,
      leaseStatus: 'active'
    });

  } catch (error) {
    console.error('Error processing payment:', error);
    return Response.json({ error: 'Failed to process payment' }, { status: 500 });
  }
}
