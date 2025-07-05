// app/payments/[id]/page.js - Updated Payment Detail Page
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import PaymentDetailClient from './PaymentDetailClient';
import { Payment, Property, Lease, User } from 'models/index';
import dbConnect from 'lib/db';
import mongoose from 'mongoose';


// Server function to get payment with role-based access control
async function getPayment(id, userId, userRole) {
  try {
    await dbConnect();
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    // Build query with role-based filtering
    let paymentQuery = Payment.findById(id);

    // Apply role-based access control
    if (userRole === 'tenant') {
      // Tenants can only see their own payments
      paymentQuery = paymentQuery.where({ tenant: userId });
    } else if (userRole === 'landlord') {
      // Landlords can only see payments for their properties
      const landlordProperties = await Property.find({ landlord: userId }).select('_id');
      const propertyIds = landlordProperties.map(p => p._id);
      paymentQuery = paymentQuery.where({ property: { $in: propertyIds } });
    }
    // Managers and admins can see all payments (no additional filter)

    const payment = await paymentQuery
      .populate({
        path: 'lease',
        populate: {
          path: 'propertyId tenantId landlordId',
          select: 'address name type firstName lastName email phone'
        }
      })
      .populate('tenant', 'name firstName lastName email phone')
      .populate('property', 'address name type landlord')
      .populate('approvedBy', 'name firstName lastName email')
      .populate('recordedBy', 'name firstName lastName email')
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

// Main page component
export default async function PaymentDetailPage({ params }) {
  // Get session first
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/login');
  }

  // Await params for Next.js 15 compatibility
  const { id } = await params;
  
  // Get payment with role-based access
  const payment = await getPayment(id, session.user.id, session.user.role);

  if (!payment) {
    notFound();
  }

  // Pass user session to client component for role-based UI
  return (
    <PaymentDetailClient 
      payment={payment} 
      currentUser={{
        id: session.user.id,
        role: session.user.role,
        name: session.user.name,
        email: session.user.email
      }}
    />
  );
}

// Metadata generation
export async function generateMetadata({ params }) {
  try {
    // Get session for metadata generation
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return {
        title: 'Payment Details',
        description: 'Payment details page'
      };
    }

    const { id } = await params;
    const payment = await getPayment(id, session.user.id, session.user.role);

    if (!payment) {
      return {
        title: 'Payment Not Found',
        description: 'The requested payment could not be found.'
      };
    }

    const propertyAddress = payment.property?.address || payment.property?.name || 'Unknown Property';
    const tenantName = payment.tenant?.name ||
      `${payment.tenant?.firstName} ${payment.tenant?.lastName}`.trim() ||
      'Unknown Tenant';

    return {
      title: `Payment ${payment.receiptNumber} - ${propertyAddress}`,
      description: `Payment of ZMW ${payment.amount.toLocaleString()} from ${tenantName} for ${propertyAddress}`,
      openGraph: {
        title: `Payment ${payment.receiptNumber}`,
        description: `Payment details for ${propertyAddress}`,
        type: 'website'
      }
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Payment Details',
      description: 'Payment details page'
    };
  }
}

// Optional: Add static params for better performance
export async function generateStaticParams() {
  // This is optional - only use if you have a limited number of payments
  // that you want to pre-generate at build time
  return [];
}

// Page configuration
export const dynamic = 'force-dynamic'; // Ensure fresh data on each request
export const revalidate = 0; // Don't cache this page