import Invoice from 'models/Invoice';
import Payment from 'models/Payment';
import { createNotification } from '@/services/notificationService';
import dbConnect from '@/lib/db';

export async function POST(req, { params }) {
  await dbConnect();
  const { amount } = await req.json();

  try {
    const invoice = await Invoice.findById(params.id)
      .populate('tenantId', 'email')
      .populate('propertyId', 'address landlord');

    if (!invoice) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Create payment record
    const payment = await Payment.create({
      tenantId: invoice.tenantId._id,
      propertyId: invoice.propertyId._id,
      amount,
      date: new Date(),
      method: 'manual',
      status: 'completed',
      invoiceId: invoice._id
    });

    // Update invoice
    const updatedAmountPaid = invoice.amountPaid + amount;
    const updatedBalanceDue = invoice.total - updatedAmountPaid;
    const newStatus = updatedBalanceDue <= 0 ? 'paid' : invoice.status;

    await Invoice.findByIdAndUpdate(
      params.id,
      {
        $inc: { amountPaid: amount },
        $set: { 
          balanceDue: updatedBalanceDue,
          status: newStatus
        },
        $push: { 
          paymentHistory: {
            paymentId: payment._id,
            amount,
            date: new Date()
          }
        }
      }
    );

    // Notify tenant
    await createNotification({
      recipientId: invoice.tenantId._id,
      senderId: invoice.propertyId.landlord,
      type: 'payment',
      message: `Payment of ${invoice.currency} ${amount} recorded for invoice #${invoice.invoiceNumber}`,
      relatedDocument: invoice._id,
      relatedDocumentModel: 'Invoice'
    });

    return Response.json({ success: true, payment });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}