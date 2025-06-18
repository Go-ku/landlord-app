'use client'
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RefreshCw, EyeIcon } from 'lucide-react';

export default function DashboardHeader() {
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Force a refresh of the page data
      router.refresh();
      // Add a small delay to show the loading state
      await new Promise(resolve => setTimeout(resolve, 500));
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="flex items-center justify-between mb-6">
      <div className='mr-2'>
        <h1 className="text-lg md:text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 hidden md:block">Welcome back! Here's your property overview.</p>
      </div>
      <div className="flex items-center space-x-2 md:space-x-3">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center px-3 py-2 md:border md:border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`w-4 h-4 md:mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          <p className='hidden md:block'>{refreshing ? 'Refreshing...' : 'Refresh'}</p>
        </button>
        <Link
          href="/dashboard/analytics"
          className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <EyeIcon className={`w-4 h-4 md:mr-2`}></EyeIcon>
          <span className='hidden md:block'>View Analytics</span>
        </Link>
      </div>
    </div>
  );
}