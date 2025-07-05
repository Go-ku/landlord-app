// models/Lease.js - Enhanced with proper workflow status
import mongoose from 'mongoose';

const LeaseSchema = new mongoose.Schema({
  // Core relationships
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  landlordId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Link to original property request
  propertyRequestId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'PropertyRequest' 
  },
  
  // Lease terms
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  monthlyRent: { type: Number, required: true },
  securityDeposit: { type: Number, required: true },
  paymentDueDay: { type: Number, min: 1, max: 31, default: 1 },
  
  // Enhanced status for workflow
  status: {
    type: String,
    enum: [
      'draft',           // Created by landlord, not sent to tenant
      'pending_signature', // Sent to tenant, awaiting signature
      'signed',          // Tenant signed, awaiting first payment
      'active',          // First payment made, lease is active
      'terminated',      // Lease ended early
      'expired'          // Lease reached end date
    ],
    default: 'draft'
  },
  
  // Signature tracking
  tenantSignature: {
    signed: { type: Boolean, default: false },
    signedAt: Date,
    signatureData: String, // Could store signature image or hash
    ipAddress: String
  },
  
  landlordSignature: {
    signed: { type: Boolean, default: false },
    signedAt: Date,
    signatureData: String,
    ipAddress: String
  },
  
  // Payment tracking
  nextPaymentDue: Date,
  lastPaymentDate: Date,
  totalPaid: { type: Number, default: 0 },
  balanceDue: { type: Number, default: 0 },
  
  // First payment tracking (security deposit + first month)
  firstPaymentRequired: { type: Number, default: 0 },
  firstPaymentMade: { type: Boolean, default: false },
  firstPaymentDate: Date,
  
  // Lease document
  leaseDocument: {
    url: String,
    fileName: String,
    uploadedAt: Date
  },
  
  // Terms and conditions
  terms: {
    petPolicy: String,
    smokingPolicy: String,
    maintenanceResponsibility: String,
    utilitiesIncluded: [String],
    specialConditions: String
  },
  
  // Status history for tracking
  statusHistory: [{
    status: String,
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: String
  }]
  
}, { timestamps: true });

// Indexes
LeaseSchema.index({ tenantId: 1, status: 1 });
LeaseSchema.index({ landlordId: 1, status: 1 });
LeaseSchema.index({ propertyId: 1, status: 1 });
LeaseSchema.index({ status: 1 });
LeaseSchema.index({ nextPaymentDue: 1 });

// Virtual for checking if lease is fully signed
LeaseSchema.virtual('isFullySigned').get(function() {
  return this.tenantSignature.signed && this.landlordSignature.signed;
});

// Virtual for checking if ready for activation
LeaseSchema.virtual('readyForActivation').get(function() {
  return this.isFullySigned && this.firstPaymentMade;
});

// Methods
LeaseSchema.methods.sendToTenant = function() {
  if (this.status === 'draft') {
    this.status = 'pending_signature';
    this.statusHistory.push({
      status: 'pending_signature',
      changedBy: this.landlordId,
      note: 'Lease sent to tenant for signature'
    });
  }
};

LeaseSchema.methods.signByTenant = function(signatureData, ipAddress) {
  this.tenantSignature = {
    signed: true,
    signedAt: new Date(),
    signatureData,
    ipAddress
  };
  
  if (this.status === 'pending_signature') {
    this.status = 'signed';
    this.statusHistory.push({
      status: 'signed',
      changedBy: this.tenantId,
      note: 'Lease signed by tenant'
    });
    
    // Calculate first payment (security deposit + first month rent)
    this.firstPaymentRequired = this.securityDeposit + this.monthlyRent;
  }
};

LeaseSchema.methods.recordFirstPayment = function(paymentAmount, paymentDate) {
  if (this.status === 'signed' && paymentAmount >= this.firstPaymentRequired) {
    this.firstPaymentMade = true;
    this.firstPaymentDate = paymentDate || new Date();
    this.totalPaid += paymentAmount;
    this.lastPaymentDate = this.firstPaymentDate;
    
    // Set next payment due date
    const nextDue = new Date(this.startDate);
    nextDue.setMonth(nextDue.getMonth() + 1);
    nextDue.setDate(this.paymentDueDay);
    this.nextPaymentDue = nextDue;
    
    // Activate lease
    this.status = 'active';
    this.statusHistory.push({
      status: 'active',
      changedBy: this.tenantId,
      note: `First payment of $${paymentAmount} received`
    });
  }
};

LeaseSchema.methods.getNextAction = function() {
  switch (this.status) {
    case 'draft':
      return {
        action: 'send_to_tenant',
        message: 'Send lease agreement to tenant for signature',
        actor: 'landlord'
      };
    case 'pending_signature':
      return {
        action: 'sign_lease',
        message: 'Review and sign the lease agreement',
        actor: 'tenant'
      };
    case 'signed':
      return {
        action: 'make_payment',
        message: `Make first payment of $${this.firstPaymentRequired} (Security deposit + First month rent)`,
        actor: 'tenant'
      };
    case 'active':
      const daysUntilDue = this.nextPaymentDue ? 
        Math.ceil((this.nextPaymentDue - new Date()) / (1000 * 60 * 60 * 24)) : 0;
      
      if (daysUntilDue <= 5) {
        return {
          action: 'upcoming_payment',
          message: `Next rent payment due in ${daysUntilDue} days`,
          actor: 'tenant'
        };
      }
      return {
        action: 'active_lease',
        message: 'Lease is active and in good standing',
        actor: 'both'
      };
    default:
      return {
        action: 'none',
        message: 'No action required',
        actor: 'none'
      };
  }
};

// Static methods
LeaseSchema.statics.createFromPropertyRequest = async function(propertyRequestId, landlordId, leaseTerms) {
  const PropertyRequest = mongoose.model('PropertyRequest');
  const propertyRequest = await PropertyRequest.findById(propertyRequestId)
    .populate('tenant')
    .populate('property');
  
  if (!propertyRequest) {
    throw new Error('Property request not found');
  }
  
  const lease = new this({
    propertyId: propertyRequest.property._id,
    tenantId: propertyRequest.tenant._id,
    landlordId: landlordId,
    propertyRequestId: propertyRequestId,
    startDate: leaseTerms.startDate,
    endDate: leaseTerms.endDate,
    monthlyRent: leaseTerms.monthlyRent,
    securityDeposit: leaseTerms.securityDeposit,
    paymentDueDay: leaseTerms.paymentDueDay || 1,
    terms: leaseTerms.terms || {},
    status: 'draft',
    firstPaymentRequired: leaseTerms.securityDeposit + leaseTerms.monthlyRent,
    statusHistory: [{
      status: 'draft',
      changedBy: landlordId,
      note: 'Lease created from property request'
    }]
  });
  
  return lease;
};

LeaseSchema.statics.getTenantsRequiringAction = function() {
  return this.find({
    status: { $in: ['pending_signature', 'signed'] }
  }).populate('tenantId propertyId');
};

LeaseSchema.statics.getOverduePayments = function() {
  const today = new Date();
  return this.find({
    status: 'active',
    nextPaymentDue: { $lt: today },
    balanceDue: { $gt: 0 }
  }).populate('tenantId propertyId');
};

LeaseSchema.statics.getTenantCurrentLease = function(tenantId) {
  return this.findOne({
    tenantId: tenantId,
    status: { $in: ['pending_signature', 'signed', 'active'] }
  }).populate('propertyId landlordId');
};

export default mongoose.models.Lease || mongoose.model('Lease', LeaseSchema);