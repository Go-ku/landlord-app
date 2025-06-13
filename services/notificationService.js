// services/notificationService.js
import Notification from 'models/Notification';
import dbConnect from '@/lib/db';

export async function createNotification({
  recipientId,
  senderId,
  type,
  message,
  relatedDocument,
  relatedDocumentModel,
  actionRequired = false
}) {
  await dbConnect();
  
  return await Notification.create({
    recipient: recipientId,
    sender: senderId,
    type,
    message,
    relatedDocument,
    relatedDocumentModel,
    actionRequired
  });
}

export async function getUnreadNotifications(userId) {
  await dbConnect();
  return await Notification.find({ 
    recipient: userId, 
    isRead: false 
  }).sort({ createdAt: -1 });
}