// src/app/properties/create/AddPropertyForm.js
'use client';
import { useState, useCallback } from 'react';
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
  DollarSign,
  MapPin,
  Camera,
  Plus,
  Minus,
  Tag
} from 'lucide-react';

export default function AddPropertyForm({ initialData, searchParams }) {
  const router = useRouter();
  const { currentUser } = initialData || {};
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    address: '',
    type: 'Apartment',
    monthlyRent: '',
    bedrooms: '',
    bathrooms: '',
    squareFeet: '',
    description: '',
    isAvailable: true,
    amenities: []
  });

  const [errors, setErrors] = useState({});
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [newAmenity, setNewAmenity] = useState('');

  // Property types
  const propertyTypes = [
    { value: 'Apartment', label: 'Apartment' },
    { value: 'House', label: 'House' },
    { value: 'Condo', label: 'Condo' },
    { value: 'Townhouse', label: 'Townhouse' },
    { value: 'Commercial', label: 'Commercial' }
  ];

  // Common amenities
  const commonAmenities = [
    'Parking', 'Air Conditioning', 'Heating', 'Laundry', 'Dishwasher',
    'Pool', 'Gym', 'Balcony', 'Garden', 'Pet Friendly', 'Furnished',
    'Internet Included', 'Security System', 'Elevator', 'Storage'
  ];

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

  // Handle numeric input changes
  const handleNumericChange = (field, value) => {
    // Allow empty string or valid numbers
    if (value === '' || !isNaN(value)) {
      handleInputChange(field, value);
    }
  };

  // Handle image file selection
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    const maxFiles = 10;
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

  // Add amenity
  const addAmenity = (amenity) => {
    const amenityToAdd = amenity || newAmenity.trim();
    if (amenityToAdd && !formData.amenities.includes(amenityToAdd)) {
      setFormData(prev => ({
        ...prev,
        amenities: [...prev.amenities, amenityToAdd]
      }));
      setNewAmenity('');
    }
  };

  // Remove amenity
  const removeAmenity = (amenityToRemove) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.filter(amenity => amenity !== amenityToRemove)
    }));
  };

  // Form validation
  const validateForm = useCallback(() => {
    const newErrors = {};
    
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (formData.address.length > 200) newErrors.address = 'Address must be less than 200 characters';
    
    if (!formData.type) newErrors.type = 'Property type is required';
    if (!propertyTypes.find(pt => pt.value === formData.type)) newErrors.type = 'Invalid property type';
    
    if (!formData.monthlyRent || parseFloat(formData.monthlyRent) <= 0) {
      newErrors.monthlyRent = 'Valid monthly rent is required';
    }
    if (parseFloat(formData.monthlyRent) > 1000000) {
      newErrors.monthlyRent = 'Monthly rent seems too high';
    }
    
    if (formData.bedrooms && (parseInt(formData.bedrooms) < 0 || parseInt(formData.bedrooms) > 20)) {
      newErrors.bedrooms = 'Bedrooms must be between 0 and 20';
    }
    
    if (formData.bathrooms && (parseFloat(formData.bathrooms) < 0 || parseFloat(formData.bathrooms) > 20)) {
      newErrors.bathrooms = 'Bathrooms must be between 0 and 20';
    }
    
    if (formData.squareFeet && (parseInt(formData.squareFeet) < 0 || parseInt(formData.squareFeet) > 50000)) {
      newErrors.squareFeet = 'Square feet must be between 0 and 50,000';
    }
    
    if (formData.description && formData.description.length > 2000) {
      newErrors.description = 'Description must be less than 2000 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, propertyTypes]);

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
      const submitData = new FormData();
      
      // Add form fields
      submitData.append('address', formData.address.trim());
      submitData.append('type', formData.type);
      submitData.append('monthlyRent', parseFloat(formData.monthlyRent));
      submitData.append('isAvailable', formData.isAvailable);
      
      if (formData.bedrooms) submitData.append('bedrooms', parseInt(formData.bedrooms));
      if (formData.bathrooms) submitData.append('bathrooms', parseFloat(formData.bathrooms));
      if (formData.squareFeet) submitData.append('squareFeet', parseInt(formData.squareFeet));
      if (formData.description.trim()) submitData.append('description', formData.description.trim());
      
      // Add amenities
      submitData.append('amenities', JSON.stringify(formData.amenities));
      
      // Add images
      imageFiles.forEach((file, index) => {
        submitData.append(`images`, file);
      });

      const response = await fetch('/api/properties', {
        method: 'POST',
        body: submitData,
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({ error: 'Failed to create property' }));
        throw new Error(result.error || result.message || 'Failed to create property');
      }

      const result = await response.json();
      setSuccess('Property created successfully!');
      
      // Redirect to the created property
      setTimeout(() => {
        router.push(`/properties/${result._id || result.id}`);
      }, 2000);

    } catch (err) {
      console.error('Error creating property:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
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
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <Home className="w-5 h-5 mr-2 text-blue-600" />
            Basic Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Property Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    errors.address ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter full property address"
                  maxLength={200}
                  required
                />
              </div>
              {errors.address && (
                <p className="text-red-600 text-sm mt-1">{errors.address}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {formData.address.length}/200 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Property Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  errors.type ? 'border-red-300' : 'border-gray-300'
                }`}
                required
              >
                {propertyTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {errors.type && (
                <p className="text-red-600 text-sm mt-1">{errors.type}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monthly Rent (ZMW) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.monthlyRent}
                  onChange={(e) => handleNumericChange('monthlyRent', e.target.value)}
                  className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    errors.monthlyRent ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                  required
                />
              </div>
              {errors.monthlyRent && (
                <p className="text-red-600 text-sm mt-1">{errors.monthlyRent}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bedrooms
              </label>
              <input
                type="number"
                min="0"
                max="20"
                value={formData.bedrooms}
                onChange={(e) => handleNumericChange('bedrooms', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  errors.bedrooms ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g., 2"
              />
              {errors.bedrooms && (
                <p className="text-red-600 text-sm mt-1">{errors.bedrooms}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bathrooms
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="20"
                value={formData.bathrooms}
                onChange={(e) => handleNumericChange('bathrooms', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  errors.bathrooms ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g., 1.5"
              />
              {errors.bathrooms && (
                <p className="text-red-600 text-sm mt-1">{errors.bathrooms}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Square Feet
              </label>
              <input
                type="number"
                min="0"
                max="50000"
                value={formData.squareFeet}
                onChange={(e) => handleNumericChange('squareFeet', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  errors.squareFeet ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g., 1200"
              />
              {errors.squareFeet && (
                <p className="text-red-600 text-sm mt-1">{errors.squareFeet}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Availability Status
              </label>
              <select
                value={formData.isAvailable}
                onChange={(e) => handleInputChange('isAvailable', e.target.value === 'true')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={true}>Available for Rent</option>
                <option value={false}>Not Available</option>
              </select>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Property Description</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={5}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                errors.description ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Describe the property features, location benefits, and any special details..."
              maxLength={2000}
            />
            {errors.description && (
              <p className="text-red-600 text-sm mt-1">{errors.description}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {formData.description.length}/2000 characters
            </p>
          </div>
        </div>

        {/* Amenities */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <Tag className="w-5 h-5 mr-2 text-blue-600" />
            Amenities
          </h2>

          {/* Common Amenities */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Add (Common Amenities)</h3>
            <div className="flex flex-wrap gap-2">
              {commonAmenities.map(amenity => (
                <button
                  key={amenity}
                  type="button"
                  onClick={() => addAmenity(amenity)}
                  disabled={formData.amenities.includes(amenity)}
                  className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                    formData.amenities.includes(amenity)
                      ? 'bg-green-100 text-green-800 border-green-300 cursor-not-allowed'
                      : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-blue-100 hover:border-blue-300'
                  }`}
                >
                  {formData.amenities.includes(amenity) ? '✓ ' : '+ '}{amenity}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Amenity */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Add Custom Amenity
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newAmenity}
                onChange={(e) => setNewAmenity(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter custom amenity"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAmenity())}
              />
              <button
                type="button"
                onClick={() => addAmenity()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Selected Amenities */}
          {formData.amenities.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Selected Amenities</h3>
              <div className="flex flex-wrap gap-2">
                {formData.amenities.map(amenity => (
                  <span
                    key={amenity}
                    className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {amenity}
                    <button
                      type="button"
                      onClick={() => removeAmenity(amenity)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Image Upload */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <Camera className="w-5 h-5 mr-2 text-blue-600" />
            Property Photos
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
                  disabled={imageFiles.length >= 10}
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    Click to upload property images or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    PNG, JPG up to 5MB each. Maximum 10 images.
                  </p>
                </label>
              </div>
            </div>

            {/* Image Previews */}
            {imagePreviews.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Uploaded Images ({imagePreviews.length}/10)</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {imagePreviews.map((item, index) => (
                    <div key={item.id} className="relative group">
                      <img
                        src={item.preview}
                        alt={`Property ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        {item.file.name}
                      </p>
                    </div>
                  ))}
                </div>
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
                Creating Property...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Create Property
              </>
            )}
          </button>

          <Link
            href="/properties"
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