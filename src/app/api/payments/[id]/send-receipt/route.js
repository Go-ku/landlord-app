// app/api/payments/[id]/send-receipt/route.js - Send Receipt
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
    const { method } = body; // 'email', 'whatsapp', or 'sms'

    if (!['email', 'whatsapp', 'sms'].includes(method)) {
      return NextResponse.json(
        { error: 'Invalid sending method' },
        { status: 400 }
      );
    }

    // Find the payment
    const payment = await Payment.findById(id)
      .populate('tenant', 'firstName lastName email phone')
      .populate('property', 'address name landlord')
      .populate('lease', 'monthlyRent');

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const userRole = session.user.role;
    const userId = session.user.id;
    
    if (!['manager', 'admin', 'landlord'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    if (userRole === 'landlord' && payment.property?.landlord !== userId) {
      return NextResponse.json(
        { error: 'You can only send receipts for your own properties' },
        { status: 403 }
      );
    }

    // Check if payment is in a state that allows receipt sending
    if (!['completed', 'verified', 'approved'].includes(payment.status)) {
      return NextResponse.json(
        { error: 'Receipt can only be sent for completed payments' },
        { status: 400 }
      );
    }

    // Validate contact information
    if (method === 'email' && !payment.tenant?.email) {
      return NextResponse.json(
        { error: 'Tenant email not available' },
        { status: 400 }
      );
    }

    if (['whatsapp', 'sms'].includes(method) && !payment.tenant?.phone) {
      return NextResponse.json(
        { error: 'Tenant phone number not available' },
        { status: 400 }
      );
    }

    // Generate receipt data
    const receiptData = {
      receiptNumber: payment.receiptNumber,
      amount: payment.amount,
      date: payment.paymentDate,
      method: payment.paymentMethod,
      type: payment.paymentType,
      tenant: {
        name: payment.tenant?.name || `${payment.tenant?.firstName} ${payment.tenant?.lastName}`.trim(),
        email: payment.tenant?.email,
        phone: payment.tenant?.phone
      },
      property: {
        address: payment.property?.address || payment.property?.name
      },
      reference: payment.referenceNumber
    };

    let result;

    try {
      switch (method) {
        case 'email':
          result = await sendReceiptEmail(receiptData);
          break;
        case 'whatsapp':
          result = await sendReceiptWhatsApp(receiptData);
          break;
        case 'sms':
          result = await sendReceiptSMS(receiptData);
          break;
      }

      if (result.success) {
        // Log the sent receipt
        await Notification.create({
          recipient: payment.tenant._id,
          sender: userId,
          type: 'general',
          title: 'Payment Receipt Sent',
          message: `Your payment receipt has been sent via ${method}.`,
          relatedDocument: payment._id,
          relatedDocumentModel: 'Payment',
          priority: 'low'
        });

        return NextResponse.json({
          success: true,
          message: `Receipt sent successfully via ${method}`,
          details: result.details
        });
      } else {
        return NextResponse.json(
          { error: `Failed to send receipt via ${method}`, details: result.error },
          { status: 500 }
        );
      }

    } catch (sendError) {
      console.error(`Error sending receipt via ${method}:`, sendError);
      return NextResponse.json(
        { error: `Failed to send receipt via ${method}`, details: sendError.message },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in send receipt endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Helper functions for sending receipts
async function sendReceiptEmail(receiptData) {
  try {
    // This would integrate with your email service (e.g., Resend, SendGrid, etc.)
    // For now, we'll simulate the functionality
    
    const emailContent = generateReceiptEmailContent(receiptData);
    
    // Example with Resend (you would need to implement this)
    /*
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const result = await resend.emails.send({
      from: 'noreply@yourdomain.com',
      to: receiptData.tenant.email,
      subject: `Payment Receipt - ${receiptData.receiptNumber}`,
      html: emailContent
    });
    */
    
    // Simulated success response
    console.log('Email sent to:', receiptData.tenant.email);
    return { success: true, details: 'Email sent successfully' };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function sendReceiptWhatsApp(receiptData) {
  try {
    // This would integrate with WhatsApp Business API
    // For now, we'll simulate the functionality
    
    const message = generateReceiptWhatsAppMessage(receiptData);
    
    // Example implementation would go here
    console.log('WhatsApp message sent to:', receiptData.tenant.phone);
    console.log('Message:', message);
    
    return { success: true, details: 'WhatsApp message sent successfully' };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function sendReceiptSMS(receiptData) {
  try {
    // This would integrate with SMS service (e.g., Twilio, Africa's Talking)
    // For now, we'll simulate the functionality
    
    const message = generateReceiptSMSMessage(receiptData);
    
    // Example implementation would go here
    console.log('SMS sent to:', receiptData.tenant.phone);
    console.log('Message:', message);
    
    return { success: true, details: 'SMS sent successfully' };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function generateReceiptEmailContent(data) {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #2563eb;">Payment Receipt</h1>
        </div>
        
        <div style="padding: 20px;">
          <h2>Receipt #${data.receiptNumber}</h2>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Amount:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">ZMW ${data.amount.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Date:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${new Date(data.date).toLocaleDateString()}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Payment Method:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${data.method.replace('_', ' ')}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Property:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${data.property.address}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Tenant:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${data.tenant.name}</td>
            </tr>
            ${data.reference ? `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Reference:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${data.reference}</td>
            </tr>
            ` : ''}
          </table>
          
          <p style="margin-top: 30px; color: #666;">
            Thank you for your payment. This serves as your official receipt.
          </p>
        </div>
      </body>
    </html>
  `;
}

function generateReceiptWhatsAppMessage(data) {
  return `🧾 *PAYMENT RECEIPT*

Receipt #: ${data.receiptNumber}
💰 Amount: ZMW ${data.amount.toLocaleString()}
📅 Date: ${new Date(data.date).toLocaleDateString()}
💳 Method: ${data.method.replace('_', ' ')}
🏠 Property: ${data.property.address}
👤 Tenant: ${data.tenant.name}
${data.reference ? `🔖 Reference: ${data.reference}` : ''}

✅ Payment confirmed and processed.
Thank you for your payment!`;
}

function generateReceiptSMSMessage(data) {
  return `RECEIPT #${data.receiptNumber}: ZMW ${data.amount.toLocaleString()} payment confirmed for ${data.property.address} on ${new Date(data.date).toLocaleDateString()}. Thank you!`;
}