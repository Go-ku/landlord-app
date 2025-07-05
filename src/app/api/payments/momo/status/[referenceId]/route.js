// app/api/payments/momo/status/[referenceId]/route.js - Next.js 15 App Router
import { NextRequest, NextResponse } from 'next/server';
import momoService from 'lib/momo-api';
import { Payment, Notification} from 'models/index';
import dbConnect from 'lib/db';


export async function GET(request, { params }) {
  try {
    await dbConnect();
    

    const { referenceId } = await params;
    console.log(referenceId)
    if (!referenceId) {
      return NextResponse.json(
        { error: 'Reference ID is required' },
        { status: 400 }
      );
    }

    // Get payment status from MoMo
    const statusResult = await momoService.getPaymentStatus(referenceId);

    if (!statusResult.success) {
      return NextResponse.json(
        { 
          error: 'Failed to get payment status',
          details: statusResult.error 
        },
        { status: 400 }
      );
    }

    // Find payment in database
    const payment = await Payment.findOne({ referenceNumber: referenceId })
      .populate('tenant', 'firstName lastName email')
      .populate('property', 'address')
      .populate('lease');

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    const momoStatus = statusResult.data.status;
    let paymentStatus = 'pending';
    let approvalStatus = 'pending';

    // Map MoMo status to our payment status
    switch (momoStatus) {
      case 'SUCCESSFUL':
        paymentStatus = 'completed';
        approvalStatus = 'approved';
        break;
      case 'FAILED':
        paymentStatus = 'failed';
        approvalStatus = 'rejected';
        break;
      case 'PENDING':
        paymentStatus = 'pending';
        approvalStatus = 'pending';
        break;
      default:
        paymentStatus = 'pending';
    }

    // Update payment if status changed
    if (payment.status !== paymentStatus) {
      payment.status = paymentStatus;
      payment.approvalStatus = approvalStatus;
      
      if (paymentStatus === 'completed') {
        payment.approvedAt = new Date();
        payment.approvalNotes = 'Automatically approved via MoMo';
        
        // Add to approval history
        payment.approvalHistory.push({
          action: 'approved',
          user: payment.tenant,
          notes: 'Payment completed via MTN MoMo',
          timestamp: new Date()
        });

        // Create success notification
        await Notification.create({
          recipient: payment.tenant,
          type: 'payment_submitted',
          title: 'Payment Successful',
          message: `Your payment of ${payment.formattedAmount} has been successfully processed via MTN MoMo.`,
          relatedDocument: payment._id,
          relatedDocumentModel: 'Payment',
          priority: 'high'
        });

      } else if (paymentStatus === 'failed') {
        payment.rejectionReason = 'MoMo payment failed';
        
        // Add to approval history
        payment.approvalHistory.push({
          action: 'rejected',
          user: payment.tenant,
          notes: 'MoMo payment failed',
          timestamp: new Date()
        });

        // Create failure notification
        await Notification.create({
          recipient: payment.tenant,
          type: 'payment_submitted',
          title: 'Payment Failed',
          message: `Your payment of ${payment.formattedAmount} via MTN MoMo has failed. Please try again.`,
          relatedDocument: payment._id,
          relatedDocumentModel: 'Payment',
          priority: 'high'
        });
      }

      await payment.save();
    }

    return NextResponse.json({
      success: true,
      payment: JSON.parse(JSON.stringify(payment)),
      data: {
        paymentId: payment._id,
        momoStatus,
        paymentStatus,
        approvalStatus,
        amount: payment.amount,
        createdAt: payment.createdAt,
        momoData: statusResult.data
      }
    });

  } catch (error) {
    console.error('Error checking payment status:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message 
      },
      { status: 500 }
    );
  }
}