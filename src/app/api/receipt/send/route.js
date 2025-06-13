// app/api/receipt/send/route.js
import { Resend } from 'resend';
import Payment from 'models/Payment';
import dbConnect from '@/lib/db';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req) {
  await dbConnect();
  const { paymentId } = await req.json();

  try {
    const payment = await Payment.findById(paymentId)
      .populate('tenantId', 'email name')
      .populate('propertyId', 'address');

    if (!payment) {
      return Response.json({ error: 'Payment not found' }, { status: 404 });
    }

    const { data, error } = await resend.emails.send({
      from: 'receipts@yourdomain.com',
      to: payment.payerEmail || payment.tenantId.email,
      subject: `Payment Receipt #${payment.receiptNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #111;">Payment Receipt</h1>
          <p style="color: #555;">Thank you for your payment!</p>
          
          <div style="margin: 20px 0; padding: 20px; background: #f9f9f9; border-radius: 8px;">
            <p><strong>Receipt #:</strong> ${payment.receiptNumber}</p>
            <p><strong>Date:</strong> ${new Date(payment.date).toLocaleDateString()}</p>
            <p><strong>Property:</strong> ${payment.propertyId?.address || 'N/A'}</p>
            <p><strong>Amount:</strong> $${payment.amount.toFixed(2)}</p>
          </div>
          
          <a href="${payment.receiptUrl}" 
             style="display: inline-block; padding: 10px 15px; background: #2563eb; color: white; text-decoration: none; border-radius: 4px;">
            Download Receipt
          </a>
          
          <p style="margin-top: 20px; color: #777;">
            If you have any questions, please contact our support team.
          </p>
        </div>
      `
    });

    if (error) throw error;

    return Response.json({ success: true, data });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}