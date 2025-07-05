// models/Notification.js - Enhanced for compatibility
import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  // Who receives the notification
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Who triggered the notification (optional)
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Notification details
  type: {
    type: String,
    enum: [
      // Existing types (from your current system)
      'payment_submitted',
      'lease_approved',
      'maintenance_request',
      'invoice_created',
      'general',
      // New property request types
      'tenant_registration',
      'property_request', 
      'lease_request',
      'property_inquiry',
      'account_approved',
      'property_approved',
      'property_request_approved',
      'request_rejected'
    ],
    required: true
  },
  
  title: {
    type: String,
    default: 'Notification'
  },
  
  message: {
    type: String,
    required: true
  },
  
  // Existing field for backward compatibility
  relatedDocument: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'relatedDocumentModel'
  },
  
  relatedDocumentModel: {
    type: String,
    enum: ['Payment', 'Lease', 'Property', 'Maintenance', 'Invoice', 'PropertyRequest']
  },
  
  // New specific relation fields for property request system
  relatedProperty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property'
  },
  
  relatedPropertyRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PropertyRequest'
  },
  
  relatedLease: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lease'
  },
  
  // Action required
  actionRequired: {
    type: Boolean,
    default: false
  },
  
  actionUrl: String, // URL to take action
  
  // Status
  isRead: {
    type: Boolean,
    default: false
  },
  
  readAt: Date,
  
  // Priority
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  }
  
}, { timestamps: true });

// Indexes
NotificationSchema.index({ recipient: 1, isRead: 1 });
NotificationSchema.index({ type: 1 });
NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ priority: 1 });

// Static methods
NotificationSchema.statics.createTenantRegistrationNotification = function(landlordId, tenantId, propertyRequestId) {
  return this.create({
    recipient: landlordId,
    sender: tenantId,
    type: 'tenant_registration',
    title: 'New Tenant Registration Request',
    message: 'A new tenant has registered and is requesting to rent one of your properties.',
    relatedPropertyRequest: propertyRequestId,
    relatedDocument: propertyRequestId,
    relatedDocumentModel: 'PropertyRequest',
    actionRequired: true,
    actionUrl: `/landlord/tenant-requests/${propertyRequestId}`,
    priority: 'high'
  });
};

NotificationSchema.statics.createPropertyRequestNotification = async function(landlordId, tenantId, requestDetails) {
  // If landlordId is an email, try to find the user first
  let recipientId = landlordId;
  
  if (typeof landlordId === 'string' && landlordId.includes('@')) {
    const User = mongoose.model('User');
    const landlord = await User.findOne({ email: landlordId });
    
    if (!landlord) {
      // Create a placeholder notification or handle this case
      console.warn(`Landlord with email ${landlordId} not found in system`);
      return null;
    }
    
    recipientId = landlord._id;
  }
  
  return this.create({
    recipient: recipientId,
    sender: tenantId,
    type: 'property_request',
    title: 'New Property Upload Request',
    message: `A tenant is looking for a property at ${requestDetails.address} and has requested you to list it.`,
    actionRequired: true,
    actionUrl: '/landlord/property-requests',
    priority: 'medium'
  });
};

NotificationSchema.statics.createPropertyApprovedNotification = function(tenantId, landlordId, propertyRequestId, propertyId) {
  return this.create({
    recipient: tenantId,
    sender: landlordId,
    type: 'property_approved',
    title: 'Property Request Approved',
    message: 'Your property request has been approved and the property has been created.',
    relatedPropertyRequest: propertyRequestId,
    relatedProperty: propertyId,
    relatedDocument: propertyRequestId,
    relatedDocumentModel: 'PropertyRequest',
    actionRequired: true,
    actionUrl: `/tenant/properties/${propertyId}`,
    priority: 'high'
  });
};

NotificationSchema.statics.createRequestRejectedNotification = function(tenantId, landlordId, propertyRequestId, rejectionReason) {
  return this.create({
    recipient: tenantId,
    sender: landlordId,
    type: 'request_rejected',
    title: 'Property Request Rejected',
    message: `Your property request has been rejected. Reason: ${rejectionReason}`,
    relatedPropertyRequest: propertyRequestId,
    relatedDocument: propertyRequestId,
    relatedDocumentModel: 'PropertyRequest',
    actionRequired: false,
    priority: 'medium'
  });
};

NotificationSchema.statics.createLeaseCreatedNotification = function(tenantId, landlordId, leaseId, propertyRequestId) {
  return this.create({
    recipient: tenantId,
    sender: landlordId,
    type: 'lease_approved',
    title: 'Lease Created',
    message: 'Your tenant registration has been approved and a lease has been created.',
    relatedLease: leaseId,
    relatedPropertyRequest: propertyRequestId,
    relatedDocument: leaseId,
    relatedDocumentModel: 'Lease',
    actionRequired: true,
    actionUrl: `/tenant/leases/${leaseId}`,
    priority: 'high'
  });
};

NotificationSchema.statics.markAsRead = function(notificationId, userId) {
  return this.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { isRead: true, readAt: new Date() },
    { new: true }
  );
};

NotificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    { recipient: userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
};

NotificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({ recipient: userId, isRead: false });
};

NotificationSchema.statics.getUserNotifications = function(userId, limit = 20, skip = 0) {
  return this.find({ recipient: userId })
    .populate('sender', 'firstName lastName email')
    .populate('relatedProperty', 'address city')
    .populate('relatedPropertyRequest')
    .populate('relatedLease')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);