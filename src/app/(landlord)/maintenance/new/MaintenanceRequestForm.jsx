// src/app/maintenance/new/MaintenanceRequestForm.js
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Save, 
  X, 
  Upload, 
  Trash2, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  Home,
  User,
  FileText,
  Camera,
  MapPin
} from 'lucide-react';

export default function MaintenanceRequestForm({ initialData, searchParams }) {
  const router = useRouter();
  const { properties = [], tenants = [], leases = [], currentUser } = initialData || {};
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    propertyId: searchParams?.propertyId || (currentUser?.role === 'tenant' && properties[0]?._id) || '',
    tenantId: searchParams?.tenantId || (currentUser?.role === 'tenant' ? currentUser.id : ''),
    title: '',
    description: '',
    priority: 'Medium',
    status: 'Pending',
    images: []
  });

  const [errors, setErrors] = useState({});
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  // Update selected property and tenant when form data changes
  useEffect(() => {
    const property = properties.find(p => p._id === formData.propertyId);
    const tenant = tenants.find(t => t._id === formData.tenantId);
    setSelectedProperty(property || null);
    setSelectedTenant(tenant || null);
  }, [formData.propertyId, formData.tenantId, properties, tenants]);

  // Handle form input changes
  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user makes changes
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Clear general error when user makes changes
    if (error) {
      setError('');
    }
  }, [errors, error]);

  // Handle image file selection
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    const maxFiles = 5;
    const maxSize = 5 * 1024 * 1024; // 5MB per file
    
    if (imageFiles.length + files.length > maxFiles) {
      setError(`Maximum ${maxFiles} images allowed`);
      return;
    }
    
    const validFiles = [];
    const newPreviews = [];
    
    files.forEach(file => {
      if (!file.type.startsWith('image/')) {
        setError('Only image files are allowed');
        return;
      }
      
      if (file.size > maxSize) {
        setError('Images must be smaller than 5MB');
        return;
      }
      
      validFiles.push(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        newPreviews.push({
          file,
          preview: e.target.result,
          id: Date.now() + Math.random()
        });
        
        if (newPreviews.length === validFiles.length) {
          setImageFiles(prev => [...prev, ...validFiles]);
          setImagePreviews(prev => [...prev, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });
    
    // Reset file input
    e.target.value = '';
  };

  // Remove image
  const removeImage = (index) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Form validation
  const validateForm = useCallback(() => {
    const newErrors = {};
    
    if (!formData.propertyId) newErrors.propertyId = 'Property selection is required';
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (formData.title.length > 100) newErrors.title = 'Title must be less than 100 characters';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (formData.description.length > 1000) newErrors.description = 'Description must be less than 1000 characters';
    if (!['Low', 'Medium', 'High'].includes(formData.priority)) newErrors.priority = 'Valid priority is required';
    
    // For non-tenants, tenant selection is optional but if selected, must be valid
    if (currentUser?.role !== 'tenant' && formData.tenantId) {
      const validTenant = tenants.find(t => t._id === formData.tenantId);
      if (!validTenant) {
        newErrors.tenantId = 'Selected tenant is not valid';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, tenants, currentUser]);

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
      // Create FormData for file upload
    //   const submitData = new FormData();
      
    //   // Add form fields
    //   submitData.append('propertyId', formData.propertyId);
    //   if (formData.tenantId) {
    //     submitData.append('tenantId', formData.tenantId);
    //   }
    //   submitData.append('title', formData.title.trim());
    //   submitData.append('description', formData.description.trim());
    //   submitData.append('priority', formData.priority);
    //   submitData.append('status', formData.status);
    //   // Add images
    //   imageFiles.forEach((file, index) => {
    //     submitData.append(`images`, file);
    //   });
   const jsonPayload = {
  propertyId: formData.propertyId,
  tenantId: formData.tenantId,
  title: formData.title.trim(),
  description: formData.description.trim(),
  priority: formData.priority,
  status: formData.status,
  images: imageFiles.map(file => file.url || '') // or empty for now
};
      const response = await fetch('/api/maintenance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jsonPayload),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({ error: 'Failed to create maintenance request' }));
        throw new Error(result.error || result.message || 'Failed to create maintenance request');
      }

      const result = await response.json();
      setSuccess('Maintenance request created successfully!');
      
      // Redirect to the created request - use the correct ID field
      setTimeout(() => {
        const requestId = result.data?._id || result._id || result.id;
        if (requestId) {
          router.push(`/maintenance/${requestId}`);
        } else {
          // Fallback to maintenance list if no ID
          router.push('/maintenance');
        }
      }, 2000);
    } catch (err) {
      console.error('Error creating maintenance request:', err);
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

  // Get tenant display name
  const getTenantDisplayName = (tenant) => {
    if (!tenant) return 'Unknown Tenant';
    return tenant.name || `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim() || 'Unknown Tenant';
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
        {/* Property Selection */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <Home className="w-5 h-5 mr-2 text-blue-600" />
            Property Information
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Property <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.propertyId}
                onChange={(e) => handleInputChange('propertyId', e.target.value)}
                disabled={currentUser?.role === 'tenant' && properties.length === 1}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  errors.propertyId ? 'border-red-300' : 'border-gray-300'
                } ${currentUser?.role === 'tenant' && properties.length === 1 ? 'bg-gray-50' : ''}`}
                required
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

            {/* Tenant Selection (for non-tenants) */}
            {currentUser?.role !== 'tenant' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tenant (Optional)
                </label>
                <select
                  value={formData.tenantId}
                  onChange={(e) => handleInputChange('tenantId', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    errors.tenantId ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">No specific tenant</option>
                  {tenants.map(tenant => (
                    <option key={tenant._id} value={tenant._id}>
                      {getTenantDisplayName(tenant)}
                      {tenant.email && ` (${tenant.email})`}
                      {tenant.propertyInfo && ` - ${tenant.propertyInfo.address}`}
                    </option>
                  ))}
                </select>
                {errors.tenantId && (
                  <p className="text-red-600 text-sm mt-1">{errors.tenantId}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Select a tenant if this request is related to a specific tenant
                </p>
                
                {selectedTenant && (
                  <div className="mt-3 p-3 bg-green-50 rounded-md">
                    <h4 className="font-medium text-green-900 mb-2">Selected Tenant</h4>
                    <div className="text-sm text-green-800">
                      <p className="flex items-center">
                        <User className="w-4 h-4 mr-1" />
                        {getTenantDisplayName(selectedTenant)}
                      </p>
                      {selectedTenant.email && (
                        <p className="mt-1">Email: {selectedTenant.email}</p>
                      )}
                      {selectedTenant.phone && (
                        <p className="mt-1">Phone: {selectedTenant.phone}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Request Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-blue-600" />
            Request Details
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  errors.title ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Brief description of the issue (e.g., Leaky faucet in kitchen)"
                maxLength={100}
                required
              />
              {errors.title && (
                <p className="text-red-600 text-sm mt-1">{errors.title}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {formData.title.length}/100 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={4}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  errors.description ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Detailed description of the maintenance issue, including location, when it started, and any relevant details..."
                maxLength={1000}
                required
              />
              {errors.description && (
                <p className="text-red-600 text-sm mt-1">{errors.description}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {formData.description.length}/1000 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  errors.priority ? 'border-red-300' : 'border-gray-300'
                }`}
                required
              >
                <option value="Low">Low - Minor issue, no urgency</option>
                <option value="Medium">Medium - Moderate issue, normal priority</option>
                <option value="High">High - Important issue, needs prompt attention</option>
              </select>
              {errors.priority && (
                <p className="text-red-600 text-sm mt-1">{errors.priority}</p>
              )}
            </div>
          </div>
        </div>

        {/* Image Upload */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <Camera className="w-5 h-5 mr-2 text-blue-600" />
            Photos (Optional)
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Images
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-upload"
                  disabled={imageFiles.length >= 5}
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    Click to upload images or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    PNG, JPG up to 5MB each. Maximum 5 images.
                  </p>
                </label>
              </div>
            </div>

            {/* Image Previews */}
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {imagePreviews.map((item, index) => (
                  <div key={item.id} className="relative group">
                    <img
                      src={item.preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {item.file.name}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row gap-4 pt-6">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Request...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Submit Request
              </>
            )}
          </button>

          <Link
            href="/maintenance"
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