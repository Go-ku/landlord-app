import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
import { headers } from "next/headers";
import Payment from "models/Payment";
import dbConnect from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req) {
  await dbConnect();
  const body = await req.text();
  const sig = headers().get("stripe-signature");

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;
    const charge = await stripe.charges.retrieve(paymentIntent.latest_charge);

    // Check if this is a partial payment
    const isPartial =
      paymentIntent.amount < paymentIntent.metadata.expectedAmount;
    const balanceDue = isPartial
      ? (paymentIntent.metadata.expectedAmount - paymentIntent.amount) / 100
      : 0;
    // Save to database
    await Payment.create({
      tenantId: paymentIntent.metadata.tenantId,
      propertyId: paymentIntent.metadata.propertyId,
      amount: paymentIntent.amount / 100, // Convert to dollars
      date: new Date(),
      method: "card",
      status: "completed",
      stripeId: paymentIntent.id,
      receiptUrl: charge.receipt_url,
      receiptNumber: charge.receipt_number,
      payerEmail: paymentIntent.receipt_email,
      currency: paymentIntent.metadata.originalCurrency || "USD",
      originalAmount:
        paymentIntent.metadata.originalAmount || paymentIntent.amount / 100,
      exchangeRate: paymentIntent.metadata.exchangeRate || 1,
      isPartial,
      balanceDue,
      // For partial payments, link to the parent payment
      parentPayment: paymentIntent.metadata.parentPaymentId,
    });
    if (paymentIntent.metadata.parentPaymentId) {
      await Payment.findByIdAndUpdate(paymentIntent.metadata.parentPaymentId, {
        $push: {
          partialPayments: {
            amount: paymentIntent.amount / 100,
            date: new Date(),
            method: "card",
            receiptUrl: charge.receipt_url,
          },
        },
        $set: {
          balanceDue: Math.max(0, balanceDue - paymentIntent.amount / 100),
        },
      });
    }
    const property = await Property.findById(
      paymentIntent.metadata.propertyId
    ).populate("landlord", "_id");

    if (property?.landlord) {
      await createNotification({
        recipientId: property.landlord._id,
        senderId: paymentIntent.metadata.tenantId,
        type: "payment",
        message: `New payment of ${paymentIntent.metadata.originalCurrency} ${paymentIntent.metadata.originalAmount} received`,
        relatedDocument: payment._id,
        relatedDocumentModel: "Payment",
        actionRequired: true,
      });
    }
  }

  return Response.json({ received: true });
}

export const config = {
  api: {
    bodyParser: false,
  },
};

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}
