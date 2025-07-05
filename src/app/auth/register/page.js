// app/auth/register/page.js - Fixed version
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from 'next-auth/react';
import Link from 'next/link';
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  User, 
  Phone,
  Building,
  FileText,
  Settings,
  AlertCircle, 
  CheckCircle,
  Home,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Search,
  MapPin,
  DollarSign,
  Bed,
  Bath,
  Calendar,
  Plus,
  Send
} from 'lucide-react';

const roleConfig = {
  tenant: {
    title: 'Tenant Account',
    description: 'Find and manage your rental properties',
    color: 'green',
    icon: User,
    fields: ['name', 'email', 'password', 'phone'],
    hasPropertySelection: true
  },
  landlord: {
    title: 'Landlord Account', 
    description: 'Manage your properties and tenants',
    color: 'blue',
    icon: Building,
    fields: ['name', 'email', 'password', 'phone', 'company', 'licenseNumber'],
    hasPropertySelection: false
  },
  manager: {
    title: 'Manager Account',
    description: 'Oversee properties and assign admin tasks',
    color: 'purple', 
    icon: FileText,
    fields: ['name', 'email', 'password', 'phone', 'company'],
    hasPropertySelection: false
  },
  admin: {
    title: 'Admin Assistant',
    description: 'Handle payments and invoices for assigned properties',
    color: 'red',
    icon: Settings,
    fields: ['name', 'email', 'password', 'phone', 'company', 'adminLevel'],
    hasPropertySelection: false
  }
};

