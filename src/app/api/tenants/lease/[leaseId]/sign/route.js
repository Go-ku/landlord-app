

// app/api/tenant/lease/[leaseId]/sign/route.js - Enhanced signing endpoint
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from 'lib/db';
import Lease from 'models/Lease';
import Notification from 'models/Notification';

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'tenant') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { leaseId } = await params;
    const { 
      signatureData, 
      personalInfo, 
      ipAddress, 
      agreementAccepted 
    } = await request.json();

    // Validate required fields
    if (!signatureData) {
      return Response.json({ error: 'Signature is required' }, { status: 400 });
    }

    if (!personalInfo.fullName || !personalInfo.dateOfBirth || !personalInfo.idNumber) {
      return Response.json({ error: 'Complete personal information is required' }, { status: 400 });
    }

    if (!personalInfo.emergencyContact.name || !personalInfo.emergencyContact.phone) {
      return Response.json({ error: 'Emergency contact information is required' }, { status: 400 });
    }

    // Check if all agreements are accepted
    const requiredAgreements = ['terms', 'rent', 'deposit', 'maintenance', 'policies'];
    const allAccepted = requiredAgreements.every(key => agreementAccepted[key]);
    
    if (!allAccepted) {
      return Response.json({ error: 'All lease terms must be accepted' }, { status: 400 });
    }

    const lease = await Lease.findOne({
      _id: leaseId,
      tenantId: session.user.id,
      status: 'pending_signature'
    }).populate('landlordId propertyId');

    if (!lease) {
      return Response.json({ error: 'Lease not found or not eligible for signing' }, { status: 404 });
    }

    // Get client IP address
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';

    // Sign the lease with enhanced data
    lease.tenantSignature = {
      signed: true,
      signedAt: new Date(),
      signatureData: signatureData,
      ipAddress: clientIP,
      personalInfo: personalInfo,
      agreementAccepted: agreementAccepted,
      userAgent: request.headers.get('user-agent') || 'unknown'
    };

    // Update status and calculate first payment
    lease.status = 'signed';
    lease.firstPaymentRequired = lease.securityDeposit + lease.monthlyRent;
    lease.balanceDue = lease.securityDeposit + lease.monthlyRent
    // Add status history
    lease.statusHistory.push({
      status: 'signed',
      changedBy: session.user.id,
      note: `Lease signed by tenant: ${personalInfo.fullName}`
    });

    await lease.save();

    // Create notification for landlord
    await Notification.create({
      recipient: lease.landlordId._id,
      sender: session.user.id,
      type: 'lease_request',
      title: 'Lease Agreement Signed',
      message: `${personalInfo.fullName} has signed the lease agreement. Awaiting first payment of $${lease.firstPaymentRequired.toLocaleString()}.`,
      relatedLease: lease._id,
      relatedProperty: lease.propertyId._id,
      relatedDocument: lease._id,
      relatedDocumentModel: 'Lease',
      actionRequired: false,
      priority: 'medium'
    });

    // Create notification for tenant about next steps
    await Notification.create({
      recipient: session.user.id,
      type: 'general',
      title: 'Lease Signed Successfully',
      message: `Your lease has been signed successfully. Please make your first payment of $${lease.firstPaymentRequired.toLocaleString()} (Security deposit + First month rent) to activate the lease.`,
      relatedLease: lease._id,
      actionRequired: true,
      actionUrl: `/tenant/lease/${lease._id}/payment`,
      priority: 'high'
    });
    console.log(session.user.id)
    // Update tenant's current lease reference
    await User.findByIdAndUpdate(session.user.id, {
      currentLease: lease._id,
      currentProperty: lease.propertyId._id
    });

    return Response.json({ 
      success: true, 
      message: 'Lease signed successfully',
      nextAction: 'payment',
      paymentAmount: lease.firstPaymentRequired,
      leaseStatus: 'signed'
    });

  } catch (error) {
    console.error('Error signing lease:', error);
    return Response.json({ error: 'Failed to sign lease' }, { status: 500 });
  }
}
