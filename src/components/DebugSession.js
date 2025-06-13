'use client'
import { useSession } from 'next-auth/react';

export function DebugSession() {
  const { data: session, status } = useSession();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg text-xs max-w-sm z-50">
      <div className="font-bold mb-2">Debug Session</div>
      <div>Status: {status}</div>
      {session ? (
        <div>
          <div>ID: {session.user?.id || 'Missing'}</div>
          <div>Email: {session.user?.email || 'Missing'}</div>
          <div>Name: {session.user?.name || 'Missing'}</div>
          <div>Role: {session.user?.role || 'Missing'}</div>
          <div className={`px-2 py-1 rounded mt-1 ${
            session.user?.role ? 'bg-green-600' : 'bg-red-600'
          }`}>
            Role {session.user?.role ? 'OK' : 'MISSING'}
          </div>
        </div>
      ) : (
        <div className="text-red-400">No session</div>
      )}
    </div>
  );
}
