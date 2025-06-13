// src/app/tenants/[id]/page.js
import { notFound } from 'next/navigation';
import dbConnect from 'lib/db';
import User from 'models/User';
import Lease from 'models/Lease';
import Payment from 'models/Payment';
import TenantDetailClient from './TenantDetailClient';
import mongoose from 'mongoose';

// Helper function to serialize MongoDB data
function serializeData(data) {
  if (!data) return null;
  
  return JSON.parse(JSON.stringify(data, (key, value) => {
    if (value && typeof value === 'object' && value.constructor?.name === 'ObjectId') {
      return value.toString();
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  }));
}

async function getTenantWithDetails(id) {
  try {
    await dbConnect();
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    
    // Fetch tenant
    const tenant = await User.findOne({ 
      _id: id, 
      role: 'tenant' 
    }).lean();

    if (!tenant) {
      return null;
    }

    // Fetch related data in parallel
    const [leases, payments] = await Promise.allSettled([
      // All leases for this tenant
      Lease.find({ tenantId: id })
        .populate('propertyId', 'address name type bedrooms bathrooms monthlyRent description')
        .populate('landlordId', 'firstName lastName name email phone')
        .sort({ createdAt: -1 })
        .lean(),

      // All payments for this tenant
      Payment.find({ tenantId: id })
        .populate('propertyId', 'address name')
        .populate('leaseId', 'monthlyRent startDate endDate')
        .sort({ createdAt: -1 })
        .lean()
    ]);

    return {
      tenant: serializeData(tenant),
      leases: serializeData(leases.status === 'fulfilled' ? leases.value : []),
      payments: serializeData(payments.status === 'fulfilled' ? payments.value : [])
    };

  } catch (error) {
    console.error('Error fetching tenant details:', error);
    return null;
  }
}

export default async function TenantDetailPage({ params }) {
  const data = await getTenantWithDetails(params.id);
  
  if (!data || !data.tenant) {
    notFound();
  }
  
  return <TenantDetailClient tenantData={data} />;
}

export async function generateMetadata({ params }) {
  const data = await getTenantWithDetails(params.id);
  
  if (!data || !data.tenant) {
    return {
      title: 'Tenant Not Found',
    };
  }
  
  const tenantName = data.tenant.name || 
    `${data.tenant.firstName || ''} ${data.tenant.lastName || ''}`.trim() || 
    'Unknown Tenant';
  
  return {
    title: `${tenantName} - Tenant Details`,
    description: `Tenant profile for ${tenantName}`,
  };
}