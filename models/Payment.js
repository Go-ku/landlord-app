// models/Payment.js - Hybrid Payment Model
import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
  // Basic Payment Information (keeping both naming conventions for compatibility)
  receiptNumber: {
    type: String,
    required: [true, 'Receipt number is required'],
    unique: true
  },
  paymentRef: {
    type: String,
    unique: true,
    sparse: true, // Allows null values while maintaining uniqueness
    uppercase: true
  },
  
  // Amount Information
  amount: { 
    type: Number, 
    required: [true, 'Payment amount is required'],
    min: [0.01, 'Payment amount must be greater than 0']
  },
  expectedAmount: {
    type: Number,
    min: [0.01, 'Expected amount must be greater than 0']
  },
  currency: {
    type: String,
    enum: ['ZMW', 'USD'],
    default: 'ZMW'
  },
  
  // Date Information
  paymentDate: { 
    type: Date, 
    required: [true, 'Payment date is required'],
    default: Date.now
  },
  dueDate: {
    type: Date
  },
  
  // Payment Method and Transaction Details
  paymentMethod: {
    type: String,
    enum: [
      'cash', 
      'bank_transfer', 
      'card', 
      'mobile_money', 
      'cheque', 
      'manual',
      // Extended options
      'MTN_MOBILE_MONEY',
      'AIRTEL_MONEY',
      'ZAMTEL_KWACHA'
    ],
    required: [true, 'Payment method is required']
  },
  
  // Relationships (supporting both old and new field names)
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Tenant is required']
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: [true, 'Property is required']
  },
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property'
  },
  
  lease: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lease'
  },
  leaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lease'
  },
  
  landlordId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Payment categorization
  paymentType: {
    type: String,
    enum: [
      'rent', 'deposit', 'utilities', 'maintenance', 'fees', 'other', 'first_payment',
      // Extended options
      'MONTHLY_RENT', 'DEPOSIT', 'SERVICE_CHARGE', 'LATE_FEE', 
      'UTILITY_BILL', 'MAINTENANCE_FEE', 'PENALTY', 'REFUND', 
      'PARTIAL_PAYMENT', 'OTHER'
    ],
    default: 'rent'
  },
  
  // Payment Period Information (for advanced tracking)
  paymentPeriod: {
    month: {
      type: Number,
      min: [1, 'Month must be between 1 and 12'],
      max: [12, 'Month must be between 1 and 12']
    },
    year: {
      type: Number,
      min: [2020, 'Year must be 2020 or later']
    }
  },
  
  // Status tracking (hybrid approach)
  status: {
    type: String,
    enum: [
      'pending', 'completed', 'failed', 'cancelled', 'verified',
      // Extended statuses
      'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PARTIALLY_APPROVED', 'REFUNDED'
    ],
    default: 'pending'
  },
  
  // Approval System Fields
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  approvalNotes: String,
  rejectionReason: String,
  
  // Approval History
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
  
  // Transaction Details (for MoMo and other payment methods)
  transactionDetails: {
    transactionId: {
      type: String,
      trim: true
    },
    transactionDate: {
      type: Date,
      default: Date.now
    },
    bankName: String,
    accountNumber: String,
    chequeNumber: String,
    mobileMoneyNumber: String,
    confirmationCode: String,
    receiptNumber: String,
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters']
    }
  },
  
  // Reference numbers (for MoMo integration)
  referenceNumber: String,
  
  // Admin who recorded this payment
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Additional details
  description: String,
  notes: String,
  
  // Receipt Information
  receipt: {
    receiptNumber: {
      type: String,
      unique: true,
      sparse: true
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    issuedAt: Date,
    receiptUrl: String,
    sentToTenant: {
      type: Boolean,
      default: false
    },
    sentAt: Date,
    sentVia: [{
      method: {
        type: String,
        enum: ['EMAIL', 'WHATSAPP', 'SMS', 'PORTAL']
      },
      sentAt: {
        type: Date,
        default: Date.now
      },
      status: {
        type: String,
        enum: ['SENT', 'DELIVERED', 'FAILED'],
        default: 'SENT'
      }
    }]
  },
  
  // Late payment tracking
  latePayment: {
    isLate: {
      type: Boolean,
      default: false
    },
    daysLate: {
      type: Number,
      default: 0
    },
    lateFeeApplied: {
      type: Number,
      default: 0
    },
    lateFeeWaived: {
      type: Boolean,
      default: false
    }
  },
  
  // Legacy fields for backward compatibility
  receiptGenerated: {
    type: Boolean,
    default: false
  },
  receiptUrl: String,
  lateFee: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Audit fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }

}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
PaymentSchema.index({ receiptNumber: 1 }, { unique: true });
PaymentSchema.index({ tenant: 1, status: 1 });
PaymentSchema.index({ property: 1 });
PaymentSchema.index({ paymentDate: -1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ approvalStatus: 1 });
PaymentSchema.index({ referenceNumber: 1 });

// Virtual fields for compatibility
PaymentSchema.virtual('isApproved').get(function() {
  return this.approvalStatus === 'approved' || this.status === 'APPROVED';
});

PaymentSchema.virtual('isPending').get(function() {
  return this.approvalStatus === 'pending' || this.status === 'pending';
});

PaymentSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed' || this.status === 'verified' || this.status === 'APPROVED';
});

PaymentSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('en-ZM', {
    style: 'currency',
    currency: this.currency || 'ZMW'
  }).format(this.amount);
});

// Virtual for payment period string
PaymentSchema.virtual('paymentPeriodString').get(function() {
  if (!this.paymentPeriod?.month || !this.paymentPeriod?.year) return '';
  
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return `${months[this.paymentPeriod.month - 1]} ${this.paymentPeriod.year}`;
});

