// models/Lease.js - Track everything through leases
import mongoose from 'mongoose';

const LeaseSchema = new mongoose.Schema({
  // Core relationships
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Points to User
  landlordId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Points to User
  
  // Lease terms
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  monthlyRent: { type: Number, required: true },
  securityDeposit: { type: Number, required: true },
  paymentDueDay: { type: Number, min: 1, max: 31, default: 1 },
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'active', 'terminated', 'expired'],
    default: 'draft'
  },
  
  // Payment tracking
  nextPaymentDue: Date,
  lastPaymentDate: Date,
  totalPaid: { type: Number, default: 0 },
  balanceDue: { type: Number, default: 0 },
  
}, { timestamps: true });

export default mongoose.models.Lease || mongoose.model('Lease', LeaseSchema);