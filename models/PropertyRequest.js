// models/PropertyRequest.js
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
  
  // Status of the request
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'property_created', 'lease_requested'],
    default: 'pending'
  },
  
  // Messages between tenant and landlord
  messages: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Landlord's response
  landlordResponse: {
    message: String,
    respondedAt: Date,
    nextSteps: String
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
  
  // Admin flags
  isUrgent: {
    type: Boolean,
    default: false
  },
  
  // Expiration for pending requests
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  }
  
}, { timestamps: true });

// Indexes
PropertyRequestSchema.index({ tenant: 1 });
PropertyRequestSchema.index({ landlord: 1 });
PropertyRequestSchema.index({ property: 1 });
PropertyRequestSchema.index({ status: 1 });
PropertyRequestSchema.index({ requestType: 1 });
PropertyRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Methods
PropertyRequestSchema.methods.addMessage = function(senderId, message) {
  this.messages.push({
    sender: senderId,
    message: message
  });
};

PropertyRequestSchema.methods.approveRequest = function(landlordId, responseMessage, nextSteps) {
  this.status = 'approved';
  this.landlordResponse = {
    message: responseMessage,
    respondedAt: new Date(),
    nextSteps: nextSteps
  };
  this.addMessage(landlordId, responseMessage);
};

PropertyRequestSchema.methods.rejectRequest = function(landlordId, rejectionReason) {
  this.status = 'rejected';
  this.landlordResponse = {
    message: rejectionReason,
    respondedAt: new Date()
  };
  this.addMessage(landlordId, rejectionReason);
};

export default mongoose.models.PropertyRequest || mongoose.model('PropertyRequest', PropertyRequestSchema);