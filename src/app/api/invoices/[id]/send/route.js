import Invoice from 'models/Invoice';
import { createNotification } from '@/services/notificationService';
import dbConnect from 'lib/db';

export async function POST(req, { params }) {
  await dbConnect();
  
  try {
    const invoice = await Invoice.findByIdAndUpdate(
      params.id,
      { status: 'sent', sentAt: new Date() },
      { new: true }
    ).populate('tenantId', 'email');

    if (!invoice) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Notify tenant
    await createNotification({
      recipientId: invoice.tenantId._id,
      type: 'payment',
      message: `New invoice #${invoice.invoiceNumber} for ${invoice.propertyId.address}`,
      relatedDocument: invoice._id,
      relatedDocumentModel: 'Invoice',
      actionRequired: true
    });

    // Send email (implement with your email service)
    await sendInvoiceEmail(invoice);

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

async function sendInvoiceEmail(invoice) {
  // Implement with Resend, SendGrid, etc.
}