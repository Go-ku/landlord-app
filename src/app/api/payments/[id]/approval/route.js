// app/api/payments/[id]/approve/route.js - Approve Payment
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

    const { id } = await params;
    const body = await request.json();
    const { notes = '' } = body;

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

    // Check permissions
    const userRole = session.user.role;
    const userId = session.user.id;
    
    if (!['manager', 'admin'].includes(userRole)) {
      if (userRole === 'landlord' && payment.property?.landlord !== userId) {
        return NextResponse.json(
          { error: 'You can only approve payments for your own properties' },
          { status: 403 }
        );
      } else if (userRole === 'tenant') {
        return NextResponse.json(
          { error: 'Tenants cannot approve payments' },
          { status: 403 }
        );
      }
    }

    // Check if payment can be approved
    if (payment.approvalStatus !== 'pending') {
      return NextResponse.json(
        { error: 'Payment is not pending approval' },
        { status: 400 }
      );
    }

    // Approve the payment using the model method
    await payment.approve(userId, notes);

    // Create notification for tenant
    await Notification.create({
      recipient: payment.tenant._id,
      sender: userId,
      type: 'payment_submitted',
      title: 'Payment Approved',
      message: `Your payment of ${payment.formattedAmount} has been approved and processed.`,
      relatedDocument: payment._id,
      relatedDocumentModel: 'Payment',
      actionRequired: false,
      priority: 'high'
    });

    return NextResponse.json({
      success: true,
      message: 'Payment approved successfully',
      payment: {
        id: payment._id,
        status: payment.status,
        approvalStatus: payment.approvalStatus,
        approvedAt: payment.approvedAt,
        approvedBy: payment.approvedBy
      }
    });

  } catch (error) {
    console.error('Error approving payment:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}





