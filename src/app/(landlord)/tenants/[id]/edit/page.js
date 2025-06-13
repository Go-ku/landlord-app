// src/app/tenants/[id]/edit/page.js
import { notFound } from 'next/navigation';
import dbConnect from 'lib/db';
import User from 'models/User';
import EditTenantClient from './EditTenantClient';
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

async function getTenant(id) {
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

    return serializeData(tenant);

  } catch (error) {
    console.error('Error fetching tenant for edit:', error);
    return null;
  }
}

export default async function EditTenantPage({ params }) {
  const tenant = await getTenant(params.id);
  
  if (!tenant) {
    notFound();
  }
  
  return <EditTenantClient tenant={tenant} />;
}

export async function generateMetadata({ params }) {
  const tenant = await getTenant(params.id);
  
  if (!tenant) {
    return {
      title: 'Tenant Not Found',
    };
  }
  
  const tenantName = tenant.name || 
    `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim() || 
    'Unknown Tenant';
  
  return {
    title: `Edit ${tenantName} - Tenant Management`,
    description: `Edit tenant information for ${tenantName}`,
  };
}