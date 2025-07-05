// app/api/landlord/tenant-requests/route.js - Get landlord's tenant requests
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from 'lib/db';
import PropertyRequest from 'models/PropertyRequest';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'landlord') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const skip = (page - 1) * limit;

    let filter = { landlord: session.user.id };
    if (status) {
      filter.status = status;
    }

    const requests = await PropertyRequest.find(filter)
      .populate('tenant', 'name email phone')
      .populate('property', 'address city monthlyRent type')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await PropertyRequest.countDocuments(filter);

    // Get status counts for dashboard
    const statusCounts = await PropertyRequest.aggregate([
      { $match: { landlord: session.user.id } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const counts = statusCounts.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    return Response.json({
      requests,
      statusCounts: counts,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Error fetching tenant requests:', error);
    return Response.json({ error: 'Failed to fetch tenant requests' }, { status: 500 });
  }
}