// src/app/payments/[id]/edit/page.js
import { notFound } from "next/navigation";
import EditPaymentClient from "./EditPaymentClient.jsx";
import mongoose from "mongoose";
import Payment from "models/Payment.js";
import dbConnect from "lib/db.js";
import ObjectId from "mongodb";

async function getPayment(id) {
  try {
    await dbConnect();

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    const payment = await Payment.findById(new mongoose.Types.ObjectId(id))
      .populate({
        path: "lease",
        populate: [
          {
            path: "propertyId",
            select: "address name type",
          },
          {
            path: "tenantId",
            select: "firstName lastName email phone name",
          },
        ],
      })
      .populate("tenant", "firstName lastName email phone name")
      .populate("property", "address name type")
      .lean();
   
    if (!payment) {
      return null;
    }

    // Convert MongoDB ObjectIds to strings for client component
    return JSON.parse(JSON.stringify(payment));
  } catch (error) {
    console.error("Error fetching payment:", error);
    return null;
  }
}

// Server Component - properly handles async/await and params
export default async function EditPaymentPage({ params }) {
  // Next.js 15: Await params to access dynamic route parameters
  const { id } = await params;

  // Fetch payment data on the server
  const payment = await getPayment(id);

  // Return 404 if payment not found
  if (!payment) {
    notFound();
  }

  // Pass data to client component
  return <EditPaymentClient payment={payment} />;
}

// Generate metadata for SEO
export async function generateMetadata({ params }) {
  // Next.js 15: Await params in metadata function too
  const { id } = await params;
  const payment = await getPayment(id);

  if (!payment) {
    return {
      title: "Payment Not Found",
      description: "The requested payment could not be found.",
    };
  }

  return {
    title: `Edit Payment - ${payment.reference}`,
    description: `Edit payment of ZMW ${payment.amount} - Reference: ${payment.reference}`,
  };
}
