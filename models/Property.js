// models/Property.js
import mongoose from 'mongoose';

const PropertySchema = new mongoose.Schema({
  // Core property information
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['Apartment', 'House', 'Condo', 'Townhouse', 'Commercial'],
    required: [true, 'Property type is required']
  },
  monthlyRent: {
    type: Number,
    required: [true, 'Monthly rent is required'],
    min: [0, 'Rent cannot be negative']
  },

  // Basic property details
  bedrooms: {
    type: Number,
    min: [0, 'Bedrooms cannot be negative']
  },
  bathrooms: {
    type: Number,
    min: [0, 'Bathrooms cannot be negative']
  },

  // Ownership information
  landlord: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Landlord reference is required']
  },

  // Availability status
  isAvailable: {
    type: Boolean,
    default: true
  },

  // Optional details
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  images: [{
    type: String,
    validate: {
      validator: function(v) {
        return /^(http|https):\/\/[^ "]+$/.test(v);
      },
      message: props => `${props.value} is not a valid URL!`
    }
  }]

}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for active leases
PropertySchema.virtual('leases', {
  ref: 'Lease',
  localField: '_id',
  foreignField: 'property',
  justOne: false,
  match: { status: 'active' } // Only populate active leases
});

// Virtual for tenant count
PropertySchema.virtual('tenantCount').get(function() {
  if (this.leases) {
    return this.leases.reduce((count, lease) => count + lease.tenants.length, 0);
  }
  return 0;
});

// Indexes for better query performance
PropertySchema.index({ address: 'text', description: 'text' });
PropertySchema.index({ landlord: 1 });
PropertySchema.index({ isAvailable: 1 });

// Middleware to cascade delete related leases when property is removed
PropertySchema.pre('remove', async function(next) {
  await mongoose.model('Lease').deleteMany({ property: this._id });
  next();
});

export default mongoose.models.Property || mongoose.model('Property', PropertySchema);