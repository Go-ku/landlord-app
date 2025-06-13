import { useState } from 'react';
import Link from 'next/link';
import { formatDate } from 'utils/date';
import { formatCurrency } from 'utils/currency';
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react';

export default function RecentPayments({ payments = [] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3; // Show only 3 payments per page for dashboard

  // Calculate pagination
  const totalPages = Math.ceil(payments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPayments = payments.slice(startIndex, endIndex);

  // Helper function to get status display configuration
  const getStatusConfig = (status) => {
    switch (status) {
      case 'verified':
        return { 
          color: 'bg-green-100 text-green-800', 
          label: 'Verified' 
        };
      case 'pending':
        return { 
          color: 'bg-yellow-100 text-yellow-800', 
          label: 'Pending' 
        };
      case 'disputed':
        return { 
          color: 'bg-red-100 text-red-800', 
          label: 'Disputed' 
        };
      case 'cancelled':
        return { 
          color: 'bg-gray-100 text-gray-800', 
          label: 'Cancelled' 
        };
      default:
        return { 
          color: 'bg-gray-100 text-gray-800', 
          label: status || 'Unknown' 
        };
    }
  };

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToPrevious = () => {
    goToPage(currentPage - 1);
  };

  const goToNext = () => {
    goToPage(currentPage + 1);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Recent Payments</h2>
          {payments.length > 0 && (
            <p className="text-sm text-gray-500">
              Showing {startIndex + 1}-{Math.min(endIndex, payments.length)} of {payments.length}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center space-x-1">
              <button
                onClick={goToPrevious}
                disabled={currentPage === 1}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <span className="text-xs text-gray-500 px-2">
                {currentPage} / {totalPages}
              </span>
              
              <button
                onClick={goToNext}
                disabled={currentPage === totalPages}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
          
          <Link 
            href="/payments" 
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
          >
            View All
          </Link>
        </div>
      </div>
      
      {/* Payments List */}
      <div className="space-y-4">
        {currentPayments.length > 0 ? (
          currentPayments.map((payment) => {
            // Extract tenant name with fallback
            const tenantName = payment.tenantId?.name || 
              `${payment.tenantId?.firstName || ''} ${payment.tenantId?.lastName || ''}`.trim() || 
              'Unknown Tenant';
            
            // Extract property address with fallback
            const propertyAddress = payment.propertyId?.address || 
              payment.propertyId?.name || 
              'Unknown Property';
            
            // Get status configuration
            const statusConfig = getStatusConfig(payment.status);
            
            return (
              <div 
                key={payment._id} 
                className="flex justify-between items-center p-3 border border-gray-100 rounded-lg hover:border-gray-200 hover:shadow-sm transition-all group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-gray-900 truncate">{tenantName}</p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                      {statusConfig.label}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-500 truncate mb-1">{propertyAddress}</p>
                  
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400">
                      {formatDate(payment.paymentDate)}
                    </p>
                    {payment.reference && (
                      <p className="text-xs text-gray-400">
                        Ref: {payment.reference}
                      </p>
                    )}
                  </div>
                  
                  {payment.paymentMethod && (
                    <p className="text-xs text-gray-400 mt-1">
                      via {payment.paymentMethod.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center space-x-3 ml-4">
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(payment.amount)}
                    </p>
                  </div>
                  
                  <Link
                    href={`/payments/${payment._id}`}
                    className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-blue-600 transition-all"
                    title="View payment details"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-gray-500 mb-2">No recent payments found</p>
            <Link 
              href="/payments/record" 
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              Record your first payment
            </Link>
          </div>
        )}
      </div>

      {/* Bottom pagination for larger lists */}
      {totalPages > 3 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <div className="text-gray-500">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
                className="px-2 py-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                First
              </button>
              <button
                onClick={goToPrevious}
                disabled={currentPage === 1}
                className="px-2 py-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={goToNext}
                disabled={currentPage === totalPages}
                className="px-2 py-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
              <button
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-2 py-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Last
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}