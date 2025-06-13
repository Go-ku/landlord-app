'use client';
import { FiCalendar, FiHome, FiDollarSign, FiUser, FiClock } from 'react-icons/fi';
import Link from 'next/link';
import { formatDate } from 'utils/date';

export default function LeaseCard({ lease }) {
  const isActive = new Date(lease.endDate) > new Date();
  const daysRemaining = Math.floor(
    (new Date(lease.endDate) - new Date()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-lg">
            <Link href={`/properties/${lease.propertyId._id}`} className="hover:underline">
              {lease.propertyId?.address || 'Unknown Property'}
            </Link>
          </h3>
          <p className="text-gray-600 flex items-center mt-1">
            <FiUser className="mr-2" />
            {lease.tenantId?.name || 'Unknown Tenant'}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm ${
          isActive 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {isActive ? 'Active' : 'Expired'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div className="flex items-center">
          <FiCalendar className="mr-2 text-gray-500" />
          <div>
            <p className="text-sm text-gray-500">Lease Term</p>
            <p>
              {formatDate(lease.startDate)} - {formatDate(lease.endDate)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center">
          <FiDollarSign className="mr-2 text-gray-500" />
          <div>
            <p className="text-sm text-gray-500">Monthly Rent</p>
            <p>${lease.monthlyRent?.toFixed(2) || '0.00'}</p>
          </div>
        </div>
        
        <div className="flex items-center">
          <FiClock className="mr-2 text-gray-500" />
          <div>
            <p className="text-sm text-gray-500">
              {isActive ? 'Days Remaining' : 'Ended'}
            </p>
            <p>{isActive ? daysRemaining : formatDate(lease.endDate)}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Link 
          href={`/leases/${lease._id}`}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          View Lease Details →
        </Link>
      </div>
    </div>
  );
}