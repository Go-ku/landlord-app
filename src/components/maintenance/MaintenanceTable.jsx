'use client';
import Link from 'next/link';
import { format } from 'date-fns';
import { useState } from 'react';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';

export default function MaintenanceTable({ requests }) {
  const [expandedRequest, setExpandedRequest] = useState(null);

  const toggleExpand = (id) => {
    setExpandedRequest(expandedRequest === id ? null : id);
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Property
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reported
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Priority
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {requests.length > 0 ? (
              requests.map((request) => (
                <>
                  <tr 
                    key={request._id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleExpand(request._id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900">
                          {request.title}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {request.propertyId?.address || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {format(new Date(request.dateReported), 'MMM d, yyyy')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <PriorityBadge priority={request.priority} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={request.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link 
                        href={`/maintenance/${request._id}`}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View
                      </Link>
                      <Link
                        href={`/maintenance/${request._id}/edit`}
                        className="text-indigo-600 hover:text-indigo-900"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                  {expandedRequest === request._id && (
                    <tr>
                      <td colSpan="6" className="px-6 py-4 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="col-span-2">
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Description</h4>
                            <p className="text-sm text-gray-500">{request.description}</p>
                            
                            {request.images?.length > 0 && (
                              <div className="mt-4">
                                <h4 className="text-sm font-medium text-gray-900 mb-2">Images</h4>
                                <div className="flex space-x-2">
                                  {request.images.map((image, index) => (
                                    <img
                                      key={index}
                                      src={image}
                                      alt={`Maintenance image ${index + 1}`}
                                      className="h-20 w-20 object-cover rounded"
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Details</h4>
                            <div className="space-y-2">
                              <div>
                                <span className="text-sm text-gray-500">Reported by:</span>
                                <p className="text-sm font-medium">
                                  {request.tenantId?.name || 'Unknown'}
                                </p>
                              </div>
                              <div>
                                <span className="text-sm text-gray-500">Last updated:</span>
                                <p className="text-sm font-medium">
                                  {format(new Date(request.updatedAt), 'MMM d, yyyy h:mm a')}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                  No maintenance requests found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}