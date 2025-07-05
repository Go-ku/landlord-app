// app/api/landlord/property-request/[requestId]/reject/route.js - Reject property request
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'landlord') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { requestId } = params;
    const { rejectionReason } = await request.json();

    const propertyRequest = await PropertyRequest.findOne({
      _id: requestId,
      landlord: session.user.id,
      status: 'pending'
    }).populate('tenant');

    if (!propertyRequest) {
      return Response.json({ error: 'Property request not found' }, { status: 404 });
    }

    // Reject the request
    propertyRequest.rejectRequest(session.user.id, rejectionReason);
    await propertyRequest.save();

    // Create rejection notification for tenant
    await Notification.createRequestRejectedNotification(
      propertyRequest.tenant._id,
      session.user.id,
      requestId,
      rejectionReason
    );

    return Response.json({ 
      success: true, 
      message: 'Property request rejected'
    });

  } catch (error) {
    console.error('Error rejecting property request:', error);
    return Response.json({ error: 'Failed to reject property request' }, { status: 500 });
  }
}