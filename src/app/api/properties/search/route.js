// src/app/api/properties/search/route.js - Compatible with your auth system
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { NextResponse } from 'next/server';
import dbConnect from 'lib/db';
import Property from 'models/Property';
import User from 'models/User';
import PropertyRequest from 'models/PropertyRequest';

export async function GET(request) {
  try {
    // Note: Property search can be public or require auth depending on your needs
    // For now, making it public for tenant registration, but you can add auth if needed
    
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const minRent = searchParams.get('minRent');
    const maxRent = searchParams.get('maxRent');
    const propertyType = searchParams.get('type');
    const bedrooms = searchParams.get('bedrooms');
    const city = searchParams.get('city');
    
    // Build search filter
    const filter = {
      isAvailable: true
    };
    
    // Address search (fuzzy matching)
    if (query.trim()) {
      filter.$or = [
        { address: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ];
    }
    
    // Price range
    if (minRent || maxRent) {
      filter.monthlyRent = {};
      if (minRent) filter.monthlyRent.$gte = parseFloat(minRent);
      if (maxRent) filter.monthlyRent.$lte = parseFloat(maxRent);
    }
    
    // Property type
    if (propertyType && propertyType !== 'all') {
      filter.type = propertyType;
    }
    
    // Bedrooms
    if (bedrooms && bedrooms !== 'any') {
      filter.bedrooms = parseInt(bedrooms);
    }
    
    // City search in address
    if (city) {
      filter.address = { $regex: city, $options: 'i' };
    }
    
    const properties = await Property.find(filter)
      .populate('landlord', 'name email phone company')
      .select('address type monthlyRent bedrooms bathrooms squareFeet images description landlord')
      .limit(50)
      .sort({ createdAt: -1 });
    
    // Get unique cities for suggestions
    const cities = await Property.distinct('address').then(addresses => {
      const citySet = new Set();
      addresses.forEach(address => {
        // Extract city from address (basic extraction)
        const parts = address.split(',');
        if (parts.length > 1) {
          citySet.add(parts[parts.length - 2].trim());
        }
      });
      return Array.from(citySet).slice(0, 10);
    });
    
    return NextResponse.json({
      success: true,
      data: {
        properties,
        cities,
        total: properties.length
      }
    });
    
  } catch (error) {
    console.error('Property search error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search properties' },
      { status: 500 }
    );
  }
}

// POST - Create property request when property not found
export async function POST(request) {
  try {
    // This endpoint might be called during registration when user isn't authenticated yet
    // So we'll make it work without authentication for the registration flow
    
    await dbConnect();
    
    const body = await request.json();
    const {
      address,
      estimatedRent,
      bedrooms,
      bathrooms,
      propertyType,
      description,
      landlordEmail,
      landlordPhone,
      tenantId, // This will be provided during registration
      moveInDate,
      leaseDuration
    } = body;
    
    // Validate required fields
    if (!address || !tenantId) {
      return NextResponse.json(
        { success: false, error: 'Address and tenant ID are required' },
        { status: 400 }
      );
    }
    
    // Try to find landlord by email if provided
    let landlord = null;
    if (landlordEmail) {
      landlord = await User.findOne({ 
        email: landlordEmail.toLowerCase(), 
        role: 'landlord' 
      });
    }
    
    const propertyRequest = new PropertyRequest({
      tenant: tenantId,
      requestType: 'new_property',
      requestedPropertyDetails: {
        address,
        estimatedRent: estimatedRent ? parseFloat(estimatedRent) : null,
        bedrooms: bedrooms ? parseInt(bedrooms) : null,
        bathrooms: bathrooms ? parseFloat(bathrooms) : null,
        propertyType,
        description,
        landlordEmail,
        landlordPhone
      },
      landlord: landlord?._id || null,
      moveInPreferences: {
        preferredDate: moveInDate ? new Date(moveInDate) : null,
        leaseDuration: leaseDuration ? parseInt(leaseDuration) : 12
      }
    });
    
    await propertyRequest.save();
    
    // Create notification for landlord if found
    if (landlord) {
      const Notification = (await import('models/Notification')).default;
      await Notification.create({
        recipient: landlord._id,
        sender: tenantId,
        type: 'property_request',
        title: 'New Property Listing Request',
        message: `A tenant has requested you to list a property at ${address}.`,
        relatedPropertyRequest: propertyRequest._id,
        relatedDocument: propertyRequest._id,
        relatedDocumentModel: 'PropertyRequest',
        actionRequired: true,
        priority: 'medium'
      });
    }
    
    return NextResponse.json({
      success: true,
      data: propertyRequest,
      message: landlord 
        ? 'Property request sent to landlord successfully'
        : 'Property request created. We will try to contact the landlord.'
    });
    
  } catch (error) {
    console.error('Property request error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create property request' },
      { status: 500 }
    );
  }
}