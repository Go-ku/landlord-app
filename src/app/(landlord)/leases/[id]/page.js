// src/app/leases/[id]/page.js
import { notFound } from 'next/navigation';
import LeaseDetailClient from './LeaseDetailClient';
import mongoose from 'mongoose';
import Lease from 'models/Lease';

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

async function getLease(id) {
  try {
    await connectDB();
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    
    const lease = await Lease.findById(id)
      .populate('propertyId', 'address name type bedrooms bathrooms rent description')
      .populate('tenantId', 'name firstName lastName email phone emergencyContact emergencyPhone')
      .populate('landlordId', 'name firstName lastName email phone')
      .lean();
    
    if (!lease) {
      return null;
    }
    
    // Convert MongoDB ObjectIds to strings for client component
    return JSON.parse(JSON.stringify(lease));
  } catch (error) {
    console.error('Error fetching lease:', error);
    return null;
  }
}

export default async function LeaseDetailPage({ params }) {
  const lease = await getLease(params.id);
  
  if (!lease) {
    notFound();
  }
  
  return <LeaseDetailClient lease={lease} />;
}

export async function generateMetadata({ params }) {
  const lease = await getLease(params.id);
  
  if (!lease) {
    return {
      title: 'Lease Not Found',
    };
  }
  
  const propertyAddress = lease.propertyId?.address || lease.propertyId?.name || 'Unknown Property';
  const tenantName = lease.tenantId?.name || 
    `${lease.tenantId?.firstName} ${lease.tenantId?.lastName}` || 
    'Unknown Tenant';
  
  return {
    title: `Lease - ${propertyAddress} - ${tenantName}`,
    description: `Lease agreement for ${propertyAddress} with ${tenantName}`,
  };
}