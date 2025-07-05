
// app/api/tenant/lease/[leaseId]/document/route.js - Download lease document
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'tenant') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { leaseId } = params;

    const lease = await Lease.findOne({
      _id: leaseId,
      tenantId: session.user.id
    });

    if (!lease) {
      return Response.json({ error: 'Lease not found' }, { status: 404 });
    }

    // If lease document exists, return download link
    if (lease.leaseDocument && lease.leaseDocument.url) {
      return Response.json({
        documentUrl: lease.leaseDocument.url,
        fileName: lease.leaseDocument.fileName || `Lease_${leaseId}.pdf`
      });
    }

    // Generate PDF document (you would implement PDF generation here)
    // For now, return a placeholder
    return Response.json({
      message: 'Document generation not implemented yet',
      placeholder: true
    });

  } catch (error) {
    console.error('Error fetching lease document:', error);
    return Response.json({ error: 'Failed to fetch lease document' }, { status: 500 });
  }
}