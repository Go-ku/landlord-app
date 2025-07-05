// app/api/properties/search/route.js - Property search for tenants
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from 'lib/db';
import Property from 'models/Property';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const minRent = searchParams.get('minRent');
    const maxRent = searchParams.get('maxRent');
    const bedrooms = searchParams.get('bedrooms');
    const propertyType = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit')) || 20;

    // Build search filter
    let filter = { isAvailable: true };

    if (query) {
      filter.$or = [
        { address: { $regex: query, $options: 'i' } },
        { city: { $regex: query, $options: 'i' } },
        { type: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ];
    }

    if (minRent || maxRent) {
      filter.monthlyRent = {};
      if (minRent) filter.monthlyRent.$gte = parseInt(minRent);
      if (maxRent) filter.monthlyRent.$lte = parseInt(maxRent);
    }

    if (bedrooms) {
      filter.bedrooms = parseInt(bedrooms);
    }

    if (propertyType) {
      filter.type = propertyType;
    }

    const properties = await Property.find(filter)
      .populate('landlord', 'name email phone company')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return Response.json({ properties });

  } catch (error) {
    console.error('Error searching properties:', error);
    return Response.json({ error: 'Failed to search properties' }, { status: 500 });
  }
}