// src/app/maintenance/[id]/MaintenanceDetailsClient.js
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { Edit,Trash2,ArrowLeft,CheckCircle,Clock,Wrench,AlertCircle,Loader2,X,MessageCircle,Download, Share2,Printer} from 'lucide-react';

export default function MaintenanceDetailsClient({ maintenanceRequest, userRole, userId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState(maintenanceRequest.status);

  // Check if user can edit/delete
  const canEdit = userRole === 'admin' || 
                 userRole === 'manager' || 
                 (userRole === 'landlord' && maintenanceRequest.landlordId === userId) ||
                 (userRole === 'tenant' && maintenanceRequest.tenantId === userId && maintenanceRequest.status === 'Pending');

  const canDelete = userRole === 'admin' || 
                   userRole === 'manager' ||
                   (userRole === 'tenant' && maintenanceRequest.tenantId === userId && maintenanceRequest.status === 'Pending');

  const canUpdateStatus = userRole === 'admin' || 
                         userRole === 'manager' || 
                         (userRole === 'landlord' && maintenanceRequest.landlordId === userId);

  // Handle status update
  const handleStatusUpdate = async () => {
    if (newStatus === maintenanceRequest.status) {
      setShowStatusModal(false);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/maintenance/${maintenanceRequest._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          ...(newStatus === 'Completed' && { dateCompleted: new Date().toISOString() })
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({ error: 'Failed to update status' }));
        throw new Error(result.error || 'Failed to update status');
      }

      setSuccess(`Status updated to ${newStatus}`);
      setShowStatusModal(false);
      
      // Refresh the page to show updated data
      setTimeout(() => {
        router.refresh();
      }, 1000);

    } catch (err) {
      console.error('Error updating status:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/maintenance/${maintenanceRequest._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({ error: 'Failed to delete request' }));
        throw new Error(result.error || 'Failed to delete request');
      }

      // Redirect to maintenance list
      router.push('/maintenance?deleted=true');

    } catch (err) {
      console.error('Error deleting request:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  // Handle share
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: maintenanceRequest.title,
          text: `Maintenance Request: ${maintenanceRequest.title}`,
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled sharing
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        setSuccess('Link copied to clipboard!');
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        setError('Failed to copy link');
      }
    }
  };

  return (
    <>
      {/* Messages */}
      {error && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
            <button
              onClick={() => setError('')}
              className="text-red-600 hover:text-red-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-green-800">Success</h3>
                <p className="text-sm text-green-700 mt-1">{success}</p>
              </div>
            </div>
            <button
              onClick={() => setSuccess('')}
              className="text-green-600 hover:text-green-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-8 flex flex-col sm:flex-row gap-4 print:hidden">
        <Link
          href="/maintenance"
          className="inline-flex items-center justify-center px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Maintenance
        </Link>

        <div className="flex flex-wrap gap-2 sm:gap-4">
          {/* Status Update Button */}
          {canUpdateStatus && (
            <button
              onClick={() => setShowStatusModal(true)}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium"
            >
              {maintenanceRequest.status === 'Pending' ? (
                <Clock className="w-4 h-4 mr-2" />
              ) : maintenanceRequest.status === 'In Progress' ? (
                <Wrench className="w-4 h-4 mr-2" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Update Status
            </button>
          )}

          {/* Edit Button */}
          {canEdit && (
            <Link
              href={`/maintenance/${maintenanceRequest._id}/edit`}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Link>
          )}

          {/* Utility Buttons */}
          <button
            onClick={handlePrint}
            className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors font-medium"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </button>

          <button
            onClick={handleShare}
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors font-medium"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </button>

          {/* Delete Button */}
          {canDelete && (
            <button
              onClick={() => setShowDeleteModal(true)}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 transition-colors font-medium"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Update Status</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                {newStatus === 'Completed' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-800">
                      Marking this request as completed will set the completion date to now.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStatusUpdate}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                      Updating...
                    </>
                  ) : (
                    'Update Status'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Request</h3>
              </div>
              
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this maintenance request? This action cannot be undone.
              </p>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={loading}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                      Deleting...
                    </>
                  ) : (
                    'Delete Request'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          Processing...
        </div>
      )}
    </>
  );
}