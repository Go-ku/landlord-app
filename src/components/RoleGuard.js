import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function RoleGuard({ children, allowedRoles, fallbackPath = '/dashboard' }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Still loading

    if (!session) {
      router.push('/auth/signin');
      return;
    }

    if (allowedRoles && !allowedRoles.includes(session.user?.role)) {
      console.warn(`Role guard: Access denied for role '${session.user?.role}'`);
      router.push(fallbackPath);
      return;
    }
  }, [session, status, router, allowedRoles, fallbackPath]);

  // Show loading while checking
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Don't render if no session
  if (!session) {
    return null;
  }

  // Don't render if role not allowed
  if (allowedRoles && !allowedRoles.includes(session.user?.role)) {
    return null;
  }

  return children;
}