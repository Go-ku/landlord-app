// models/Property.js
import mongoose from 'mongoose';

const PropertySchema = new mongoose.Schema({
  address: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['Apartment', 'House', 'Condo', 'Townhouse', 'Commercial'],
    required: true,
  },
  monthlyRent: {
    type: Number,
    required: true,
  },
  bedrooms: Number,
  bathrooms: Number,
  squareFeet: Number,
  landlord: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  amenities: [String],
  description: String,
  images: [String],
  isAvailable: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

PropertySchema.virtual('leases', {
  ref: 'Lease',              // The model to populate from
  localField: '_id',         // property._id
  foreignField: 'propertyId',  // lease.property should reference property._id
});

// Define a virtual to count active leases
PropertySchema.virtual('activeLeaseCount').get(function () {
  if (!this.leases || !Array.isArray(this.leases)) return 0;
  return this.leases.filter(lease => lease.status === 'active').length;
});

// Ensure virtuals are included in JSON responses
PropertySchema.set('toJSON', { virtuals: true });
PropertySchema.set('toObject', { virtuals: true });

export default mongoose.models.Property || mongoose.model('Property', PropertySchema);