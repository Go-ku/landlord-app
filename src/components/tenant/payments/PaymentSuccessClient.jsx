// components/tenant/payments/PaymentSuccessClient.jsx - Client component for interactive features
'use client';

import { useState } from 'react';
import { Download, Share2, Copy, Check } from 'lucide-react';

export default function PaymentSuccessClient({ paymentId }) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadReceipt = async () => {
    setDownloading(true);
    try {
      const response = await fetch(`/api/tenant/payments/${paymentId}/receipt`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payment-receipt-${paymentId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Failed to download receipt');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download receipt. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyReference = async () => {
    try {
      await navigator.clipboard.writeText(paymentId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy error:', error);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Payment Successful',
          text: `Payment of reference ${paymentId} has been completed successfully.`,
          url: window.location.href
        });
      } catch (error) {
        console.error('Share error:', error);
      }
    } else {
      handleCopyReference();
    }
  };

  return (
    <>
      <button
        onClick={handleDownloadReceipt}
        disabled={downloading}
        className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
      >
        {downloading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Generating...
          </>
        ) : (
          <>
            <Download className="w-4 h-4 mr-2" />
            Download Receipt
          </>
        )}
      </button>

      <button
        onClick={handleCopyReference}
        className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 mr-2 text-green-600" />
            Reference Copied!
          </>
        ) : (
          <>
            <Copy className="w-4 h-4 mr-2" />
            Copy Reference
          </>
        )}
      </button>

      <button
        onClick={handleShare}
        className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Share2 className="w-4 h-4 mr-2" />
        Share Payment Proof
      </button>
    </>
  );
}