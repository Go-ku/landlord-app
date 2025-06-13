// models/Payment.js - Fixed Payment Model
import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
  // Basic payment info
  receiptNumber: { 
    type: String, 
    required: true 
  },
  amount: { type: Number, required: true },
  paymentDate: { type: Date, required: true },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'card', 'mobile_money', 'cheque'],
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
    enum: ['pending', 'completed', 'failed', 'cancelled'],
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
      enum: ['submitted', 'approved', 'rejected', 'resubmitted']
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
    default: 0
  },
  
  // Reference numbers
  referenceNumber: String,
  
}, { timestamps: true });

// Create indexes separately to avoid duplicate warnings
PaymentSchema.index({ receiptNumber: 1 });
PaymentSchema.index({ tenant: 1 });
PaymentSchema.index({ property: 1 });
PaymentSchema.index({ paymentDate: -1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ approvalStatus: 1 });
PaymentSchema.index({ recordedBy: 1 });

// Virtual for display
PaymentSchema.virtual('isApproved').get(function() {
  return this.approvalStatus === 'approved';
});

PaymentSchema.virtual('isPending').get(function() {
  return this.approvalStatus === 'pending';
});

// Methods
PaymentSchema.methods.approve = function(userId, notes = '') {
  this.approvalStatus = 'approved';
  this.approvedBy = userId;
  this.approvedAt = new Date();
  this.approvalNotes = notes;
  this.status = 'completed';
  
  this.approvalHistory.push({
    action: 'approved',
    user: userId,
    notes: notes
  });
};

PaymentSchema.methods.reject = function(userId, reason = '') {
  this.approvalStatus = 'rejected';
  this.rejectionReason = reason;
  
  this.approvalHistory.push({
    action: 'rejected',
    user: userId,
    notes: reason
  });
};

// Pre-save middleware
PaymentSchema.pre('save', function(next) {
  if (!this.receiptNumber) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    this.receiptNumber = `PAY-${year}${month}${day}-${random}`;
  }
  
  next();
});

export default mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);