'use client';
import { signIn, getSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  LogIn, 
  AlertCircle, 
  Loader2,
  Home,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

function LoginForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get callback URL and any messages from URL params
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const message = searchParams.get('message');
  const verified = searchParams.get('verified');

  // Show success message if account was just verified
  useEffect(() => {
    if (verified === 'true') {
      setSuccess('Your account has been verified successfully! You can now sign in.');
    } else if (message) {
      setError(decodeURIComponent(message));
    }
  }, [verified, message]);

  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      const session = await getSession();
      if (session) {
        router.push(callbackUrl);
      }
    };
    checkSession();
  }, [router, callbackUrl]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear errors when user starts typing
    if (error) setError('');
    if (success) setSuccess('');
  };

  const validateForm = () => {
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!formData.password) {
      setError('Password is required');
      return false;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const result = await signIn('credentials', {
        redirect: false,
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        callbackUrl
      });

      if (result?.error) {
        // Handle specific error messages
        if (result.error === 'CredentialsSignin') {
          setError('Invalid email or password. Please check your credentials and try again.');
        } else if (result.error === 'AccountNotVerified') {
          setError('Please verify your email address before signing in. Check your inbox for the verification link.');
        } else if (result.error === 'AccountDeactivated') {
          setError('Your account has been deactivated. Please contact support for assistance.');
        } else {
          setError(result.error);
        }
      } else if (result?.ok) {
        setSuccess('Sign in successful! Redirecting...');
        // Add a small delay to show success message
        setTimeout(() => {
          router.push(callbackUrl);
        }, 1000);
      }
    } catch (err) {
      console.error('Sign in error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role) => {
    setLoading(true);
    setError('');
    
    // Demo credentials (you can customize these)
    const demoCredentials = {
      landlord: { email: 'demo.landlord@example.com', password: 'demo123' },
      tenant: { email: 'demo.tenant@example.com', password: 'demo123' },
      manager: { email: 'demo.manager@example.com', password: 'demo123' }
    };
    
    const credentials = demoCredentials[role];
    
    try {
      const result = await signIn('credentials', {
        redirect: false,
        email: credentials.email,
        password: credentials.password,
        callbackUrl
      });

      if (result?.error) {
        setError(`Demo ${role} account not available. Please use your own credentials.`);
      } else if (result?.ok) {
        setSuccess(`Signed in as demo ${role}! Redirecting...`);
        setTimeout(() => {
          router.push(callbackUrl);
        }, 1000);
      }
    } catch (err) {
      setError('Demo account not available. Please use your own credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <div className="mb-8">
            <div className="flex items-center mb-6">
              <Home className="w-12 h-12 mr-4" />
              <h1 className="text-4xl font-bold">PropertyManager</h1>
            </div>
            <p className="text-xl text-blue-100 leading-relaxed">
              Streamline your property management with our comprehensive platform. 
              Manage tenants, track payments, handle maintenance, and grow your portfolio.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-3 text-green-300" />
              <span>Tenant & Lease Management</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-3 text-green-300" />
              <span>Payment Tracking & Invoicing</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-3 text-green-300" />
              <span>Maintenance Request System</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-3 text-green-300" />
              <span>Financial Reports & Analytics</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile Header */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Home className="w-8 h-8 mr-2 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">PropertyManager</h1>
            </div>
            <p className="text-gray-600">Manage your properties with ease</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
              <p className="text-gray-600">Sign in to your account to continue</p>
            </div>

            {/* Success Message */}
            {success && (
              <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                  <p className="text-green-700 text-sm">{success}</p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Enter your email"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Enter your password"
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    disabled={loading}
                  />
                  <span className="ml-2 text-sm text-gray-600">Remember me</span>
                </label>
                <Link 
                  href="/auth/forgot-password" 
                  className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5 mr-2" />
                    Sign In
                  </>
                )}
              </button>
            </form>

            {/* Demo Accounts */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-center text-sm text-gray-600 mb-4">Try demo accounts:</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleDemoLogin('landlord')}
                  disabled={loading}
                  className="px-3 py-2 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:bg-gray-100 disabled:text-gray-400 transition-colors"
                >
                  Landlord
                </button>
                <button
                  onClick={() => handleDemoLogin('tenant')}
                  disabled={loading}
                  className="px-3 py-2 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:bg-gray-100 disabled:text-gray-400 transition-colors"
                >
                  Tenant
                </button>
                <button
                  onClick={() => handleDemoLogin('manager')}
                  disabled={loading}
                  className="px-3 py-2 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 disabled:bg-gray-100 disabled:text-gray-400 transition-colors"
                >
                  Manager
                </button>
              </div>
            </div>

            {/* Sign Up Link */}
            <div className="mt-8 text-center">
              <p className="text-gray-600">
                Dont have an account?{' '}
                <Link 
                  href="/auth/register" 
                  className="text-blue-600 hover:text-blue-800 font-medium transition-colors inline-flex items-center"
                >
                  Create account
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </p>
            </div>

            {/* Help Links */}
            <div className="mt-6 pt-6 border-t border-gray-200 text-center">
              <div className="flex justify-center space-x-6 text-sm text-gray-500">
                <Link href="/help" className="hover:text-gray-700 transition-colors">
                  Help Center
                </Link>
                <Link href="/privacy" className="hover:text-gray-700 transition-colors">
                  Privacy
                </Link>
                <Link href="/terms" className="hover:text-gray-700 transition-colors">
                  Terms
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}