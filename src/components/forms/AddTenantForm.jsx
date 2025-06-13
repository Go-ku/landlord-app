'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

export default function AddTenantForm({ 
  properties = [], 
  existingTenants = [], 
  landlordId,
  preSelectedPropertyId 
}) {
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm({
    defaultValues: {
      propertyId: preSelectedPropertyId || ''
    }
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createLeaseOption, setCreateLeaseOption] = useState('later');
  const router = useRouter();

  const selectedPropertyId = watch('propertyId');
  const selectedProperty = properties.find(p => p._id === selectedPropertyId);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    
    try {
      // Check if email already exists
      const existingTenant = existingTenants.find(
        tenant => tenant.email.toLowerCase() === data.email.toLowerCase()
      );
      
      if (existingTenant) {
        throw new Error('A user with this email already exists');
      }

      // Prepare tenant data for User model
      const tenantData = {
        name: data.name.trim(),
        email: data.email.toLowerCase().trim(),
        phone: data.phone?.trim() || '',
        role: 'tenant',
        currentProperty: data.propertyId || null,
        dateOfBirth: data.dateOfBirth || null,
        emergencyContact: {
          name: data.emergencyContactName?.trim() || '',
          phone: data.emergencyContactPhone?.trim() || '',
          relationship: data.emergencyContactRelationship?.trim() || ''
        },
        isActive: true,
        // Set a temporary password that requires reset
        password: 'temporary_password_needs_reset',
        requirePasswordReset: true
      };

      console.log('Creating tenant user:', tenantData);

      // Create the tenant user
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tenantData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to create tenant');
      }

      setSuccess('Tenant created successfully!');

      // Handle lease creation if requested
      if (createLeaseOption === 'now' && data.propertyId) {
        // Redirect to lease creation with pre-filled data
        setTimeout(() => {
          router.push(`/leases/add?tenant=${result.data._id}&property=${data.propertyId}`);
        }, 1500);
      } else {
        // Redirect to tenants list or property detail
        setTimeout(() => {
          if (preSelectedPropertyId) {
            router.push(`/properties/${preSelectedPropertyId}`);
          } else {
            router.push('/tenants');
          }
        }, 1500);
      }

    } catch (err) {
      console.error('Error creating tenant:', err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name *
            </label>
            <input
              {...register('name', { 
                required: 'Name is required',
                minLength: { value: 2, message: 'Name must be at least 2 characters' }
              })}
              className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="John Doe"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              {...register('email', { 
                required: 'Email is required',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Please enter a valid email address'
                }
              })}
              className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="john@example.com"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              {...register('phone')}
              className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date of Birth
            </label>
            <input
              type="date"
              {...register('dateOfBirth')}
              className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Property Assignment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Assign to Property (Optional)
          </label>
          <select
            {...register('propertyId')}
            className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select a property (optional)</option>
            {properties.map((property) => (
              <option key={property._id} value={property._id}>
                {property.address} - {property.type} (${property.monthlyRent}/month)
              </option>
            ))}
          </select>
          
          {selectedProperty && (
            <div className="mt-2 p-3 bg-blue-50 rounded border">
              <p className="text-sm text-blue-800">
                <strong>Selected:</strong> {selectedProperty.address}
              </p>
              <p className="text-sm text-blue-600">
                {selectedProperty.bedrooms}BR/{selectedProperty.bathrooms}BA - 
                ${selectedProperty.monthlyRent}/month
              </p>
            </div>
          )}
        </div>

        {/* Lease Creation Options */}
        {selectedPropertyId && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-medium text-gray-900 mb-3">Lease Agreement</h3>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="later"
                  checked={createLeaseOption === 'later'}
                  onChange={(e) => setCreateLeaseOption(e.target.value)}
                  className="mr-2"
                />
                <span className="text-sm">Create lease agreement later</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="now"
                  checked={createLeaseOption === 'now'}
                  onChange={(e) => setCreateLeaseOption(e.target.value)}
                  className="mr-2"
                />
                <span className="text-sm">Create lease agreement now (after creating tenant)</span>
              </label>
            </div>
          </div>
        )}

        {/* Emergency Contact */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Emergency Contact (Optional)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Name
              </label>
              <input
                {...register('emergencyContactName')}
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Jane Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Phone
              </label>
              <input
                type="tel"
                {...register('emergencyContactPhone')}
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="+1 (555) 987-6543"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Relationship
              </label>
              <select
                {...register('emergencyContactRelationship')}
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select relationship</option>
                <option value="Parent">Parent</option>
                <option value="Spouse">Spouse</option>
                <option value="Sibling">Sibling</option>
                <option value="Friend">Friend</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-6 border-t">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 disabled:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center justify-center"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Tenant...
              </>
            ) : (
              'Create Tenant'
            )}
          </button>
        </div>
      </form>

      {/* Information Note */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• A tenant account will be created with a temporary password</li>
          <li>• The tenant will receive an email to set their password</li>
          <li>• You can create a lease agreement to formalize the rental</li>
          <li>• Once lease is active, you can start tracking payments</li>
        </ul>
      </div>
    </div>
  );
}