// models/PropertyRequest.js - Enhanced with better workflow tracking
import mongoose from 'mongoose';

const PropertyRequestSchema = new mongoose.Schema({
  // Tenant making the request
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Type of request
  requestType: {
    type: String,
    enum: ['existing_property', 'new_property', 'lease_request'],
    required: true
  },
  
  // For existing property requests
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property'
  },
  
  // For new property requests (when property doesn't exist)
  requestedPropertyDetails: {
    address: String,
    estimatedRent: Number,
    bedrooms: Number,
    bathrooms: Number,
    propertyType: String,
    description: String,
    landlordEmail: String, // If tenant knows landlord's email
    landlordPhone: String  // If tenant knows landlord's phone
  },
  
  // Landlord who needs to respond
  landlord: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Enhanced status tracking
  status: {
    type: String,
    enum: [
      'pending',           // Initial request submitted
      'landlord_contacted', // Admin contacted landlord (for new properties)
      'under_review',      // Landlord is reviewing
      'approved',          // Landlord approved, ready for lease creation
      'rejected',          // Landlord rejected
      'property_created',  // Property was created from request
      'lease_requested',   // Lease has been created
      'lease_active',      // Lease is signed and active
      'cancelled',         // Request was cancelled
      'expired'            // Request expired
    ],
    default: 'pending'
  },
  
  // Status change history
  statusHistory: [{
    status: String,
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: String,
    automaticChange: { type: Boolean, default: false }
  }],
  
  // Messages between tenant and landlord
  messages: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: String,
    messageType: {
      type: String,
      enum: ['message', 'system', 'status_update'],
      default: 'message'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    isRead: { type: Boolean, default: false }
  }],
  
  // Landlord's response
  landlordResponse: {
    message: String,
    respondedAt: Date,
    nextSteps: String,
    rejectionReason: String
  },
  
  // Move-in preferences
  moveInPreferences: {
    preferredDate: Date,
    leaseDuration: {
      type: Number, // months
      default: 12
    },
    hasDeposit: Boolean,
    depositAmount: Number,
    additionalRequests: String
  },
  
  // Priority and urgency
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  isUrgent: {
    type: Boolean,
    default: false
  },
  
  // Tracking fields
  viewedByLandlord: {
    type: Boolean,
    default: false
  },
  
  viewedAt: Date,
  
  respondedAt: Date,
  
  // Auto-expiration for pending requests
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  },
  
  // Links to created lease
  createdLease: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lease'
  },
  
  // Admin notes
  adminNotes: [{
    note: String,
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    addedAt: { type: Date, default: Date.now }
  }]
  
}, { timestamps: true });

// Indexes for performance
PropertyRequestSchema.index({ tenant: 1, status: 1 });
PropertyRequestSchema.index({ landlord: 1, status: 1 });
PropertyRequestSchema.index({ property: 1 });
PropertyRequestSchema.index({ status: 1, createdAt: -1 });
PropertyRequestSchema.index({ requestType: 1 });
PropertyRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
PropertyRequestSchema.index({ 'requestedPropertyDetails.landlordEmail': 1 });

// Virtual for getting unread message count
PropertyRequestSchema.virtual('unreadMessageCount').get(function() {
  if (!this.messages) return 0;
  return this.messages.filter(msg => !msg.isRead).length;
});

// Virtual for determining next action
PropertyRequestSchema.virtual('nextAction').get(function() {
  switch (this.status) {
    case 'pending':
      return {
        actor: 'landlord',
        action: 'review',
        message: 'Awaiting landlord review'
      };
    case 'under_review':
      return {
        actor: 'landlord',
        action: 'respond',
        message: 'Landlord reviewing application'
      };
    case 'approved':
      return {
        actor: 'landlord',
        action: 'create_lease',
        message: 'Ready for lease creation'
      };
    case 'lease_requested':
      return {
        actor: 'tenant',
        action: 'sign_lease',
        message: 'Lease agreement ready for signing'
      };
    default:
      return {
        actor: 'none',
        action: 'none',
        message: 'No action required'
      };
  }
});

