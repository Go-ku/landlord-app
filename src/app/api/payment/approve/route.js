// app/api/payment/approve/route.js
import Payment from "models/Payment";
import { createNotification } from "@/services/notificationService";
import dbConnect from "@/lib/db";

export async function POST(req) {
  await dbConnect();
  const { paymentId, action } = await req.json();

  try {
    const payment = await Payment.findById(paymentId)
      .populate("tenantId", "name")
      .populate("propertyId", "address landlord");

    if (!payment) {
      return Response.json({ error: "Payment not found" }, { status: 404 });
    }

    if (action === "approve") {
      payment.status = "verified";
      await payment.save();

      // Notify tenant
      await createNotification({
        recipientId: payment.tenantId._id,
        senderId: payment.propertyId.landlord,
        type: "payment",
        message: `Your payment of ${payment.currency} ${payment.amount} has been approved`,
        relatedDocument: payment._id,
        relatedDocumentModel: "Payment",
      });

      return Response.json({
        success: true,
        message: "Payment approved and receipt issued",
      });
    } else {
      payment.status = "disputed";
      await payment.save();

      await createNotification({
        recipientId: payment.tenantId._id,
        senderId: payment.propertyId.landlord,
        type: "payment",
        message: `Your payment of ${payment.currency} ${payment.amount} requires verification`,
        relatedDocument: payment._id,
        relatedDocumentModel: "Payment",
        actionRequired: true,
      });

      const receiptUrl = await generateReceiptPDF(payment);

      // Update payment with receipt URL
      payment.receiptUrl = receiptUrl;
      await payment.save();

      // Send receipt email
      await sendReceiptEmail(payment);

      return Response.json({
        success: true,
        message: "Payment marked as disputed",
      });
    }
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
