// utils/invoiceCron.js
import Invoice from 'models/Invoice';
import Lease from 'models/Lease';
import { createNotification } from '@/services/notificationService';
import dbConnect from '@/lib/db';

export async function generateMonthlyInvoices() {
  await dbConnect();
  const today = new Date();
  const firstOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  
  // Find all active leases
  const leases = await Lease.find({
    startDate: { $lte: firstOfNextMonth },
    endDate: { $gte: today },
    status: 'active'
  }).populate('tenantId propertyId');

  for (const lease of leases) {
    // Check if invoice already exists for this period
    const existingInvoice = await Invoice.findOne({
      leaseId: lease._id,
      'items.periodStart': firstOfNextMonth
    });

    if (!existingInvoice) {
      // Create new invoice
      const invoice = await Invoice.create({
        tenantId: lease.tenantId._id,
        propertyId: lease.propertyId._id,
        leaseId: lease._id,
        dueDate: new Date(firstOfNextMonth.getFullYear(), firstOfNextMonth.getMonth(), 10), // Due on 10th
        items: [{
          description: 'Monthly Rent',
          amount: lease.monthlyRent,
          taxRate: 0,
          periodStart: firstOfNextMonth,
          periodEnd: new Date(firstOfNextMonth.getFullYear(), firstOfNextMonth.getMonth() + 1, 0) // Last day of month
        }],
        subtotal: lease.monthlyRent,
        tax: 0,
        total: lease.monthlyRent,
        balanceDue: lease.monthlyRent,
        status: 'draft'
      });

      // Notify landlord
      await createNotification({
        recipientId: lease.propertyId.landlord,
        type: 'system',
        message: `New rent invoice generated for ${lease.tenantId.name}`,
        relatedDocument: invoice._id,
        relatedDocumentModel: 'Invoice'
      });
    }
  }
}