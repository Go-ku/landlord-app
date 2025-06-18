'use client'
import { AlertCircle } from 'lucide-react';


export default function ErrorDisplay({ error }) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <div className="flex items-start">
        <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
        <div>
          <h3 className="text-sm font-medium text-yellow-800">
            Dashboard Data Warning
          </h3>
          <p className="text-sm text-yellow-700 mt-1">
            Some dashboard data may be incomplete or unavailable. The system is displaying available information.
          </p>
          {isDevelopment && (
            <details className="mt-2">
              <summary className="text-xs text-yellow-600 cursor-pointer hover:text-yellow-800">
                Technical Details (Dev Mode)
              </summary>
              <p className="text-xs text-yellow-600 mt-1 font-mono bg-yellow-100 p-2 rounded">
                {error}
              </p>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}