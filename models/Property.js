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

export default mongoose.models.Property || mongoose.model('Property', PropertySchema);