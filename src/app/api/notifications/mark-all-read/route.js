// src/app/api/notifications/mark-all-read/route.js
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { NextResponse } from 'next/server';
import Notification from 'models/Notification';
import dbConnect from 'lib/db';

// POST - Mark all notifications as read for the current user
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    
    // Update all unread notifications for this user
    const result = await Notification.updateMany(
      { 
        recipient: session.user.id,
        isRead: false
      },
      { 
        isRead: true,
        readAt: new Date()
      }
    );

    return NextResponse.json({
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json({ 
      error: 'Failed to mark all notifications as read' 
    }, { status: 500 });
  }
}