// Pre-save middleware for data consistency
PaymentSchema.pre('save', function(next) {
  // Sync tenant/tenantId fields
  if (this.tenant && !this.tenantId) {
    this.tenantId = this.tenant;
  } else if (this.tenantId && !this.tenant) {
    this.tenant = this.tenantId;
  }
  
  // Sync property/propertyId fields
  if (this.property && !this.propertyId) {
    this.propertyId = this.property;
  } else if (this.propertyId && !this.property) {
    this.property = this.propertyId;
  }
  
  // Sync lease/leaseId fields
  if (this.lease && !this.leaseId) {
    this.leaseId = this.lease;
  } else if (this.leaseId && !this.lease) {
    this.lease = this.leaseId;
  }
  
  // Set expectedAmount if not provided
  if (!this.expectedAmount) {
    this.expectedAmount = this.amount;
  }
  
  // Generate receipt number if not present
  if (this.isNew && !this.receiptNumber) {
    this.receiptNumber = this.generateReceiptNumber();
  }
  
  // Auto-set payment period from payment date
  if (this.paymentDate && (!this.paymentPeriod?.month || !this.paymentPeriod?.year)) {
    const date = new Date(this.paymentDate);
    this.paymentPeriod = {
      month: date.getMonth() + 1,
      year: date.getFullYear()
    };
  }
  
  // Calculate late payment information
  if (this.dueDate && new Date() > this.dueDate && !this.isCompleted) {
    this.latePayment.isLate = true;
    const diffTime = new Date() - this.dueDate;
    this.latePayment.daysLate = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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

// Instance methods
PaymentSchema.methods.generateReceiptNumber = function() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  
  return `PAY-${year}${month}${day}-${random}`;
};

PaymentSchema.methods.approve = function(userId, notes = '') {
  this.approvalStatus = 'approved';
  this.status = 'completed';
  this.approvedBy = userId;
  this.approvedAt = new Date();
  this.approvalNotes = notes;
  
  this.approvalHistory.push({
    action: 'approved',
    user: userId,
    notes: notes,
    timestamp: new Date()
  });
  
  // Generate receipt if not exists
  if (!this.receipt.receiptNumber) {
    this.receipt.receiptNumber = this.generateReceiptNumber();
    this.receipt.issuedBy = userId;
    this.receipt.issuedAt = new Date();
  }
  
  return this.save();
};

PaymentSchema.methods.reject = function(userId, reason = '') {
  this.approvalStatus = 'rejected';
  this.status = 'failed';
  this.rejectionReason = reason;
  
  this.approvalHistory.push({
    action: 'rejected',
    user: userId,
    notes: reason,
    timestamp: new Date()
  });
  
  return this.save();
};

PaymentSchema.methods.sendReceipt = async function(methods = ['EMAIL']) {
  const sendPromises = methods.map(async (method) => {
    try {
      this.receipt.sentVia.push({
        method,
        status: 'SENT'
      });
      
      return { method, status: 'SENT' };
    } catch (error) {
      this.receipt.sentVia.push({
        method,
        status: 'FAILED'
      });
      
      return { method, status: 'FAILED', error: error.message };
    }
  });
  
  const results = await Promise.all(sendPromises);
  this.receipt.sentToTenant = true;
  this.receipt.sentAt = new Date();
  
  await this.save();
  return results;
};

// Static methods for compatibility
PaymentSchema.statics.findByTenant = function(tenantId, options = {}) {
  return this.find({ 
    $or: [{ tenant: tenantId }, { tenantId: tenantId }],
    ...options.filter 
  })
    .populate('property', 'address name type')
    .populate('lease', 'monthlyRent')
    .sort(options.sort || { paymentDate: -1 })
    .limit(options.limit || 0);
};

PaymentSchema.statics.findByProperty = function(propertyId, options = {}) {
  return this.find({ 
    $or: [{ property: propertyId }, { propertyId: propertyId }],
    ...options.filter 
  })
    .populate('tenant', 'firstName lastName name email')
    .populate('lease', 'monthlyRent')
    .sort(options.sort || { paymentDate: -1 })
    .limit(options.limit || 0);
};

PaymentSchema.statics.findPendingApprovals = function() {
  return this.find({ 
    $or: [
      { approvalStatus: 'pending' },
      { status: 'PENDING_APPROVAL' }
    ]
  })
    .populate('tenant', 'firstName lastName name email')
    .populate('property', 'address name type')
    .sort({ createdAt: -1 });
};

// Generate unique receipt number (static method for API use)
PaymentSchema.statics.generateUniqueReceiptNumber = async function() {
  let receiptNumber;
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    receiptNumber = `PAY-${year}${month}${day}-${random}`;
    
    try {
      const existing = await this.findOne({ receiptNumber });
      if (!existing) {
        break;
      }
      attempts++;
    } catch (error) {
      console.error('Error checking receipt number uniqueness:', error);
      attempts++;
    }
  }
  
  if (attempts >= maxAttempts) {
    throw new Error('Could not generate unique receipt number after multiple attempts');
  }
  
  return receiptNumber;
};

// Error handling for unique constraints
PaymentSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoServerError' && error.code === 11000) {
    if (error.keyPattern && error.keyPattern.receiptNumber) {
      next(new Error('Receipt number already exists. Please try again.'));
    } else {
      next(error);
    }
  } else {
    next(error);
  }
});

// Log successful saves
PaymentSchema.post('save', function(doc) {
  console.log(`✅ Payment saved: ${doc.receiptNumber} - ${doc.status}`);
});

// Ensure proper model export
export default mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);