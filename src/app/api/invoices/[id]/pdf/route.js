// app/api/invoices/[id]/pdf/route.js
import Invoice from 'models/Invoice';
import { generatePDF } from 'lib/pdfGenerator';
import dbConnect from 'lib/db';

export async function GET(req, { params }) {
  await dbConnect();
  
  try {
    const invoice = await Invoice.findById(params.id)
      .populate('tenantId', 'name email phone')
      .populate('propertyId', 'address');

    if (!invoice) {
      return new Response('Invoice not found', { status: 404 });
    }

    const pdfBuffer = await generatePDF(invoice);

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=Invoice_${invoice.invoiceNumber}.pdf`
      }
    });
  } catch (err) {
    return new Response(err.message, { status: 500 });
  }
}