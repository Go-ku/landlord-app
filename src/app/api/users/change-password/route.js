import { getToken } from 'next-auth/jwt';
import { hash, compare } from 'bcryptjs';
import User from 'models/User';
import dbConnect from 'lib/db';

// PUT - Change password
export async function PUT(request) {
  try {
    const token = await getUserFromToken(request);
    
    if (!token?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return Response.json({ 
        error: 'Current password and new password are required' 
      }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return Response.json({ 
        error: 'New password must be at least 6 characters long' 
      }, { status: 400 });
    }

    // Find user and check current password
    const user = await User.findById(token.id);
    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const isCurrentPasswordValid = await compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return Response.json({ error: 'Current password is incorrect' }, { status: 400 });
    }

    // Hash new password and update
    const hashedNewPassword = await hash(newPassword, 12);
    await User.findByIdAndUpdate(token.id, { 
      password: hashedNewPassword,
      requirePasswordReset: false
    });

    return Response.json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    console.error('Error changing password:', error);
    return Response.json({ 
      error: 'Failed to change password',
      details: error.message 
    }, { status: 500 });
  }
}
