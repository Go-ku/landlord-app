
import { RefreshCw } from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';

export default function LoadingDashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        </div>
        <Breadcrumbs />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto">
              <RefreshCw className="w-12 h-12 text-blue-600" />
            </div>
            <p className="text-gray-600 mt-4">Loading dashboard data...</p>
          </div>
        </div>
      </div>
    </div>
  );
}