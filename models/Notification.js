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
    enum: ['Payment', 'Lease', 'Property', 'MaintenanceRequest', 'Invoice', 'PropertyRequest']
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
    actionRequired: true,
    actionUrl: `/landlord/tenant-requests/${propertyRequestId}`,
    priority: 'high'
  });
};

NotificationSchema.statics.createPropertyRequestNotification = function(landlordEmail, tenantId, requestDetails) {
  return this.create({
    recipient: landlordEmail, // Will need to find landlord by email
    sender: tenantId,
    type: 'property_request',
    title: 'New Property Upload Request',
    message: `A tenant is looking for a property at ${requestDetails.address} and has requested you to list it.`,
    actionRequired: true,
    actionUrl: '/landlord/property-requests',
    priority: 'medium'
  });
};

NotificationSchema.statics.markAsRead = function(notificationId, userId) {
  return this.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { isRead: true, readAt: new Date() }
  );
};

export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);