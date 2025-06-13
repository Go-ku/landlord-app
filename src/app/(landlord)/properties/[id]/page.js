// src/app/properties/[id]/page.js
import { notFound, redirect } from 'next/navigation';
import dbConnect from 'lib/db';
import Property from 'models/Property';
import User from 'models/User';
import Payment from 'models/Payment';
import Lease from 'models/Lease';
import PropertyDetailClient from './PropertyDetailsClient';

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

async function getPropertyWithDetails(id) {
  try {
    await dbConnect();

    // Fetch property
    const property = await Property.findById(id).lean();

    if (!property) {
      return null;
    }

    // Fetch related data in parallel with proper error handling
    const [leases, payments, maintenanceRequests] = await Promise.allSettled([
      // Active leases for this property
      Lease.find({ 
        propertyId: id,
        status: { $in: ['active', 'draft'] }
      })
      .populate('tenantId', 'firstName lastName name email phone')
      .sort({ startDate: -1 })
      .lean(),

      // Recent payments for this property
      Payment.find({ 
        propertyId: id 
      })
      .populate('tenantId', 'firstName lastName name email')
      .populate('leaseId', 'monthlyRent startDate endDate')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),

      // Recent maintenance requests (if you have a Maintenance model)
      // Maintenance.find({ 
      //   propertyId: id 
      // })
      // .populate('tenantId', 'firstName lastName name email')
      // .sort({ dateReported: -1 })
      // .limit(5)
      // .lean()
      Promise.resolve([]) // Placeholder until you implement maintenance
    ]);

    // Get tenants from active leases
    const leasesData = leases.status === 'fulfilled' ? leases.value : [];
    const tenants = leasesData
      .filter(lease => lease.tenantId && lease.status === 'active')
      .map(lease => lease.tenantId);

    return {
      property: serializeData(property),
      tenants: serializeData(tenants),
      leases: serializeData(leasesData),
      payments: serializeData(payments.status === 'fulfilled' ? payments.value : []),
      maintenance: serializeData(maintenanceRequests.status === 'fulfilled' ? maintenanceRequests.value : [])
    };

  } catch (error) {
    console.error('Error fetching property details:', error);
    return {
      property: null,
      tenants: [],
      leases: [],
      payments: [],
      maintenance: []
    };
  }
}

export default async function PropertyDetailPage({ params }) {
  // Validate property ID
  if (!params.id || params.id.length !== 24) {
    notFound();
  }

  // Fetch property and related data
  const data = await getPropertyWithDetails(params.id);
  
  if (!data || !data.property) {
    notFound();
  }

  return (
    <PropertyDetailClient 
      propertyData={data}
    />
  );
}

// Generate metadata for SEO
export async function generateMetadata({ params }) {
  if (!params.id || params.id.length !== 24) {
    return { title: 'Property Not Found' };
  }

  try {
    await connectDB();
    const property = await Property.findById(params.id).lean();

    if (!property) {
      return { title: 'Property Not Found' };
    }

    return {
      title: `${property.address} | Property Details`,
      description: property.description || `${property.type} for rent at ${property.address}`,
    };
  } catch (error) {
    return { title: 'Property Details' };
  }
}