// src/app/tenants/create/AddTenantForm.js
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Save, 
  X, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  User,
  Mail,
  Phone,
  Home,
  Calendar,
  MapPin,
  Eye,
  EyeOff
} from 'lucide-react';

export default function AddTenantForm({ initialData, searchParams }) {
  const router = useRouter();
  const { properties = [], availableProperties = [], existingTenants = [], currentUser } = initialData || {};
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    dateOfBirth: '',
    emergencyContact: {
      name: '',
      phone: '',
      relationship: ''
    },
    assignProperty: false,
    propertyId: searchParams?.property || '',
    moveInDate: '',
    monthlyRent: '',
    securityDeposit: '',
    leaseTermMonths: '12',
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [emailExists, setEmailExists] = useState(false);

  // Update selected property when property ID changes
  useEffect(() => {
    if (formData.propertyId) {
      const property = properties.find(p => p._id === formData.propertyId);
      setSelectedProperty(property || null);
      
      // Auto-fill monthly rent if property is selected
      if (property && property.monthlyRent && !formData.monthlyRent) {
        setFormData(prev => ({ 
          ...prev, 
          monthlyRent: property.monthlyRent.toString(),
          securityDeposit: (property.monthlyRent * 1).toString() // 1 month security deposit
        }));
      }
    } else {
      setSelectedProperty(null);
    }
  }, [formData.propertyId, properties]);

  // Check if email exists
  useEffect(() => {
    if (formData.email) {
      const exists = existingTenants.some(tenant => 
        tenant.email.toLowerCase() === formData.email.toLowerCase()
      );
      setEmailExists(exists);
    } else {
      setEmailExists(false);
    }
  }, [formData.email, existingTenants]);

  // Generate random password
  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ 
      ...prev, 
      password: password,
      confirmPassword: password
    }));
  };

  // Handle form input changes
  const handleInputChange = useCallback((field, value) => {
    if (field.includes('.')) {
      // Handle nested fields (like emergencyContact.name)
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    
    // Clear field error when user makes changes
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Clear general error when user makes changes
    if (error) {
      setError('');
    }
  }, [errors, error]);

  // Handle numeric input changes
  const handleNumericChange = (field, value) => {
    // Allow empty string or valid numbers
    if (value === '' || !isNaN(value)) {
      handleInputChange(field, value);
    }
  };

  // Form validation
  const validateForm = useCallback(() => {
    const newErrors = {};
    
    // Basic validation
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!formData.password) newErrors.password = 'Password is required';
    if (!formData.confirmPassword) newErrors.confirmPassword = 'Password confirmation is required';
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Check for existing email
    if (emailExists) {
      newErrors.email = 'An account with this email already exists';
    }
    
    // Phone validation (basic)
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (formData.phone && !phoneRegex.test(formData.phone.replace(/[\s\-\(\)]/g, ''))) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    
    // Password validation
    if (formData.password && formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    // Date of birth validation
    if (formData.dateOfBirth) {
      const birthDate = new Date(formData.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 18 || age > 120) {
        newErrors.dateOfBirth = 'Tenant must be between 18 and 120 years old';
      }
    }
    
    // Property assignment validation
    if (formData.assignProperty) {
      if (!formData.propertyId) newErrors.propertyId = 'Please select a property';
      if (!formData.moveInDate) newErrors.moveInDate = 'Move-in date is required';
      if (!formData.monthlyRent || parseFloat(formData.monthlyRent) <= 0) {
        newErrors.monthlyRent = 'Valid monthly rent is required';
      }
      if (!formData.securityDeposit || parseFloat(formData.securityDeposit) < 0) {
        newErrors.securityDeposit = 'Valid security deposit is required';
      }
      if (!formData.leaseTermMonths || parseInt(formData.leaseTermMonths) <= 0) {
        newErrors.leaseTermMonths = 'Valid lease term is required';
      }
      
      // Move-in date validation
      if (formData.moveInDate) {
        const moveInDate = new Date(formData.moveInDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (moveInDate < today) {
          newErrors.moveInDate = 'Move-in date cannot be in the past';
        }
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, emailExists]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setError('Please fix the errors below');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const submitData = {
        // Basic tenant info
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        password: formData.password,
        dateOfBirth: formData.dateOfBirth || null,
        
        // Emergency contact
        emergencyContact: {
          name: formData.emergencyContact.name.trim(),
          phone: formData.emergencyContact.phone.trim(),
          relationship: formData.emergencyContact.relationship.trim()
        },
        
        // Property assignment
        assignProperty: formData.assignProperty,
        ...(formData.assignProperty && {
          propertyId: formData.propertyId,
          moveInDate: formData.moveInDate,
          monthlyRent: parseFloat(formData.monthlyRent),
          securityDeposit: parseFloat(formData.securityDeposit),
          leaseTermMonths: parseInt(formData.leaseTermMonths),
        }),
        
        notes: formData.notes.trim()
      };

      const response = await fetch('/api/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({ error: 'Failed to create tenant' }));
        throw new Error(result.error || result.message || 'Failed to create tenant');
      }

      const result = await response.json();
      setSuccess(`Tenant account created successfully! ${formData.assignProperty ? 'Lease agreement has been generated.' : ''}`);
      
      // Redirect to the created tenant
      setTimeout(() => {
        router.push(`/tenants/${result.tenant._id || result.tenant.id}`);
      }, 2000);

    } catch (err) {
      console.error('Error creating tenant:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Get property display name
  const getPropertyDisplayName = (property) => {
    if (!property) return 'Unknown Property';
    return property.address || property.name || 'Unknown Property';
  };

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
            <button
              onClick={() => setError('')}
              className="text-red-600 hover:text-red-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Success Display */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-green-800">Success</h3>
              <p className="text-sm text-green-700 mt-1">{success}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <User className="w-5 h-5 mr-2 text-blue-600" />
            Personal Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  errors.firstName ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter first name"
                required
              />
              {errors.firstName && (
                <p className="text-red-600 text-sm mt-1">{errors.firstName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  errors.lastName ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter last name"
                required
              />
              {errors.lastName && (
                <p className="text-red-600 text-sm mt-1">{errors.lastName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    errors.email || emailExists ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="tenant@example.com"
                  required
                />
              </div>
              {errors.email && (
                <p className="text-red-600 text-sm mt-1">{errors.email}</p>
              )}
              {emailExists && !errors.email && (
                <p className="text-red-600 text-sm mt-1">This email is already registered</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    errors.phone ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="+260 XX XXX XXXX"
                  required
                />
              </div>
              {errors.phone && (
                <p className="text-red-600 text-sm mt-1">{errors.phone}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                  max={new Date(Date.now() - 18 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    errors.dateOfBirth ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
              </div>
              {errors.dateOfBirth && (
                <p className="text-red-600 text-sm mt-1">{errors.dateOfBirth}</p>
              )}
            </div>
          </div>
        </div>

        {/* Account Security */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Account Security</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-600 text-sm mt-1">{errors.password}</p>
              )}
              <button
                type="button"
                onClick={generatePassword}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
              >
                Generate Random Password
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Confirm password"
                required
              />
              {errors.confirmPassword && (
                <p className="text-red-600 text-sm mt-1">{errors.confirmPassword}</p>
              )}
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Emergency Contact (Optional)</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Name
              </label>
              <input
                type="text"
                value={formData.emergencyContact.name}
                onChange={(e) => handleInputChange('emergencyContact.name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Phone
              </label>
              <input
                type="tel"
                value={formData.emergencyContact.phone}
                onChange={(e) => handleInputChange('emergencyContact.phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Phone number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Relationship
              </label>
              <input
                type="text"
                value={formData.emergencyContact.relationship}
                onChange={(e) => handleInputChange('emergencyContact.relationship', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Spouse, Parent, Friend"
              />
            </div>
          </div>
        </div>

        {/* Property Assignment */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Home className="w-5 h-5 mr-2 text-blue-600" />
              Property Assignment
            </h2>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.assignProperty}
                onChange={(e) => handleInputChange('assignProperty', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Assign to property now</span>
            </label>
          </div>

          {formData.assignProperty && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Property <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.propertyId}
                  onChange={(e) => handleInputChange('propertyId', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    errors.propertyId ? 'border-red-300' : 'border-gray-300'
                  }`}
                  required={formData.assignProperty}
                >
                  <option value="">Select a property</option>
                  {properties.map(property => (
                    <option key={property._id} value={property._id}>
                      {getPropertyDisplayName(property)}
                      {property.name && ` - ${property.name}`}
                      {currentUser?.role === 'manager' && property.landlord && 
                        ` (Owner: ${property.landlord.name || `${property.landlord.firstName} ${property.landlord.lastName}`})`}
                    </option>
                  ))}
                </select>
                {errors.propertyId && (
                  <p className="text-red-600 text-sm mt-1">{errors.propertyId}</p>
                )}
                
                {selectedProperty && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-md">
                    <h4 className="font-medium text-blue-900 mb-2">Selected Property</h4>
                    <div className="text-sm text-blue-800">
                      <p className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        {getPropertyDisplayName(selectedProperty)}
                      </p>
                      {selectedProperty.type && (
                        <p className="mt-1">Type: {selectedProperty.type}</p>
                      )}
                      {selectedProperty.bedrooms && selectedProperty.bathrooms && (
                        <p className="mt-1">{selectedProperty.bedrooms} bed, {selectedProperty.bathrooms} bath</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Move-in Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.moveInDate}
                    onChange={(e) => handleInputChange('moveInDate', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                      errors.moveInDate ? 'border-red-300' : 'border-gray-300'
                    }`}
                    required={formData.assignProperty}
                  />
                  {errors.moveInDate && (
                    <p className="text-red-600 text-sm mt-1">{errors.moveInDate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Rent (ZMW) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.monthlyRent}
                    onChange={(e) => handleNumericChange('monthlyRent', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                      errors.monthlyRent ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                    required={formData.assignProperty}
                  />
                  {errors.monthlyRent && (
                    <p className="text-red-600 text-sm mt-1">{errors.monthlyRent}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Security Deposit (ZMW) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.securityDeposit}
                    onChange={(e) => handleNumericChange('securityDeposit', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                      errors.securityDeposit ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                    required={formData.assignProperty}
                  />
                  {errors.securityDeposit && (
                    <p className="text-red-600 text-sm mt-1">{errors.securityDeposit}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lease Term (Months) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.leaseTermMonths}
                    onChange={(e) => handleInputChange('leaseTermMonths', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                      errors.leaseTermMonths ? 'border-red-300' : 'border-gray-300'
                    }`}
                    required={formData.assignProperty}
                  >
                    <option value="3">3 Months</option>
                    <option value="6">6 Months</option>
                    <option value="12">12 Months</option>
                    <option value="18">18 Months</option>
                    <option value="24">24 Months</option>
                  </select>
                  {errors.leaseTermMonths && (
                    <p className="text-red-600 text-sm mt-1">{errors.leaseTermMonths}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {!formData.assignProperty && (
            <div className="text-center py-8 text-gray-500">
              <Home className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>Property assignment can be done later from the tenant's profile</p>
            </div>
          )}
        </div>

        {/* Additional Notes */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Additional Notes</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Any additional information about the tenant..."
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row gap-4 pt-6">
          <button
            type="submit"
            disabled={loading || emailExists}
            className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Tenant...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {formData.assignProperty ? 'Create Tenant & Lease' : 'Create Tenant'}
              </>
            )}
          </button>

          <Link
            href="/tenants"
            className="inline-flex items-center justify-center px-6 py-3 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors font-medium"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}