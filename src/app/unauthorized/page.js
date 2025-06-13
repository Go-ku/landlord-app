// src/app/unauthorized/page.js
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Home } from 'lucide-react';

export default async function UnauthorizedPage({ searchParams }) {
  const session = await getServerSession(authOptions);
  const reason = searchParams?.reason;

  const getReasonMessage = () => {
    switch (reason) {
      case 'insufficient_permissions':
        return {
          title: 'Insufficient Permissions',
          message: 'You do not have the required permissions to access this feature. This feature is only available to landlords and managers.',
          suggestion: 'Contact your administrator if you believe you should have access to this feature.'
        };
      case 'tenant_only':
        return {
          title: 'Tenant Access Only',
          message: 'This feature is only available to tenants.',
          suggestion: 'If you are a tenant, please ensure you are logged in with the correct account.'
        };
      case 'landlord_only':
        return {
          title: 'Landlord Access Only',
          message: 'This feature is only available to property landlords.',
          suggestion: 'If you are a landlord, please ensure you are logged in with the correct account.'
        };
      default:
        return {
          title: 'Access Denied',
          message: 'You do not have permission to access this page.',
          suggestion: 'Please contact your administrator for assistance.'
        };
    }
  };

  const reasonData = getReasonMessage();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          {/* Icon */}
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {reasonData.title}
          </h1>

          {/* Message */}
          <p className="text-gray-600 mb-4">
            {reasonData.message}
          </p>

          {/* Current User Info */}
          {session?.user && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Current Account
              </h3>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Name:</span> {session.user.name || 'Not provided'}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Email:</span> {session.user.email}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Role:</span> {session.user.role || 'Not assigned'}
              </p>
            </div>
          )}

          {/* Suggestion */}
          <p className="text-sm text-gray-500 mb-6">
            {reasonData.suggestion}
          </p>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link
              href="/"
              className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Home className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Link>

            <button
              onClick={() => window.history.back()}
              className="w-full inline-flex items-center justify-center px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </button>

            {!session && (
              <Link
                href="/auth/signin"
                className="w-full inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Help Text */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-400">
              If you believe this is an error, please contact support with the following information:
            </p>
            <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded p-2">
              <p>User ID: {session?.user?.id || 'Not logged in'}</p>
              <p>Role: {session?.user?.role || 'None'}</p>
              <p>Reason: {reason || 'general_access_denied'}</p>
              <p>Time: {new Date().toISOString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export async function generateMetadata({ searchParams }) {
  const reason = searchParams?.reason;
  
  let title = 'Access Denied';
  
  switch (reason) {
    case 'insufficient_permissions':
      title = 'Insufficient Permissions';
      break;
    case 'tenant_only':
      title = 'Tenant Access Required';
      break;
    case 'landlord_only':
      title = 'Landlord Access Required';
      break;
  }

  return {
    title: `${title} - Property Management`,
    description: 'You do not have permission to access this page.',
  };
}