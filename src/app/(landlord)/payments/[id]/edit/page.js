// src/app/payments/[id]/edit/page.js
import { notFound } from 'next/navigation';
import EditPaymentClient from './EditPaymentClient.jsx';
import mongoose from 'mongoose';
import Payment from 'models/Payment.js';

// Connect to MongoDB
async function connectDB() {
  if (mongoose.connections[0].readyState) {
    return;
  }
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

async function getPayment(id) {
  try {
    await connectDB();
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    
    const payment = await Payment.findById(id)
      .populate({
        path: 'leaseId',
        populate: {
          path: 'propertyId tenantId',
          select: 'address name type firstName lastName email phone'
        }
      })
      .populate('tenantId', 'name firstName lastName email phone')
      .populate('propertyId', 'address name type')
      .lean();
    
    if (!payment) {
      return null;
    }
    
    // Convert MongoDB ObjectIds to strings for client component
    return JSON.parse(JSON.stringify(payment));
  } catch (error) {
    console.error('Error fetching payment:', error);
    return null;
  }
}

export default async function EditPaymentPage({ params }) {
  // Await params to fix Next.js 15 compatibility
  const { id } = await params;
  const payment = await getPayment(id);
  
  if (!payment) {
    notFound();
  }
  
  return <EditPaymentClient payment={payment} />;
}

export async function generateMetadata({ params }) {
  // Await params to fix Next.js 15 compatibility
  const { id } = await params;
  const payment = await getPayment(id);
  
  if (!payment) {
    return {
      title: 'Payment Not Found',
    };
  }
  
  return {
    title: `Edit Payment - ${payment.reference}`,
    description: `Edit payment of ZMW ${payment.amount} - Reference: ${payment.reference}`,
  };
}