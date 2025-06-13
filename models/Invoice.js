// models/Invoice.js - Fixed Invoice Model
import mongoose from 'mongoose';

const InvoiceSchema = new mongoose.Schema({
  // Basic invoice info
  invoiceNumber: { 
    type: String, 
    required: true 
  },
  issueDate: { type: Date, required: true },
  dueDate: { type: Date, required: true },
  
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
  
  // Invoice items
  items: [{
    description: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, required: true },
    amount: { type: Number, required: true }
  }],
  
  // Amounts
  subtotal: { type: Number, required: true },
  taxAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled'],
    default: 'draft'
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
  
  // Admin who created this invoice
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Additional info
  notes: String,
  paymentTerms: String,
  
  // Digital signature
  digitalSignature: {
    signedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    signedAt: Date,
    signatureData: String,
    ipAddress: String
  },
  
  // Payment tracking
  payments: [{
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment'
    },
    amount: Number,
    date: Date
  }]
  
}, { timestamps: true });

// Create indexes separately
InvoiceSchema.index({ invoiceNumber: 1 });
InvoiceSchema.index({ tenant: 1 });
InvoiceSchema.index({ property: 1 });
InvoiceSchema.index({ issueDate: -1 });
InvoiceSchema.index({ dueDate: 1 });
InvoiceSchema.index({ status: 1 });
InvoiceSchema.index({ approvalStatus: 1 });
InvoiceSchema.index({ createdBy: 1 });

// Virtuals
InvoiceSchema.virtual('isApproved').get(function() {
  return this.approvalStatus === 'approved';
});

InvoiceSchema.virtual('isPending').get(function() {
  return this.approvalStatus === 'pending';
});

InvoiceSchema.virtual('isOverdue').get(function() {
  return new Date() > this.dueDate && this.status !== 'paid';
});

InvoiceSchema.virtual('outstandingAmount').get(function() {
  return Math.max(0, this.totalAmount - this.paidAmount);
});

// Methods
InvoiceSchema.methods.approve = function(userId, notes = '') {
  this.approvalStatus = 'approved';
  this.approvedBy = userId;
  this.approvedAt = new Date();
  this.approvalNotes = notes;
  this.status = 'sent';
  
  this.approvalHistory.push({
    action: 'approved',
    user: userId,
    notes: notes
  });
};

InvoiceSchema.methods.reject = function(userId, reason = '') {
  this.approvalStatus = 'rejected';
  this.rejectionReason = reason;
  
  this.approvalHistory.push({
    action: 'rejected',
    user: userId,
    notes: reason
  });
};

InvoiceSchema.methods.addPayment = function(paymentId, amount) {
  this.payments.push({
    payment: paymentId,
    amount: amount,
    date: new Date()
  });
  
  this.paidAmount += amount;
  
  if (this.paidAmount >= this.totalAmount) {
    this.status = 'paid';
  }
};

// Pre-save middleware
InvoiceSchema.pre('save', function(next) {
  if (!this.invoiceNumber) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    this.invoiceNumber = `INV-${year}${month}-${random}`;
  }
  
  if (this.items && this.items.length > 0) {
    this.subtotal = this.items.reduce((sum, item) => sum + item.amount, 0);
    this.totalAmount = this.subtotal + this.taxAmount;
  }
  
  next();
});

export default mongoose.models.Invoice || mongoose.model('Invoice', InvoiceSchema);