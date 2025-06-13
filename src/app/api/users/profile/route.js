// app/api/users/profile/route.js
import { getToken } from 'next-auth/jwt';
import User from 'models/User';
import dbConnect from 'lib/db';

async function getUserFromToken(request) {
  try {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    });
    return token;
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
}

// GET - Fetch user profile
export async function GET(request) {
  try {
    const token = await getUserFromToken(request);
    
    if (!token?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findById(token.id)
      .select('-password')
      .populate('currentProperty', 'address type monthlyRent')
      .populate('currentLease', 'monthlyRent startDate endDate')
      .lean();

    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    return Response.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Error fetching profile:', error);
    return Response.json({ 
      error: 'Failed to fetch profile',
      details: error.message 
    }, { status: 500 });
  }
}

// PUT - Update user profile
export async function PUT(request) {
  try {
    const token = await getUserFromToken(request);
    
    if (!token?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const body = await request.json();
    
    // Fields allowed to be updated
    const allowedFields = ['name', 'phone', 'company', 'dateOfBirth', 'emergencyContact'];
    const updateData = {};
    
    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    const updatedUser = await User.findByIdAndUpdate(
      token.id,
      updateData,
      { new: true, runValidators: true }
    )
    .select('-password')
    .populate('currentProperty', 'address type monthlyRent')
    .populate('currentLease', 'monthlyRent startDate endDate');

    return Response.json({
      success: true,
      user: updatedUser,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    return Response.json({ 
      error: 'Failed to update profile',
      details: error.message 
    }, { status: 500 });
  }
}
