

import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
    leaseId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Lease',
        required: true 
      },
  propertyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Property',
    required: true 
  },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 
  landlordId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  status: { 
    type: String, 
    enum: ['pending', 'paid', 'overdue', 'partial'],
    default: 'pending'
  },
  paymentMethod: { 
    type: String, 
    enum: ['cash', 'check', 'bank_transfer', 'online', 'card'],
    default: 'online'
  },
  stripeId: { type: String },
receiptUrl: String,
  receiptNumber: String,
  items: [{
    description: String,
    amount: Number,
    periodStart: Date,
    periodEnd: Date
  }],
  payerEmail: String,
  currency: {
    type: String,
    enum: ['USD', 'ZMW'],
    default: 'USD'
  },
  exchangeRate: Number, // Store rate at time of payment
  originalAmount: Number, // Amount in original currency
  isPartial: Boolean,
  balanceDue: Number,
  partialPayments: [{
    amount: Number,
    date: Date,
    method: String,
    receiptUrl: String
  }]
}, { timestamps: true });

export default mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);