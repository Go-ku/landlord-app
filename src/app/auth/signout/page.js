'use client';

import { useEffect, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Loader2, LogOut, CheckCircle, Home } from 'lucide-react';

export default function SignOutPage() {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    const handleSignOut = async () => {
      if (!session) {
        setSignedOut(true);
        return;
      }

      setIsSigningOut(true);
      try {
        await signOut({ 
          redirect: false,
          callbackUrl: '/' 
        });
        setSignedOut(true);
        
        // Redirect after 2 seconds
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } catch (error) {
        console.error('Sign out error:', error);
        setIsSigningOut(false);
      }
    };

    handleSignOut();
  }, [session, router]);

  if (signedOut) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Signed Out</h2>
          <p className="text-gray-600 mb-4">
            You have been successfully signed out of your account.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Redirecting to home page...
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/auth/signin')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Sign In Again
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          {isSigningOut ? (
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          ) : (
            <LogOut className="w-8 h-8 text-blue-600" />
          )}
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {isSigningOut ? 'Signing Out...' : 'Sign Out'}
        </h2>
        <p className="text-gray-600">
          {isSigningOut 
            ? 'Please wait while we sign you out of your account.'
            : 'Preparing to sign out...'
          }
        </p>
      </div>
    </div>
  );
}