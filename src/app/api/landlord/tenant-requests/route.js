// src/app/api/landlord/tenant-requests/route.js
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { NextResponse } from 'next/server';
import dbConnect from 'lib/db';
import PropertyRequest from 'models/PropertyRequest';
import Property from 'models/Property';

// GET - Fetch landlord's tenant requests
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow landlords
    if (session.user.role !== 'landlord') {
      return NextResponse.json({ error: 'Forbidden - Landlord access only' }, { status: 403 });
    }

    await dbConnect();

    // Fetch property requests for this landlord
    const propertyRequests = await PropertyRequest.find({ 
      landlord: session.user.id 
    })
      .populate('tenant', 'name email phone')
      .populate('property', 'address monthlyRent type bedrooms bathrooms')
      .sort({ createdAt: -1 })
      .lean();

    // Also fetch requests where landlord owns the requested property (existing property requests)
    const ownedProperties = await Property.find({ landlord: session.user.id }).select('_id');
    const propertyIds = ownedProperties.map(p => p._id);

    const existingPropertyRequests = await PropertyRequest.find({
      property: { $in: propertyIds },
      landlord: { $ne: session.user.id } // Don't duplicate requests already fetched above
    })
      .populate('tenant', 'name email phone')
      .populate('property', 'address monthlyRent type bedrooms bathrooms')
      .sort({ createdAt: -1 })
      .lean();

    // Combine and deduplicate requests
    const allRequests = [...propertyRequests, ...existingPropertyRequests];
    const uniqueRequests = allRequests.filter((request, index, self) => 
      index === self.findIndex(r => r._id.toString() === request._id.toString())
    );

    // Add additional metadata
    const enrichedRequests = uniqueRequests.map(request => ({
      ...request,
      _id: request._id.toString(),
      tenant: request.tenant ? {
        ...request.tenant,
        _id: request.tenant._id.toString()
      } : null,
      property: request.property ? {
        ...request.property,
        _id: request.property._id.toString()
      } : null,
      isUrgent: request.createdAt > new Date(Date.now() - 24 * 60 * 60 * 1000), // Created in last 24 hours
      daysOld: Math.floor((new Date() - new Date(request.createdAt)) / (1000 * 60 * 60 * 24))
    }));

    return NextResponse.json({
      success: true,
      data: enrichedRequests
    });

  } catch (error) {
    console.error('Error fetching tenant requests:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch tenant requests'
    }, { status: 500 });
  }
}