export default function RegisterPage() {
  const [step, setStep] = useState(1); // 1: role, 2: form, 3: property selection (tenant only), 4: property request
  const [selectedRole, setSelectedRole] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    company: '',
    licenseNumber: '',
    adminLevel: 'financial',
    role: ''
  });
  
  // Property selection state
  const [propertySearch, setPropertySearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [propertyNotFound, setPropertyNotFound] = useState(false);
  
  // Property request state
  const [propertyRequest, setPropertyRequest] = useState({
    address: '',
    estimatedRent: '',
    bedrooms: '',
    bathrooms: '',
    propertyType: 'Apartment',
    description: '',
    landlordEmail: '',
    landlordPhone: '',
    moveInDate: '',
    leaseDuration: '12'
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [success, setSuccess] = useState(false);
  
  const router = useRouter();

  // Check if user is already signed in
  useEffect(() => {
    async function checkSession() {
      try {
        const session = await getSession();
        if (session) {
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('Session check error:', error);
      } finally {
        setIsCheckingSession(false);
      }
    }
    checkSession();
  }, [router]);

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setFormData(prev => ({ ...prev, role }));
    setStep(2);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear specific error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handlePropertyRequestChange = (e) => {
    const { name, value } = e.target;
    setPropertyRequest(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Property search function
  const searchProperties = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const response = await fetch(`/api/properties/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (data.success) {
        setSearchResults(data.data.properties);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Property search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (propertySearch) {
        searchProperties(propertySearch);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [propertySearch]);

  const validateForm = () => {
    const newErrors = {};
    
    // Required fields based on role
    const requiredFields = roleConfig[selectedRole].fields;
    requiredFields.forEach(field => {
      if (!formData[field]?.trim()) {
        newErrors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
      }
    });

    // Email validation
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (formData.password) {
      if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters long';
      }
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
        newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
      }
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
// Normalize input: remove whitespace, dashes, parentheses
let cleanedPhone = formData.phone?.replace(/[\s\-\(\)]/g, '');

// Standardize to international format starting with +260
if (/^0[7-9]\d{8}$/.test(cleanedPhone)) {
  cleanedPhone = '+260' + cleanedPhone.slice(1);
} else if (/^[7-9]\d{8}$/.test(cleanedPhone)) {
  cleanedPhone = '+260' + cleanedPhone;
} else if (/^260[7-9]\d{8}$/.test(cleanedPhone)) {
  cleanedPhone = '+' + cleanedPhone;
}

// Validate cleaned phone number
if (!/^\+260(77|76|95|96|97|99)\d{7}$/.test(cleanedPhone)) {
  newErrors.phone = 'Please enter a valid Zambian phone number';
} else {
  formData.phone = cleanedPhone; // ✅ Set the cleaned number back
}

    

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFormSubmit = () => {
    if (!validateForm()) {
      return;
    }
    
    // For tenants, go to property selection
    if (selectedRole === 'tenant') {
      setStep(3);
    } else {
      // For other roles, submit directly
      handleFinalSubmit();
    }
  };

  const handlePropertySelect = (property) => {
    setSelectedProperty(property);
    setPropertyNotFound(false);
  };

  const handlePropertyNotFound = () => {
    setPropertyNotFound(true);
    setSelectedProperty(null);
    setStep(4); // Go to property request step
  };

  const handleFinalSubmit = async () => {
    setIsLoading(true);

    try {
      // Prepare registration data
      const requestBody = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        role: formData.role,
        company: formData.company || undefined,
        licenseNumber: formData.licenseNumber || undefined,
      };

      // Add adminLevel for admin users
      if (formData.role === 'admin') {
        requestBody.adminLevel = formData.adminLevel;
      }

      // Add property selection for tenants
      if (selectedRole === 'tenant') {
        if (selectedProperty) {
          requestBody.requestedProperty = selectedProperty._id;
          requestBody.landlordToNotify = selectedProperty.landlord._id;
        } else if (propertyNotFound) {
          requestBody.propertyRequest = propertyRequest;
        }
      }

      console.log('Submitting registration:', requestBody);

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      console.log('Registration response:', data);

      if (response.ok) {
        setSuccess(true);
        // Redirect based on role and whether property request was made
        const redirectUrl = selectedRole === 'tenant' && (selectedProperty || propertyNotFound)
          ? '/auth/login?message=Registration successful. Your property request has been sent to the landlord.'
          : '/auth/login?message=Registration successful. Please sign in.';
        
        setTimeout(() => {
          router.push(redirectUrl);
        }, 3000);
      } else {
        if (data.errors) {
          setErrors(data.errors);
        } else {
          setErrors({ submit: data.error || 'Registration failed. Please try again.' });
        }
        // Go back to form step if there are errors
        setStep(2);
      }
    } catch (error) {
      console.error('Registration error:', error);
      setErrors({ submit: 'Network error. Please check your connection and try again.' });
      setStep(2);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking session
  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Created!</h2>
          <p className="text-gray-600 mb-4">
            Your {roleConfig[selectedRole].title.toLowerCase()} has been created successfully.
          </p>
          {selectedRole === 'tenant' && (selectedProperty || propertyNotFound) && (
            <p className="text-sm text-blue-600 mb-4">
              {selectedProperty 
                ? 'Your request to rent the selected property has been sent to the landlord.'
                : 'Your property request has been submitted. The landlord will be notified to list the property.'
              }
            </p>
          )}
          <p className="text-sm text-gray-500">
            Redirecting to sign in page...
          </p>
          <div className="mt-4">
            <Link
              href="/auth/signin"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Sign in now →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
            <Home className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            {step === 1 ? 'Create Account' : 
             step === 2 ? `Create ${roleConfig[selectedRole]?.title}` :
             step === 3 ? 'Select Your Property' :
             'Property Request'}
          </h2>
          <p className="mt-2 text-gray-600">
            {step === 1 
              ? 'Choose your account type to get started'
              : step === 2 
              ? roleConfig[selectedRole]?.description
              : step === 3
              ? 'Find the property you want to rent'
              : 'Tell us about the property you\'re looking for'
            }
          </p>
          
          {/* Progress indicator for tenant registration */}
          {selectedRole === 'tenant' && step > 1 && (
            <div className="mt-4 flex justify-center">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                <div className={`w-8 h-0.5 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                <div className={`w-3 h-3 rounded-full ${step >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                <div className={`w-8 h-0.5 ${step >= 4 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                <div className={`w-3 h-3 rounded-full ${step >= 4 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
              </div>
            </div>
          )}
        </div>

        {/* Step 1: Role Selection */}
        {step === 1 && (
          <div className="space-y-4">
            {Object.entries(roleConfig).map(([role, config]) => {
              const IconComponent = config.icon;
              return (
                <button
                  key={role}
                  onClick={() => handleRoleSelect(role)}
                  className={`w-full p-6 border-2 rounded-lg text-left transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    config.color === 'blue' 
                      ? 'border-blue-200 hover:border-blue-300 focus:ring-blue-500'
                      : config.color === 'green'
                      ? 'border-green-200 hover:border-green-300 focus:ring-green-500'
                      : config.color === 'purple'
                      ? 'border-purple-200 hover:border-purple-300 focus:ring-purple-500'
                      : 'border-red-200 hover:border-red-300 focus:ring-red-500'
                  }`}
                >
                  <div className="flex items-start">
                    <div className={`p-3 rounded-lg mr-4 ${
                      config.color === 'blue' 
                        ? 'bg-blue-100'
                        : config.color === 'green'
                        ? 'bg-green-100'
                        : config.color === 'purple'
                        ? 'bg-purple-100'
                        : 'bg-red-100'
                    }`}>
                      <IconComponent className={`w-6 h-6 ${
                        config.color === 'blue' 
                          ? 'text-blue-600'
                          : config.color === 'green'
                          ? 'text-green-600'
                          : config.color === 'purple'
                          ? 'text-purple-600'
                          : 'text-red-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {config.title}
                      </h3>
                      <p className="text-gray-600 mt-1">
                        {config.description}
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 mt-1" />
                  </div>
                </button>
              );
            })}

            <div className="mt-8 text-center">
              <p className="text-gray-600">
                Already have an account?{' '}
                <Link
                  href="/auth/signin"
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Registration Form */}
        {step === 2 && (
          <div className="bg-white py-8 px-6 shadow sm:rounded-lg">
            {/* Back button */}
            <button
              onClick={() => setStep(1)}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Choose different account type
            </button>

            {/* General error */}
            {errors.submit && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                  <p className="text-sm text-red-700">{errors.submit}</p>
                </div>
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handleFormSubmit(); }} className="space-y-6">
              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Full Name *
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`appearance-none block w-full pl-10 pr-3 py-2 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                      errors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter your full name"
                    disabled={isLoading}
                  />
                </div>
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address *
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`appearance-none block w-full pl-10 pr-3 py-2 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                      errors.email ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter your email"
                    disabled={isLoading}
                  />
                </div>
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone Number *
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    required
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`appearance-none block w-full pl-10 pr-3 py-2 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                      errors.phone ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="+260"
                    disabled={isLoading}
                  />
                </div>
                {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
              </div>

              {/* Company (for landlords, managers, and admins) */}
              {(selectedRole === 'landlord' || selectedRole === 'manager' || selectedRole === 'admin') && (
                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700">
                    Company Name {selectedRole === 'landlord' ? '*' : '(Optional)'}
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Building className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="company"
                      name="company"
                      type="text"
                      value={formData.company}
                      onChange={handleInputChange}
                      className={`appearance-none block w-full pl-10 pr-3 py-2 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                        errors.company ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter your company name"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.company && <p className="mt-1 text-sm text-red-600">{errors.company}</p>}
                </div>
              )}

              {/* Admin Level (for admins only) */}
              {selectedRole === 'admin' && (
                <div>
                  <label htmlFor="adminLevel" className="block text-sm font-medium text-gray-700">
                    Admin Level *
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Settings className="h-5 w-5 text-gray-400" />
                    </div>
                    <select
                      id="adminLevel"
                      name="adminLevel"
                      value={formData.adminLevel}
                      onChange={handleInputChange}
                      className={`appearance-none block w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                        errors.adminLevel ? 'border-red-300' : 'border-gray-300'
                      }`}
                      disabled={isLoading}
                    >
                      <option value="financial">Financial Assistant - Handle payments & invoices only</option>
                      <option value="assistant">General Assistant - Basic property management tasks</option>
                      <option value="property">Property Assistant - Property management focus</option>
                    </select>
                  </div>
                  {errors.adminLevel && <p className="mt-1 text-sm text-red-600">{errors.adminLevel}</p>}
                  <p className="mt-1 text-xs text-gray-500">
                    Admin assistants work under manager supervision and need property assignments to access financial features.
                  </p>
                </div>
              )}

              {/* License Number (for landlords only) */}
              {selectedRole === 'landlord' && (
                <div>
                  <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-700">
                    License Number (Optional)
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FileText className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="licenseNumber"
                      name="licenseNumber"
                      type="text"
                      value={formData.licenseNumber}
                      onChange={handleInputChange}
                      className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter your license number"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              )}

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password *
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`appearance-none block w-full pl-10 pr-10 py-2 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                      errors.password ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Create a strong password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
                <p className="mt-1 text-xs text-gray-500">
                  Must be at least 8 characters with uppercase, lowercase, and number
                </p>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password *
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`appearance-none block w-full pl-10 pr-10 py-2 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                      errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Confirm your password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
              </div>

              {/* Terms and Conditions */}
              <div className="flex items-start">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  required
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                  disabled={isLoading}
                />
                <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
                  I agree to the{' '}
                  <Link href="/terms" className="text-blue-600 hover:text-blue-500">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-blue-600 hover:text-blue-500">
                    Privacy Policy
                  </Link>
                </label>
              </div>

              {/* Submit Button */}
              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      {selectedRole === 'tenant' ? 'Continue to Property Selection' : `Create ${roleConfig[selectedRole]?.title}`}
                      <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3: Property Selection (Tenant Only) */}
        {step === 3 && selectedRole === 'tenant' && (
          <div className="bg-white py-8 px-6 shadow sm:rounded-lg">
            {/* Back button */}
            <button
              onClick={() => setStep(2)}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to account details
            </button>

            <div className="space-y-6">
              {/* Property Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search for your property
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={propertySearch}
                    onChange={(e) => setPropertySearch(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter property address, city, or neighborhood..."
                  />
                  {isSearching && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                    </div>
                  )}
                </div>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-900">Available Properties</h3>
                  <div className="max-h-96 overflow-y-auto space-y-3">
                    {searchResults.map((property) => (
                      <div
                        key={property._id}
                        className={`border rounded-lg p-4 cursor-pointer transition-all ${
                          selectedProperty?._id === property._id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handlePropertySelect(property)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <MapPin className="w-4 h-4 text-gray-500" />
                              <h4 className="font-medium text-gray-900">{property.address}</h4>
                            </div>
                            
                            <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                              <div className="flex items-center space-x-1">
                                <DollarSign className="w-4 h-4" />
                                <span>${property.monthlyRent.toLocaleString()}/month</span>
                              </div>
                              
                              {property.bedrooms && (
                                <div className="flex items-center space-x-1">
                                  <Bed className="w-4 h-4" />
                                  <span>{property.bedrooms} bed</span>
                                </div>
                              )}
                              
                              {property.bathrooms && (
                                <div className="flex items-center space-x-1">
                                  <Bath className="w-4 h-4" />
                                  <span>{property.bathrooms} bath</span>
                                </div>
                              )}
                            </div>
                            
                            <p className="text-sm text-gray-600">{property.type}</p>
                            
                            <div className="mt-2 text-xs text-gray-500">
                              Landlord: {property.landlord.name}
                              {property.landlord.company && ` • ${property.landlord.company}`}
                            </div>
                          </div>
                          
                          {selectedProperty?._id === property._id && (
                            <CheckCircle className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No results or property not found */}
              {propertySearch && !isSearching && searchResults.length === 0 && (
                <div className="text-center py-8 border border-gray-200 rounded-lg">
                  <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Property not found</h3>
                  <p className="text-gray-600 mb-4">
                    {`We couldn't find any properties matching your search.`}
                  </p>
                  <button
                    onClick={handlePropertyNotFound}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Request Property Listing
                  </button>
                </div>
              )}

              {/* Selected property confirmation */}
              {selectedProperty && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <h3 className="font-medium text-green-900">Property Selected</h3>
                  </div>
                  <p className="text-green-700 text-sm mb-4">
                    You&apos;ve selected {selectedProperty.address}. Your request will be sent to the landlord for approval.
                  </p>
                  <button
                    onClick={handleFinalSubmit}
                    disabled={isLoading}
                    className="w-full flex justify-center items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Submitting Request...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Submit Rental Request
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Alternative: Skip property selection */}
              <div className="text-center pt-6 border-t border-gray-200">
                <p className="text-gray-600 text-sm mb-3">
                  Not ready to select a property right now?
                </p>
                <button
                  onClick={handleFinalSubmit}
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                >
                  Skip for now and complete registration
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Property Request Form */}
        {step === 4 && (
          <div className="bg-white py-8 px-6 shadow sm:rounded-lg">
            {/* Back button */}
            <button
              onClick={() => setStep(3)}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to property search
            </button>

            <div className="space-y-6">
              <div className="text-center mb-6">
                <Building className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900">Request Property Listing</h3>
                <p className="text-gray-600">
                  Tell us about the property you&apos;re looking for and we&apos;ll contact the landlord to list it.
                </p>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleFinalSubmit(); }} className="space-y-6">
                {/* Property Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Property Address *
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={propertyRequest.address}
                    onChange={handlePropertyRequestChange}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter the full property address"
                    required
                  />
                </div>

                {/* Property Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Property Type
                    </label>
                    <select
                      name="propertyType"
                      value={propertyRequest.propertyType}
                      onChange={handlePropertyRequestChange}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="Apartment">Apartment</option>
                      <option value="House">House</option>
                      <option value="Condo">Condo</option>
                      <option value="Townhouse">Townhouse</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expected Rent
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="number"
                        name="estimatedRent"
                        value={propertyRequest.estimatedRent}
                        onChange={handlePropertyRequestChange}
                        className="block w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bedrooms
                    </label>
                    <select
                      name="bedrooms"
                      value={propertyRequest.bedrooms}
                      onChange={handlePropertyRequestChange}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">Select...</option>
                      <option value="1">1 Bedroom</option>
                      <option value="2">2 Bedrooms</option>
                      <option value="3">3 Bedrooms</option>
                      <option value="4">4+ Bedrooms</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bathrooms
                    </label>
                    <select
                      name="bathrooms"
                      value={propertyRequest.bathrooms}
                      onChange={handlePropertyRequestChange}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">Select...</option>
                      <option value="1">1 Bathroom</option>
                      <option value="1.5">1.5 Bathrooms</option>
                      <option value="2">2 Bathrooms</option>
                      <option value="2.5">2.5 Bathrooms</option>
                      <option value="3">3+ Bathrooms</option>
                    </select>
                  </div>
                </div>

                {/* Landlord Contact Info */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Landlord Contact Information (if known)</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Landlord Email
                      </label>
                      <input
                        type="email"
                        name="landlordEmail"
                        value={propertyRequest.landlordEmail}
                        onChange={handlePropertyRequestChange}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="landlord@example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Landlord Phone
                      </label>
                      <input
                        type="tel"
                        name="landlordPhone"
                        value={propertyRequest.landlordPhone}
                        onChange={handlePropertyRequestChange}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="+260 123 456 789"
                      />
                    </div>
                  </div>
                </div>

                {/* Move-in Preferences */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Move-in Preferences</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Preferred Move-in Date
                      </label>
                      <input
                        type="date"
                        name="moveInDate"
                        value={propertyRequest.moveInDate}
                        onChange={handlePropertyRequestChange}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Lease Duration
                      </label>
                      <select
                        name="leaseDuration"
                        value={propertyRequest.leaseDuration}
                        onChange={handlePropertyRequestChange}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value="6">6 months</option>
                        <option value="12">12 months</option>
                        <option value="18">18 months</option>
                        <option value="24">24 months</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Additional Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Information
                  </label>
                  <textarea
                    name="description"
                    value={propertyRequest.description}
                    onChange={handlePropertyRequestChange}
                    rows={3}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Any additional details about the property or special requirements..."
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-6">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center items-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Submitting Request...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Submit Property Request
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}