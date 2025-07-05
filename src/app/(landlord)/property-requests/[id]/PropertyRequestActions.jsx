// app/dashboard/property-requests/[id]/PropertyRequestActions.js
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  AlertCircle,
  Send,
  MessageSquare,
  FileText,
  ExternalLink,
  Bell
} from 'lucide-react';

export default function PropertyRequestActions({ requestId, requestData }) {
  const router = useRouter();
  const [isResponding, setIsResponding] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [actionType, setActionType] = useState(''); // 'approve' or 'reject'

  const handleApproveRequest = async () => {
    if (!responseMessage.trim()) {
      setError('Please provide a response message');
      return;
    }
    
    try {
      setIsResponding(true);
      setError('');
      
      const response = await fetch(`/api/property-requests/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseMessage,
          nextSteps: nextSteps || 'I will contact you to arrange a viewing and discuss lease terms.'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess('Request approved successfully! Tenant has been notified.');
        
        // Show success message and action buttons
        setShowResponseForm(false);
        
        console.log('Approval response data:', data); // Debug log
        
        // Auto-redirect to lease creation after a short delay
        setTimeout(() => {
          if (data.data?.leaseCreationUrl) {
            console.log('Navigating to:', data.data.leaseCreationUrl); // Debug log
            router.push(data.data.leaseCreationUrl);
          } else {
            console.log('No leaseCreationUrl found, refreshing page'); // Debug log
            router.refresh();
          }
        }, 2000);
        
      } else {
        setError(data.error || 'Failed to approve request');
      }
    } catch (error) {
      console.error('Error approving request:', error);
      setError('Network error approving request');
    } finally {
      setIsResponding(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!responseMessage.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }
    
    try {
      setIsResponding(true);
      setError('');
      
      const response = await fetch(`/api/property-requests/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rejectionReason: responseMessage
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess('Request rejected. Tenant has been notified.');
        setShowResponseForm(false);
        
        // Refresh the page after a short delay
        setTimeout(() => {
          router.refresh();
        }, 2000);
      } else {
        setError(data.error || 'Failed to reject request');
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      setError('Network error rejecting request');
    } finally {
      setIsResponding(false);
    }
  };

  const navigateToLeaseCreation = () => {
    const params = new URLSearchParams();
    params.set('tenant', requestData.tenant._id);
    params.set('requestId', requestId);
    
    if (requestData.property) {
      params.set('property', requestData.property._id);
    }
    
    router.push(`/dashboard/leases/create?${params.toString()}`);
  };

  const startResponse = (type) => {
    setActionType(type);
    setShowResponseForm(true);
    setError('');
    setSuccess('');
    
    // Set default messages
    if (type === 'approve') {
      const tenantName = requestData.tenant?.name || 'there';
      const propertyAddress = requestData.property?.address || requestData.requestedPropertyDetails?.address || 'the property';
      
      setResponseMessage(`Thank you for your interest in ${propertyAddress}. I'm pleased to approve your rental request and would like to move forward with the lease agreement.`);
      setNextSteps('I will contact you within 24 hours to schedule a property viewing and discuss the lease terms. Please prepare the required documents: ID, proof of income, and references.');
    } else {
      setResponseMessage('');
      setNextSteps('');
    }
  };

  const cancelResponse = () => {
    setShowResponseForm(false);
    setActionType('');
    setResponseMessage('');
    setNextSteps('');
    setError('');
    setSuccess('');
  };

  const submitResponse = () => {
    if (actionType === 'approve') {
      handleApproveRequest();
    } else if (actionType === 'reject') {
      handleRejectRequest();
    }
  };

  // Success state after approval
  if (success && actionType === 'approve') {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <p className="text-sm text-green-700 font-medium">Request Approved!</p>
              <p className="text-sm text-green-600 mt-1">{success}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={navigateToLeaseCreation}
            className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <FileText className="w-4 h-4 mr-2" />
            Create Lease Agreement
          </button>
          
          <div className="flex items-center justify-center text-xs text-gray-500">
            <Bell className="w-3 h-3 mr-1" />
            Tenant notification sent automatically
          </div>
        </div>
      </div>
    );
  }

  // Success state after rejection
  if (success && actionType === 'reject') {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
        <div className="flex">
          <XCircle className="w-5 h-5 text-gray-400 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <p className="text-sm text-gray-700 font-medium">Request Rejected</p>
            <p className="text-sm text-gray-600 mt-1">{success}</p>
          </div>
        </div>
      </div>
    );
  }

  // Response form
  if (showResponseForm) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2 mb-4">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          <h4 className="font-medium text-gray-900">
            {actionType === 'approve' ? 'Approve Request' : 'Reject Request'}
          </h4>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="flex">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 mr-2 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {actionType === 'approve' ? 'Approval Message *' : 'Rejection Reason *'}
          </label>
          <textarea
            value={responseMessage}
            onChange={(e) => setResponseMessage(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            placeholder={actionType === 'approve' 
              ? "Enter your approval message to the tenant..."
              : "Enter the reason for rejecting this request..."
            }
            disabled={isResponding}
          />
          <p className="text-xs text-gray-500 mt-1">
            {actionType === 'approve' 
              ? 'This message will be sent to the tenant via email and in-app notification.'
              : 'Please provide a clear reason to help the tenant understand your decision.'
            }
          </p>
        </div>

        {actionType === 'approve' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Next Steps (Optional)
            </label>
            <textarea
              value={nextSteps}
              onChange={(e) => setNextSteps(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="What happens next? (e.g., schedule viewing, required documents, lease signing process...)"
              disabled={isResponding}
            />
            <p className="text-xs text-gray-500 mt-1">
              Help the tenant understand what to expect after approval.
            </p>
          </div>
        )}

        <div className="flex space-x-3">
          <button
            onClick={submitResponse}
            disabled={isResponding || !responseMessage.trim()}
            className={`flex-1 flex items-center justify-center px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              actionType === 'approve'
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            {isResponding ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : actionType === 'approve' ? (
              <CheckCircle className="w-4 h-4 mr-2" />
            ) : (
              <XCircle className="w-4 h-4 mr-2" />
            )}
            {isResponding 
              ? 'Submitting...' 
              : actionType === 'approve' 
                ? 'Approve & Notify Tenant' 
                : 'Reject & Notify Tenant'
            }
          </button>
          
          <button
            onClick={cancelResponse}
            disabled={isResponding}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm disabled:opacity-50"
          >
            Cancel
          </button>
        </div>

        {actionType === 'approve' && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex items-start">
              <FileText className="w-4 h-4 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
              <div className="text-sm text-blue-700">
                <p className="font-medium">After approval:</p>
                <p>You'll be automatically redirected to create a lease agreement with pre-filled tenant details.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default action buttons
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 mb-4">
        Respond to this property request from {requestData.tenant?.name}
      </p>
      
      <button
        onClick={() => startResponse('approve')}
        className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
      >
        <CheckCircle className="w-4 h-4 mr-2" />
        Approve Request
      </button>
      
      <button
        onClick={() => startResponse('reject')}
        className="w-full flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
      >
        <XCircle className="w-4 h-4 mr-2" />
        Reject Request
      </button>

      <div className="pt-2 border-t border-gray-200">
        <button
          onClick={navigateToLeaseCreation}
          className="w-full flex items-center justify-center px-4 py-2 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm"
        >
          <FileText className="w-4 h-4 mr-2" />
          Create Lease (Skip Response)
        </button>
        <p className="text-xs text-gray-500 text-center mt-1">
          Create lease directly without sending response
        </p>
      </div>
    </div>
  );
}