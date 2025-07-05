// app/api/payments/momo/webhook/route.js - Enhanced webhook security
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { Payment, Notification } from 'models';
import dbConnect from 'lib/db';

export async function POST(request) {
  try {
    await dbConnect();

    // Verify webhook signature if configured
    const signature = request.headers.get('x-momo-signature');
    const webhookSecret = process.env.MOMO_WEBHOOK_SECRET;
    
    if (webhookSecret && signature) {
      const body = await request.text();
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');
      
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        return NextResponse.json({ 
          error: 'Invalid webhook signature',
          code: 'INVALID_SIGNATURE'
        }, { status: 401 });
      }
      
      var parsedBody = JSON.parse(body);
    } else {
      parsedBody = await request.json();
    }

    const { referenceId, status, amount, timestamp } = parsedBody;

    if (!referenceId) {
      return NextResponse.json({
        error: 'Reference ID is required',
        code: 'MISSING_REFERENCE'
      }, { status: 400 });
    }

    // Find payment with additional validation
    const payment = await Payment.findOne({ 
      referenceNumber: referenceId,
      paymentMethod: 'mobile_money',
      status: { $in: ['pending', 'processing'] } // Only update pending payments
    })
    .populate('tenant', 'firstName lastName email')
    .populate('lease');

    if (!payment) {
      return NextResponse.json({
        error: 'Payment not found or already processed',
        code: 'PAYMENT_NOT_FOUND'
      }, { status: 404 });
    }

    // Prevent duplicate webhook processing
    const webhookId = request.headers.get('x-momo-webhook-id');
    if (webhookId && payment.processedWebhooks?.includes(webhookId)) {
      return NextResponse.json({ 
        success: true, 
        message: 'Webhook already processed' 
      });
    }

    // Process webhook based on status
    let updated = false;
    
    if (status === 'SUCCESSFUL' && payment.status !== 'completed') {
      payment.status = 'completed';
      payment.approvalStatus = 'approved';
      payment.approvedAt = new Date();
      payment.approvalNotes = 'Automatically approved via MoMo webhook';
      
      payment.approvalHistory.push({
        action: 'approved',
        user: payment.tenant,
        notes: 'Payment completed via MTN MoMo webhook',
        timestamp: new Date(),
        webhookData: { status, amount, timestamp }
      });

      updated = true;

      // Send success notification
      Notification.create({
        recipient: payment.tenant,
        type: 'payment_submitted',
        title: 'Payment Confirmed',
        message: `Your payment of ZMW ${payment.amount.toLocaleString()} has been confirmed and processed successfully.`,
        relatedDocument: payment._id,
        relatedDocumentModel: 'Payment',
        priority: 'high'
      }).catch(err => console.error('Failed to create success notification:', err));

    } else if (status === 'FAILED' && payment.status !== 'failed') {
      payment.status = 'failed';
      payment.approvalStatus = 'rejected';
      payment.rejectionReason = 'MoMo payment failed (webhook confirmation)';
      payment.failureDetails = {
        error: 'Payment failed at MoMo provider',
        timestamp: new Date(),
        step: 'completion',
        webhookData: { status, amount, timestamp }
      };
      
      payment.approvalHistory.push({
        action: 'rejected',
        user: payment.tenant,
        notes: 'MoMo payment failed (webhook confirmation)',
        timestamp: new Date(),
        webhookData: { status, amount, timestamp }
      });

      updated = true;

      // Send failure notification
      Notification.create({
        recipient: payment.tenant,
        type: 'payment_submitted',
        title: 'Payment Failed',
        message: `Your payment of ZMW ${payment.amount.toLocaleString()} has failed. Please contact support or try again.`,
        relatedDocument: payment._id,
        relatedDocumentModel: 'Payment',
        priority: 'high'
      }).catch(err => console.error('Failed to create failure notification:', err));
    }

    // Track processed webhooks
    if (webhookId) {
      if (!payment.processedWebhooks) payment.processedWebhooks = [];
      payment.processedWebhooks.push(webhookId);
    }

    if (updated) {
      await payment.save();
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Webhook processed successfully',
      paymentStatus: payment.status
    });

  } catch (error) {
    console.error('Error processing MoMo webhook:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Webhook processing failed',
      code: 'WEBHOOK_ERROR'
    }, { status: 500 });
  }
}