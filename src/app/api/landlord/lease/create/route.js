// app/api/landlord/lease/create/route.js - Create lease from property request
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from 'lib/db';
import Lease from 'models/Lease';
import PropertyRequest from 'models/PropertyRequest';
import Notification from 'models/Notification';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'landlord') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { propertyRequestId, leaseTerms } = await request.json();

    // Validate property request
    const propertyRequest = await PropertyRequest.findOne({
      _id: propertyRequestId,
      landlord: session.user.id,
      status: 'approved'
    }).populate('tenant property');

    if (!propertyRequest) {
      return Response.json({ error: 'Property request not found or not approved' }, { status: 404 });
    }

    // Check if lease already exists
    const existingLease = await Lease.findOne({
      propertyRequestId: propertyRequestId,
      status: { $in: ['draft', 'pending_signature', 'signed', 'active'] }
    });

    if (existingLease) {
      return Response.json({ error: 'Lease already exists for this property request' }, { status: 400 });
    }

    // Create lease
    const lease = await Lease.createFromPropertyRequest(
      propertyRequestId,
      session.user.id,
      leaseTerms
    );
    await lease.save();

    // Update property request status
    propertyRequest.status = 'lease_requested';
    await propertyRequest.save();

    // Send lease to tenant for signature
    lease.sendToTenant();
    await lease.save();

    // Create notification for tenant
    await Notification.createLeaseCreatedNotification(
      propertyRequest.tenant._id,
      session.user.id,
      lease._id,
      propertyRequestId
    );

    return Response.json({ 
      success: true, 
      message: 'Lease created and sent to tenant for signature',
      leaseId: lease._id
    });

  } catch (error) {
    console.error('Error creating lease:', error);
    return Response.json({ error: 'Failed to create lease' }, { status: 500 });
  }
}