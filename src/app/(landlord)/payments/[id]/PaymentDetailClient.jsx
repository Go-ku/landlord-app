// app/payments/[id]/PaymentDetailClient.js - Client Component
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Download, CheckCircle, XCircle, Clock,
  Home, CreditCard, FileText, AlertCircle, Edit, MoreVertical,
  Smartphone, Copy, Send, Mail, MessageCircle, RefreshCw
} from 'lucide-react';

export default function PaymentDetailClient({ payment, currentUser }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [modals, setModals] = useState({ actions: false, receipt: false, approval: false });
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const formatCurrency = (amt) => new Intl.NumberFormat('en-ZM', { style: 'currency', currency: 'ZMW' }).format(amt);
  const formatDate = (d) => new Date(d).toLocaleString('en-ZM', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const statusClasses = {
    completed: 'bg-green-100 text-green-700',
    approved: 'bg-green-100 text-green-700',
    verified: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    failed: 'bg-red-100 text-red-700',
    rejected: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-700'
  };

  const statusIcons = {
    completed: <CheckCircle className="w-4 h-4 text-green-600" />, approved: <CheckCircle className="w-4 h-4 text-green-600" />, verified: <CheckCircle className="w-4 h-4 text-green-600" />,
    pending: <Clock className="w-4 h-4 text-yellow-500" />, failed: <XCircle className="w-4 h-4 text-red-500" />, rejected: <XCircle className="w-4 h-4 text-red-500" />, cancelled: <XCircle className="w-4 h-4 text-gray-400" />
  };

  const canAct = (role) => ['manager', 'admin'].includes(currentUser.role) || (currentUser.role === 'landlord' && payment.property?.landlord === currentUser.id);
  const canEdit = () => canAct();
  const canApprove = () => canAct() && payment.approvalStatus === 'pending';
  const canSendReceipt = () => ['manager', 'admin', 'landlord'].includes(currentUser.role) && ['completed', 'verified', 'approved'].includes(payment.status);

  const handlePost = async (url, data, callback, failMsg) => {
    setLoading(true);
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || failMsg);
      callback?.();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const approve = () => handlePost(`/api/payments/${payment._id}/approve`, { notes: approvalNotes || 'Approved' }, () => {
    setModals({ ...modals, approval: false });
    setApprovalNotes('');
    router.refresh();
  }, 'Failed to approve');

  const reject = () => {
    if (!rejectionReason.trim()) return alert('Rejection reason required');
    handlePost(`/api/payments/${payment._id}/reject`, { reason: rejectionReason }, () => {
      setModals({ ...modals, approval: false });
      setRejectionReason('');
      router.refresh();
    }, 'Failed to reject');
  };

  const sendReceipt = (method) => handlePost(`/api/payments/${payment._id}/send-receipt`, { method }, () => {
    alert(`Sent via ${method}`);
    setModals({ ...modals, receipt: false });
  }, 'Failed to send');

  const downloadReceipt = async () => {
    try {
      const res = await fetch(`/api/payments/${payment._id}/receipt`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${payment.receiptNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Download failed');
    }
  };

  const copyText = async (txt) => navigator.clipboard.writeText(txt).then(() => alert('Copied'));

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => router.back()} className="flex items-center text-gray-700 hover:underline">
            <ArrowLeft className="w-4 h-4 mr-2" />Back
          </button>
          <div className="relative">
            <button onClick={() => setModals({ ...modals, actions: !modals.actions })} className="p-2 border rounded-md">
              <MoreVertical className="w-4 h-4" />
            </button>
            {modals.actions && (
              <div className="absolute right-0 mt-2 w-48 bg-white border rounded shadow z-10">
                <button onClick={downloadReceipt} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center text-sm">
                  <Download className="w-4 h-4 mr-2" />Download Receipt
                </button>
                {canSendReceipt() && (
                  <button onClick={() => setModals({ ...modals, receipt: true })} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center text-sm">
                    <Send className="w-4 h-4 mr-2" />Send Receipt
                  </button>
                )}
                {canEdit() && (
                  <Link href={`/payments/${payment._id}/edit`} className="block px-4 py-2 hover:bg-gray-50 flex items-center text-sm">
                    <Edit className="w-4 h-4 mr-2" />Edit
                  </Link>
                )}
                {canApprove() && (
                  <button onClick={() => setModals({ ...modals, approval: true })} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center text-sm">
                    <CheckCircle className="w-4 h-4 mr-2 text-green-600" />Approve/Reject
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-md border space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Receipt #{payment.receiptNumber}</h1>
            <div className={`text-sm px-3 py-1 rounded-full border ${statusClasses[payment.status] || 'bg-gray-100 text-gray-700'}`}>
              <div className="flex items-center space-x-2">
                {statusIcons[payment.status] || <AlertCircle className="w-4 h-4 text-gray-500" />}<span className="capitalize">{payment.status}</span>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600">Amount</p>
              <p className="font-semibold text-lg">{formatCurrency(payment.amount)}</p>
            </div>
            <div>
              <p className="text-gray-600">Date</p>
              <p className="font-medium">{formatDate(payment.paymentDate)}</p>
            </div>
            <div>
              <p className="text-gray-600">Method</p>
              <p className="capitalize flex items-center">{payment.paymentMethod} {payment.paymentMethod === 'mobile_money' && <Smartphone className="ml-1 w-4 h-4" />}</p>
            </div>
            <div>
              <p className="text-gray-600">Reference</p>
              <div className="flex items-center">
                <span>{payment.referenceNumber || 'N/A'}</span>
                {payment.referenceNumber && (
                  <button onClick={() => copyText(payment.referenceNumber)} className="ml-2">
                    <Copy className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm text-gray-600">Property: {payment.property?.name || payment.property?.address}</p>
            <p className="text-sm text-gray-600">Tenant: {payment.tenant?.name || `${payment.tenant?.firstName} ${payment.tenant?.lastName}`}</p>
          </div>

          <div>
            <h3 className="text-md font-semibold mb-1">Description</h3>
            <p className="text-gray-700 text-sm">
              {payment.description} {payment.paymentPeriod ? `(for ${payment.paymentPeriod.month})` : ''}
            </p>
          </div>

          {payment.approvalHistory?.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-800 mb-2">Approval History</h4>
              <ul className="text-sm space-y-1">
                {payment.approvalHistory.map((entry, i) => (
                  <li key={i} className="flex justify-between border-b pb-1">
                    <span className="capitalize">{entry.action}</span>
                    <span className="text-gray-500">{formatDate(entry.timestamp)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {canSendReceipt() && (
            <div className="flex gap-4 mt-4">
              <button onClick={() => sendReceipt('email')} className="px-4 py-2 bg-blue-600 text-white rounded">Send Email</button>
              <button onClick={() => sendReceipt('whatsapp')} className="px-4 py-2 bg-green-600 text-white rounded">Send WhatsApp</button>
              <button onClick={() => sendReceipt('sms')} className="px-4 py-2 bg-gray-600 text-white rounded">Send SMS</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
