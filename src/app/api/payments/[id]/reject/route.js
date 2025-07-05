// app/api/payments/[id]/reject/route.js - Reject Payment
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { Payment, Property, Notification } from 'models/index'
import dbConnect from 'lib/db';

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    const { id } = params;
    const body = await request.json();
    const { reason } = body;

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    // Find the payment
    const payment = await Payment.findById(id)
      .populate('property', 'landlord')
      .populate('tenant', 'firstName lastName email');

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Check permissions (same as approve)
    const userRole = session.user.role;
    const userId = session.user.id;
    
    if (!['manager', 'admin'].includes(userRole)) {
      if (userRole === 'landlord' && payment.property?.landlord !== userId) {
        return NextResponse.json(
          { error: 'You can only reject payments for your own properties' },
          { status: 403 }
        );
      } else if (userRole === 'tenant') {
        return NextResponse.json(
          { error: 'Tenants cannot reject payments' },
          { status: 403 }
        );
      }
    }

    // Check if payment can be rejected
    if (payment.approvalStatus !== 'pending') {
      return NextResponse.json(
        { error: 'Payment is not pending approval' },
        { status: 400 }
      );
    }

    // Reject the payment using the model method
    await payment.reject(userId, reason);

    // Create notification for tenant
    await Notification.create({
      recipient: payment.tenant._id,
      sender: userId,
      type: 'payment_submitted',
      title: 'Payment Rejected',
      message: `Your payment of ${payment.formattedAmount} has been rejected. Reason: ${reason}`,
      relatedDocument: payment._id,
      relatedDocumentModel: 'Payment',
      actionRequired: true,
      actionUrl: `/payments/${payment._id}`,
      priority: 'high'
    });

    return NextResponse.json({
      success: true,
      message: 'Payment rejected successfully',
      payment: {
        id: payment._id,
        status: payment.status,
        approvalStatus: payment.approvalStatus,
        rejectionReason: payment.rejectionReason
      }
    });

  } catch (error) {
    console.error('Error rejecting payment:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}