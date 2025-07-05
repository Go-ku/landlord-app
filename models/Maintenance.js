import mongoose from 'mongoose';

const MaintenanceSchema = new mongoose.Schema({
  // Core fields
  propertyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Property', 
    required: true,
    index: true
  },
  tenantId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    default: null,
    index: true
  },
  landlordId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  
  // Request details
  title: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 100
  },
  description: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 1000
  },
  
  // Status and priority
  priority: { 
    type: String, 
    enum: ['Low', 'Medium', 'High'], 
    default: 'Medium',
    required: true
  },
  status: { 
    type: String, 
    enum: ['Pending', 'In Progress', 'Completed', 'Cancelled'], 
    default: 'Pending',
    required: true,
    index: true
  },
  
  // Dates
  dateReported: { 
    type: Date, 
    default: Date.now,
    required: true
  },
  dateStarted: { 
    type: Date,
    default: null
  },
  dateCompleted: { 
    type: Date,
    default: null
  },
  dueDate: {
    type: Date,
    default: null
  },
  
  // Media and attachments
  images: [{
    type: String,
    trim: true
  }],
  
  // Additional details
  category: {
    type: String,
    enum: [
      'Plumbing',
      'Electrical',
      'HVAC',
      'Appliances',
      'Flooring',
      'Painting',
      'Roofing',
      'Windows/Doors',
      'Landscaping',
      'Security',
      'Cleaning',
      'Other'
    ],
    default: 'Other'
  },
  
  urgency: {
    type: String,
    enum: ['Emergency', 'Urgent', 'Normal', 'Low'],
    default: 'Normal'
  },
  
  // Cost tracking
  estimatedCost: {
    type: Number,
    min: 0,
    default: null
  },
  actualCost: {
    type: Number,
    min: 0,
    default: null
  },
  
  // Assignment and tracking
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  contractorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // Notes and updates
  notes: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    isInternal: {
      type: Boolean,
      default: false // Internal notes only visible to landlords/managers
    }
  }],
  
  // Tenant feedback
  tenantSatisfaction: {
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    feedback: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null
    },
    submittedAt: {
      type: Date,
      default: null
    }
  },
  
  // System tracking
  isEmergency: {
    type: Boolean,
    default: false
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringFrequency: {
    type: String,
    enum: ['Weekly', 'Monthly', 'Quarterly', 'Annually'],
    default: null
  },
  
  // Notifications
  notificationsEnabled: {
    type: Boolean,
    default: true
  },
  lastNotificationSent: {
    type: Date,
    default: null
  },
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt automatically
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
MaintenanceSchema.index({ propertyId: 1, status: 1 });
MaintenanceSchema.index({ tenantId: 1, status: 1 });
MaintenanceSchema.index({ landlordId: 1, status: 1 });
MaintenanceSchema.index({ dateReported: -1 });
MaintenanceSchema.index({ priority: 1, status: 1 });
MaintenanceSchema.index({ category: 1 });

// Virtual fields
MaintenanceSchema.virtual('isOverdue').get(function() {
  if (!this.dueDate || this.status === 'Completed' || this.status === 'Cancelled') {
    return false;
  }
  return new Date() > this.dueDate;
});

MaintenanceSchema.virtual('daysOpen').get(function() {
  const endDate = this.dateCompleted || new Date();
  const diffTime = Math.abs(endDate - this.dateReported);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

MaintenanceSchema.virtual('hasImages').get(function() {
  return this.images && this.images.length > 0;
});

MaintenanceSchema.virtual('totalNotes').get(function() {
  return this.notes ? this.notes.length : 0;
});

// Pre-save middleware
MaintenanceSchema.pre('save', function(next) {
  // Set dateStarted when status changes to 'In Progress'
  if (this.isModified('status')) {
    if (this.status === 'In Progress' && !this.dateStarted) {
      this.dateStarted = new Date();
    }
    
    // Set dateCompleted when status changes to 'Completed'
    if (this.status === 'Completed' && !this.dateCompleted) {
      this.dateCompleted = new Date();
    }
    
    // Clear dateCompleted if status changes away from 'Completed'
    if (this.status !== 'Completed' && this.dateCompleted) {
      this.dateCompleted = null;
    }
  }
  
  // Set emergency flag based on priority and urgency
  if (this.priority === 'High' || this.urgency === 'Emergency') {
    this.isEmergency = true;
  }
  
  // Set createdBy if not already set
  if (this.isNew && !this.createdBy) {
    this.createdBy = this.tenantId || this.landlordId;
  }
  
  next();
});

// Instance methods
MaintenanceSchema.methods.addNote = function(authorId, content, isInternal = false) {
  this.notes.push({
    author: authorId,
    content: content.trim(),
    isInternal,
    createdAt: new Date()
  });
  this.updatedBy = authorId;
  return this.save();
};

MaintenanceSchema.methods.updateStatus = function(newStatus, userId) {
  const oldStatus = this.status;
  this.status = newStatus;
  this.updatedBy = userId;
  
  // Add automatic note for status changes
  const statusNote = `Status changed from ${oldStatus} to ${newStatus}`;
  this.notes.push({
    author: userId,
    content: statusNote,
    isInternal: true,
    createdAt: new Date()
  });
  
  return this.save();
};

MaintenanceSchema.methods.setTenantFeedback = function(rating, feedback) {
  this.tenantSatisfaction = {
    rating,
    feedback: feedback ? feedback.trim() : null,
    submittedAt: new Date()
  };
  return this.save();
};

// Static methods
MaintenanceSchema.statics.getByStatus = function(status, userId = null, userRole = null) {
  let query = { status };
  
  if (userRole === 'tenant' && userId) {
    query.tenantId = userId;
  } else if (userRole === 'landlord' && userId) {
    query.landlordId = userId;
  }
  
  return this.find(query)
    .populate('propertyId', 'address name type')
    .populate('tenantId', 'name firstName lastName email phone')
    .populate('landlordId', 'name firstName lastName email phone')
    .sort({ dateReported: -1 });
};

MaintenanceSchema.statics.getOverdueRequests = function(userId = null, userRole = null) {
  let query = {
    status: { $in: ['Pending', 'In Progress'] },
    dueDate: { $lt: new Date() }
  };
  
  if (userRole === 'tenant' && userId) {
    query.tenantId = userId;
  } else if (userRole === 'landlord' && userId) {
    query.landlordId = userId;
  }
  
  return this.find(query)
    .populate('propertyId', 'address name')
    .populate('tenantId', 'name firstName lastName email')
    .sort({ dueDate: 1 });
};

MaintenanceSchema.statics.getEmergencyRequests = function(userId = null, userRole = null) {
  let query = {
    $or: [
      { priority: 'High' },
      { urgency: 'Emergency' },
      { isEmergency: true }
    ],
    status: { $ne: 'Completed' }
  };
  
  if (userRole === 'tenant' && userId) {
    query.tenantId = userId;
  } else if (userRole === 'landlord' && userId) {
    query.landlordId = userId;
  }
  
  return this.find(query)
    .populate('propertyId', 'address name')
    .populate('tenantId', 'name firstName lastName email')
    .sort({ dateReported: -1 });
};

// Export the model
export default mongoose.models.Maintenance || mongoose.model('Maintenance', MaintenanceSchema);