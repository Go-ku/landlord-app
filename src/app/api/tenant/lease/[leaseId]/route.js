// app/api/tenant/lease/[leaseId]/route.js - Get lease details for signing
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from 'lib/db';
import Lease from 'models/Lease';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'tenant') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { leaseId } = await params;

    const lease = await Lease.findOne({
      _id: leaseId,
      tenantId: session.user.id
    })
    .populate('propertyId', 'address city type bedrooms bathrooms')
    .populate('landlordId', 'name email phone company')
    .populate('propertyRequestId')
    .lean();

    if (!lease) {
      return Response.json({ error: 'Lease not found' }, { status: 404 });
    }

    // Check if lease is in the right status for signing
    if (lease.status !== 'pending_signature') {
      return Response.json({ 
        error: 'This lease is not available for signing',
        currentStatus: lease.status
      }, { status: 400 });
    }

    // Add calculated fields
    const enhancedLease = {
      ...lease,
      firstPaymentRequired: lease.securityDeposit + lease.monthlyRent,
      leaseDurationMonths: Math.round(
        (new Date(lease.endDate) - new Date(lease.startDate)) / (1000 * 60 * 60 * 24 * 30)
      )
    };

    return Response.json({ 
      success: true,
      lease: enhancedLease
    });

  } catch (error) {
    console.error('Error fetching lease details:', error);
    return Response.json({ error: 'Failed to fetch lease details' }, { status: 500 });
  }
}