// models/User.js - Fixed to Remove Duplicate Index Warnings
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  // Basic Info
  name: { type: String, required: true },
  email: { 
    type: String, 
    required: true, 
    
  },
  password: { type: String, required: true },
  phone: String,
  
  // Role-based system - UPDATED to include admin
  role: { 
    type: String, 
    enum: ['landlord', 'tenant', 'manager', 'admin'], 
    default: 'tenant' 
  },
  
  // Tenant-specific fields (only used when role = 'tenant')
  currentProperty: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Property' 
  },
  currentLease: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Lease' 
  },
  
  // Landlord-specific fields (only used when role = 'landlord')
  company: String,
  licenseNumber: String,
  
  // Admin-specific fields (only used when role = 'admin')
  adminLevel: {
    type: String,
    enum: ['financial', 'property', 'assistant'],
    default: 'financial'
  },
  
  // Properties assigned to this admin (by managers)
  assignedProperties: [{
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property'
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User' // Manager who assigned
    },
    assignedDate: {
      type: Date,
      default: Date.now
    },
    permissions: [{
      type: String,
      enum: ['log_payments', 'create_invoices', 'view_reports', 'manage_tenants'],
      default: ['log_payments', 'create_invoices']
    }],
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  
  // Manager who supervises this admin
  supervisedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Manager who supervises
  },
  
  permissions: [{
    type: String,
    enum: [
      'manage_users',
      'manage_properties', 
      'assign_properties', // New permission for managers
      'approve_invoices',  // New permission for approval
      'approve_payments',  // New permission for approval
      'manage_payments',
      'manage_invoices',
      'view_reports',
      'system_config'
    ]
  }],
  
  // Profile info
  profileImage: String,
  dateOfBirth: Date,
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  },
  
  // Status
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
  
}, { timestamps: true });

// Create indexes separately to avoid duplicate warnings
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ 'assignedProperties.property': 1 });

// Virtual for admin permissions check
UserSchema.virtual('isAdmin').get(function() {
  return this.role === 'admin';
});

UserSchema.virtual('canLogPayments').get(function() {
  return this.role === 'admin' && this.assignedProperties.length > 0;
});

UserSchema.virtual('canCreateInvoices').get(function() {
  return this.role === 'admin' && this.assignedProperties.length > 0;
});

// Methods for property assignment
UserSchema.methods.getAssignedProperties = function() {
  return this.assignedProperties
    .filter(assignment => assignment.isActive)
    .map(assignment => assignment.property);
};

UserSchema.methods.hasPropertyAccess = function(propertyId) {
  return this.assignedProperties.some(
    assignment => assignment.property.toString() === propertyId.toString() && assignment.isActive
  );
};

UserSchema.methods.assignProperty = function(propertyId, assignedBy, permissions = ['log_payments', 'create_invoices']) {
  // Remove existing assignment if any
  this.assignedProperties = this.assignedProperties.filter(
    assignment => assignment.property.toString() !== propertyId.toString()
  );
  
  // Add new assignment
  this.assignedProperties.push({
    property: propertyId,
    assignedBy,
    permissions,
    isActive: true
  });
};

UserSchema.methods.removePropertyAssignment = function(propertyId) {
  const assignment = this.assignedProperties.find(
    assignment => assignment.property.toString() === propertyId.toString()
  );
  
  if (assignment) {
    assignment.isActive = false;
  }
};

// Pre-save middleware to set default permissions
UserSchema.pre('save', function(next) {
  if (this.role === 'admin' && (!this.permissions || this.permissions.length === 0)) {
    // Basic permissions for admin users - they need assignments to do financial tasks
    this.permissions = ['view_reports'];
  }
  
  if (this.role === 'manager' && (!this.permissions || this.permissions.length === 0)) {
    // Managers can assign properties and approve financial documents
    this.permissions = [
      'manage_properties', 
      'assign_properties', 
      'approve_invoices', 
      'approve_payments',
      'view_reports'
    ];
  }
  
  next();
});

export default mongoose.models.User || mongoose.model('User', UserSchema);