// Methods
PropertyRequestSchema.methods.addMessage = function(senderId, message, messageType = 'message') {
  this.messages.push({
    sender: senderId,
    message: message,
    messageType: messageType
  });
  
  // Mark as viewed if landlord is messaging
  if (this.landlord && this.landlord.toString() === senderId.toString()) {
    this.viewedByLandlord = true;
    this.viewedAt = new Date();
  }
};

PropertyRequestSchema.methods.changeStatus = function(newStatus, changedBy, note, isAutomatic = false) {
  const oldStatus = this.status;
  this.status = newStatus;
  
  this.statusHistory.push({
    status: newStatus,
    changedBy: changedBy,
    note: note || `Status changed from ${oldStatus} to ${newStatus}`,
    automaticChange: isAutomatic
  });
  
  // Add system message for status changes
  this.addMessage(changedBy, 
    `Status updated: ${oldStatus} → ${newStatus}${note ? ` (${note})` : ''}`, 
    'system'
  );
};

PropertyRequestSchema.methods.approveRequest = function(landlordId, responseMessage, nextSteps) {
  this.changeStatus('approved', landlordId, 'Request approved by landlord');
  this.landlordResponse = {
    message: responseMessage,
    respondedAt: new Date(),
    nextSteps: nextSteps
  };
  this.respondedAt = new Date();
  this.addMessage(landlordId, responseMessage);
};

PropertyRequestSchema.methods.rejectRequest = function(landlordId, rejectionReason) {
  this.changeStatus('rejected', landlordId, 'Request rejected by landlord');
  this.landlordResponse = {
    message: rejectionReason,
    respondedAt: new Date(),
    rejectionReason: rejectionReason
  };
  this.respondedAt = new Date();
  this.addMessage(landlordId, `Request rejected: ${rejectionReason}`);
};

PropertyRequestSchema.methods.markAsViewed = function(landlordId) {
  if (!this.viewedByLandlord) {
    this.viewedByLandlord = true;
    this.viewedAt = new Date();
    
    // Mark messages as read
    this.messages.forEach(msg => {
      if (msg.sender.toString() !== landlordId.toString()) {
        msg.isRead = true;
      }
    });
  }
};

PropertyRequestSchema.methods.linkToLease = function(leaseId, changedBy) {
  this.createdLease = leaseId;
  this.changeStatus('lease_requested', changedBy, 'Lease agreement created');
};

PropertyRequestSchema.methods.activateLease = function(changedBy) {
  this.changeStatus('lease_active', changedBy, 'Lease is now active', true);
};

// Static methods
PropertyRequestSchema.statics.getPendingRequestsForLandlord = function(landlordId) {
  return this.find({
    landlord: landlordId,
    status: { $in: ['pending', 'under_review'] }
  }).populate('tenant', 'name email phone').sort({ createdAt: -1 });
};

PropertyRequestSchema.statics.getActiveRequestsForTenant = function(tenantId) {
  return this.find({
    tenant: tenantId,
    status: { $in: ['pending', 'under_review', 'approved', 'lease_requested'] }
  }).populate('landlord property').sort({ createdAt: -1 });
};

PropertyRequestSchema.statics.getRequestsRequiringAction = function() {
  return this.find({
    status: { $in: ['pending', 'approved'] },
    expiresAt: { $gt: new Date() }
  }).populate('tenant landlord property');
};

PropertyRequestSchema.statics.findByLandlordEmail = function(email) {
  return this.find({
    'requestedPropertyDetails.landlordEmail': email
  }).populate('tenant');
};

// Pre-save middleware to update expiration and priority
PropertyRequestSchema.pre('save', function(next) {
  // Update priority based on age and status
  if (this.status === 'pending') {
    const daysSinceCreated = Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
    
    if (daysSinceCreated > 7) {
      this.priority = 'high';
    } else if (daysSinceCreated > 3) {
      this.priority = 'normal';
    }
    
    if (daysSinceCreated > 14) {
      this.isUrgent = true;
    }
  }
  
  // Extend expiration for approved requests
  if (this.status === 'approved' && this.isModified('status')) {
    this.expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days for lease creation
  }
  
  next();
});

// Ensure virtuals are included in JSON responses
PropertyRequestSchema.set('toJSON', { virtuals: true });
PropertyRequestSchema.set('toObject', { virtuals: true });

export default mongoose.models.PropertyRequest || mongoose.model('PropertyRequest', PropertyRequestSchema);