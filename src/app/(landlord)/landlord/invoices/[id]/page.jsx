// app/landlord/invoices/[id]/page.jsx
import InvoiceDetails from '@/components/landlord/InvoiceDetails';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Invoice from 'models/Invoice';

export default async function InvoicePage({ params }) {
  await dbConnect();
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return <div>Unauthorized</div>;
  }

  const invoice = await Invoice.findById(params.id)
    .populate('tenantId', 'name email phone')
    .populate('propertyId', 'address')
    .populate('paymentHistory.paymentId');

  if (!invoice) {
    return <div>Invoice not found</div>;
  }

  return <InvoiceDetails invoice={JSON.parse(JSON.stringify(invoice))} />;
}