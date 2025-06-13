'use client';
import { useState } from 'react';
import Link from 'next/link';
import NewRequestModal from '../tenant/NewRequestModal';

export default function MaintenanceRequests({ requests, propertyId, onNewRequest }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Maintenance Requests</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          New Request
        </button>
      </div>
      
      {requests?.length > 0 ? (
        <div className="space-y-3">
          {requests.map(request => (
            <div key={request._id} className="border-b pb-3">
              <div className="flex justify-between">
                <span className="font-medium">{request.title}</span>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  request.status === 'Completed' ? 'bg-green-100 text-green-800' :
                  request.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {request.status}
                </span>
              </div>
              <div className="text-sm text-gray-500">
                {new Date(request.dateReported).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No maintenance requests found</p>
      )}
      
      <div className="mt-4 text-right">
        <Link href="/tenant/maintenance" className="text-blue-600 hover:text-blue-800 text-sm">
          View all requests
        </Link>
      </div>
      
      <NewRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        propertyId={propertyId}
        onSuccess={onNewRequest}
      />
    </div>
  );
}