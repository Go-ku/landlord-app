// src/app/api/notifications/route.js - Backward Compatible Version
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { NextResponse } from 'next/server';
import Notification from 'models/Notification';
import dbConnect from 'lib/db';

// GET - Fetch user's notifications (backward compatible)
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    
    // Parse query parameters (new feature, but optional)
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(searchParams.get('limit')) || 50;
    const type = searchParams.get('type'); // Filter by notification type
    const format = searchParams.get('format'); // 'enhanced' for new format, default for old
    
    // Build filter
    const filter = { recipient: session.user.id };
    if (unreadOnly) {
      filter.isRead = false;
    }
    if (type) {
      filter.type = type;
    }
    
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('sender', 'name firstName lastName')
      .populate('relatedProperty', 'address type monthlyRent') // For property notifications
      .populate('relatedPropertyRequest', 'requestType status') // For property request notifications
      .lean();

    // Transform notifications for frontend (same as your original)
    const transformedNotifications = notifications.map(notification => ({
      ...notification,
      _id: notification._id.toString(),
      recipient: notification.recipient.toString(),
      sender: notification.sender ? {
        ...notification.sender,
        _id: notification.sender._id.toString()
      } : null,
      relatedDocument: notification.relatedDocument?.toString() || null,
      relatedProperty: notification.relatedProperty ? {
        ...notification.relatedProperty,
        _id: notification.relatedProperty._id.toString()
      } : null,
      relatedPropertyRequest: notification.relatedPropertyRequest ? {
        ...notification.relatedPropertyRequest,
        _id: notification.relatedPropertyRequest._id.toString()
      } : null,
    }));

    // Return in enhanced format if requested, otherwise use original format
    if (format === 'enhanced') {
      // Get unread count for enhanced format
      const unreadCount = await Notification.countDocuments({
        recipient: session.user.id,
        isRead: false
      });

      return NextResponse.json({
        success: true,
        data: {
          notifications: transformedNotifications,
          unreadCount
        }
      });
    } else {
      // Original format - just return the array directly (backward compatible)
      return NextResponse.json(transformedNotifications);
    }
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

// POST - Create new notification (enhanced but backward compatible)
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Allow certain roles to create notifications + system-generated notifications
    const allowedRoles = ['landlord', 'manager', 'admin'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await dbConnect();
    
    const body = await request.json();
    
    // Validate required fields
    if (!body.recipient || !body.type || !body.message) {
      return NextResponse.json({ 
        error: 'Recipient, type, and message are required' 
      }, { status: 400 });
    }

    const notification = new Notification({
      recipient: body.recipient,
      sender: session.user.id,
      type: body.type,
      title: body.title || 'New Notification', // Enhanced: support title
      message: body.message,
      relatedDocument: body.relatedDocument || null,
      relatedDocumentModel: body.relatedDocumentModel || null,
      // Enhanced: New fields for property request system
      relatedProperty: body.relatedProperty || null,
      relatedPropertyRequest: body.relatedPropertyRequest || null,
      relatedLease: body.relatedLease || null,
      actionRequired: body.actionRequired || false,
      actionUrl: body.actionUrl || null, // Enhanced: action URL
      priority: body.priority || 'medium' // Enhanced: priority
    });

    await notification.save();

    // Backward compatible response
    return NextResponse.json({ 
      message: 'Notification created successfully',
      notification: notification.toObject()
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
}

// PATCH - Mark notifications as read (new feature)
export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const body = await request.json();
    const { notificationId, markAllAsRead } = body;

    if (markAllAsRead) {
      // Mark all notifications as read for this user
      const result = await Notification.updateMany(
        { recipient: session.user.id, isRead: false },
        { 
          isRead: true, 
          readAt: new Date() 
        }
      );
      
      return NextResponse.json({
        success: true,
        message: `Marked ${result.modifiedCount} notifications as read`
      });
    } else if (notificationId) {
      // Mark specific notification as read
      const notification = await Notification.findOneAndUpdate(
        { 
          _id: notificationId, 
          recipient: session.user.id 
        },
        { 
          isRead: true, 
          readAt: new Date() 
        },
        { new: true }
      );

      if (!notification) {
        return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        message: 'Notification marked as read',
        notification: notification.toObject()
      });
    } else {
      return NextResponse.json({ 
        error: 'notificationId or markAllAsRead required' 
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json({ 
      error: 'Failed to update notification'
    }, { status: 500 });
  }
}

// DELETE - Delete notification (new feature)
export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });
    }

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      recipient: session.user.id
    });

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json({ 
      error: 'Failed to delete notification'
    }, { status: 500 });
  }
}