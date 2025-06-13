// src/app/api/notifications/[id]/route.js
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { NextResponse } from 'next/server';
import Notification from 'models/Notification';
import Payment from 'models/Payment';
import dbConnect from 'lib/db';
import mongoose from 'mongoose';

// PATCH - Update notification (mark as read, approve/reject actions)
export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    
    const { id } = params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid notification ID' }, { status: 400 });
    }

    const body = await request.json();
    const { action } = body;

    // Find the notification
    const notification = await Notification.findById(id);
    
    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Check if user has permission to update this notification
    if (notification.recipient.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized to update this notification' }, { status: 403 });
    }

    let updateData = {};
    let responseMessage = 'Notification updated successfully';

    switch (action) {
      case 'mark_read':
        updateData = { isRead: true };
        responseMessage = 'Notification marked as read';
        break;

      case 'approve':
        if (!notification.actionRequired || notification.actionTaken) {
          return NextResponse.json({ error: 'No action required or already taken' }, { status: 400 });
        }

        // Handle payment approval if it's a payment notification
        if (notification.type === 'payment' && notification.relatedDocument && notification.relatedDocumentModel === 'Payment') {
          try {
            const payment = await Payment.findById(notification.relatedDocument);
            if (payment && payment.status === 'pending') {
              await payment.verify(session.user.id, 'Approved via notification');
            }
          } catch (error) {
            console.error('Error approving payment:', error);
          }
        }

        updateData = { 
          isRead: true, 
          actionTaken: true,
          actionResult: 'approved',
          actionTakenAt: new Date(),
          actionTakenBy: session.user.id
        };
        responseMessage = 'Action approved successfully';
        break;

      case 'reject':
      case 'dispute':
        if (!notification.actionRequired || notification.actionTaken) {
          return NextResponse.json({ error: 'No action required or already taken' }, { status: 400 });
        }

        // Handle payment dispute if it's a payment notification
        if (notification.type === 'payment' && notification.relatedDocument && notification.relatedDocumentModel === 'Payment') {
          try {
            const payment = await Payment.findById(notification.relatedDocument);
            if (payment && payment.status === 'pending') {
              await payment.dispute(session.user.id, 'Disputed via notification');
            }
          } catch (error) {
            console.error('Error disputing payment:', error);
          }
        }

        updateData = { 
          isRead: true, 
          actionTaken: true,
          actionResult: 'rejected',
          actionTakenAt: new Date(),
          actionTakenBy: session.user.id
        };
        responseMessage = 'Action rejected successfully';
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Update the notification
    const updatedNotification = await Notification.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    return NextResponse.json({
      message: responseMessage,
      notification: updatedNotification.toObject()
    });

  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}

// DELETE - Delete notification
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    
    const { id } = params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid notification ID' }, { status: 400 });
    }

    // Find the notification
    const notification = await Notification.findById(id);
    
    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Check if user has permission to delete this notification
    if (notification.recipient.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized to delete this notification' }, { status: 403 });
    }

    // Delete the notification
    await Notification.findByIdAndDelete(id);

    return NextResponse.json({
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
  }
}