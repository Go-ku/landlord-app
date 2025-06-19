// models/Payment.js - Fixed Payment Model
import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
  // Basic payment info
  receiptNumber: {
    type: String,
    required: true,
    unique: true
  },
  amount: { 
    type: Number, 
    required: true,
    min: 0
  },
  paymentDate: { 
    type: Date, 
    required: true 
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'card', 'mobile_money', 'cheque', 'manual'],
    required: true
  },
  
  // Relationships
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  lease: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lease'
  },
  
  // Payment categorization
  paymentType: {
    type: String,
    enum: ['rent', 'deposit', 'utilities', 'maintenance', 'fees', 'other'],
    default: 'rent'
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled', 'verified'],
    default: 'pending'
  },
  
  // Approval System Fields
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  requiresApprovalFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  approvalNotes: String,
  rejectionReason: String,
  
  approvalHistory: [{
    action: {
      type: String,
      enum: ['submitted', 'approved', 'rejected', 'resubmitted', 'updated', 'cancelled']
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Admin who recorded this payment
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Additional details
  description: String,
  notes: String,
  
  // Receipt generation
  receiptGenerated: {
    type: Boolean,
    default: false
  },
  receiptUrl: String,
  
  // Late payment tracking
  lateFee: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Reference numbers
  referenceNumber: String,
  
  // Due date (for tracking overdue payments)
  dueDate: Date,
  
  // Cancellation tracking
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancelledAt: Date,
  cancellationReason: String

}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create indexes for better performance
PaymentSchema.index({ receiptNumber: 1 }, { unique: true });
PaymentSchema.index({ tenant: 1 });
PaymentSchema.index({ property: 1 });
PaymentSchema.index({ paymentDate: -1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ approvalStatus: 1 });
PaymentSchema.index({ recordedBy: 1 });
PaymentSchema.index({ paymentType: 1 });
PaymentSchema.index({ createdAt: -1 });

// Compound indexes for common queries
PaymentSchema.index({ tenant: 1, status: 1 });
PaymentSchema.index({ property: 1, paymentDate: -1 });
PaymentSchema.index({ approvalStatus: 1, createdAt: -1 });

// Virtual fields
PaymentSchema.virtual('isApproved').get(function() {
  return this.approvalStatus === 'approved';
});

PaymentSchema.virtual('isPending').get(function() {
  return this.approvalStatus === 'pending';
});

PaymentSchema.virtual('isRejected').get(function() {
  return this.approvalStatus === 'rejected';
});

PaymentSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed' || this.status === 'verified';
});

PaymentSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('en-ZM', {
    style: 'currency',
    currency: 'ZMW'
  }).format(this.amount);
});

// Instance methods
PaymentSchema.methods.approve = function(userId, notes = '') {
  this.approvalStatus = 'approved';
  this.approvedBy = userId;
  this.approvedAt = new Date();
  this.approvalNotes = notes;
  this.status = 'completed';
  
  this.approvalHistory.push({
    action: 'approved',
    user: userId,
    notes: notes,
    timestamp: new Date()
  });
  
  return this.save();
};

PaymentSchema.methods.reject = function(userId, reason = '') {
  this.approvalStatus = 'rejected';
  this.rejectionReason = reason;
  
  this.approvalHistory.push({
    action: 'rejected',
    user: userId,
    notes: reason,
    timestamp: new Date()
  });
  
  return this.save();
};

PaymentSchema.methods.cancel = function(userId, reason = '') {
  this.status = 'cancelled';
  this.approvalStatus = 'rejected';
  this.cancelledBy = userId;
  this.cancelledAt = new Date();
  this.cancellationReason = reason;
  
  this.approvalHistory.push({
    action: 'cancelled',
    user: userId,
    notes: reason,
    timestamp: new Date()
  });
  
  return this.save();
};

PaymentSchema.methods.generateReceiptNumber = function() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  
  return `PAY-${year}${month}${day}-${random}`;
};

// Static methods
PaymentSchema.statics.findByTenant = function(tenantId, options = {}) {
  return this.find({ tenant: tenantId, ...options.filter })
    .populate('property', 'address name type')
    .populate('lease', 'monthlyRent')
    .sort(options.sort || { paymentDate: -1 })
    .limit(options.limit || 0);
};

PaymentSchema.statics.findByProperty = function(propertyId, options = {}) {
  return this.find({ property: propertyId, ...options.filter })
    .populate('tenant', 'firstName lastName name email')
    .populate('lease', 'monthlyRent')
    .sort(options.sort || { paymentDate: -1 })
    .limit(options.limit || 0);
};

PaymentSchema.statics.findPendingApprovals = function() {
  return this.find({ approvalStatus: 'pending' })
    .populate('tenant', 'firstName lastName name email')
    .populate('property', 'address name type')
    .sort({ createdAt: -1 });
};

PaymentSchema.statics.getTotalByPeriod = function(startDate, endDate, filter = {}) {
  return this.aggregate([
    {
      $match: {
        paymentDate: { $gte: startDate, $lte: endDate },
        status: { $in: ['completed', 'verified'] },
        ...filter
      }
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);
};

// Pre-save middleware
PaymentSchema.pre('save', function(next) {
  // Generate receipt number if not present
  if (!this.receiptNumber) {
    this.receiptNumber = this.generateReceiptNumber();
  }
  
  // Add initial approval history entry for new payments
  if (this.isNew && this.approvalHistory.length === 0) {
    this.approvalHistory.push({
      action: 'submitted',
      user: this.recordedBy || this.tenant,
      notes: 'Payment submitted',
      timestamp: new Date()
    });
  }
  
  next();
});

// Pre-save middleware to ensure unique receipt numbers
PaymentSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('receiptNumber')) {
    let attempts = 0;
    const maxAttempts = 5;
    
    while (attempts < maxAttempts) {
      try {
        const existing = await this.constructor.findOne({ 
          receiptNumber: this.receiptNumber,
          _id: { $ne: this._id }
        });
        
        if (!existing) {
          break; // Receipt number is unique
        }
        
        // Generate a new receipt number
        this.receiptNumber = this.generateReceiptNumber();
        attempts++;
      } catch (error) {
        return next(error);
      }
    }
    
    if (attempts >= maxAttempts) {
      return next(new Error('Could not generate unique receipt number'));
    }
  }
  
  next();
});

// Post-save middleware for notifications
PaymentSchema.post('save', async function(doc, next) {
  try {
    // TODO: Add notification logic here
    // For example, notify landlord when tenant makes a payment
    // or notify tenant when payment is approved/rejected
    
    console.log(`Payment ${doc.receiptNumber} saved with status: ${doc.status}`);
  } catch (error) {
    console.error('Error in payment post-save middleware:', error);
  }
  
  next();
});

export default mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);