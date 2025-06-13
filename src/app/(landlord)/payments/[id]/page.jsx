// src/app/payments/[id]/page.js
import { notFound } from 'next/navigation';
import PaymentDetailClient from './PaymentDetailClient';
import mongoose from 'mongoose';
import Payment from 'models/Payment';

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
          path: 'propertyId tenantId landlordId',
          select: 'address name type firstName lastName email phone'
        }
      })
      .populate('tenantId', 'name firstName lastName email phone')
      .populate('propertyId', 'address name type')
      .populate('verifiedBy', 'name firstName lastName email')
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

export default async function PaymentDetailPage({ params }) {
  // Await params to fix Next.js 15 compatibility
  const { id } = await params;
  const payment = await getPayment(id);
  
  if (!payment) {
    notFound();
  }
  
  return <PaymentDetailClient payment={payment} />;
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
  
  const propertyAddress = payment.propertyId?.address || payment.propertyId?.name || 'Unknown Property';
  const tenantName = payment.tenantId?.name || 
    `${payment.tenantId?.firstName} ${payment.tenantId?.lastName}` || 
    'Unknown Tenant';
  
  return {
    title: `Payment - ${payment.reference} - ${propertyAddress}`,
    description: `Payment of ZMW ${payment.amount} from ${tenantName} for ${propertyAddress}`,
  };
}