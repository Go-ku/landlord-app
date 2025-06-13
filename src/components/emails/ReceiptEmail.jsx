// components/emails/ReceiptEmail.jsx
export function ReceiptEmail({ payment }) {
    return (
      <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ color: '#111' }}>Payment Receipt</h1>
        <p style={{ color: '#555' }}>Thank you for your payment!</p>
        
        <div style={{ margin: '20px 0', padding: '20px', background: '#f9f9f9', borderRadius: '8px' }}>
          <p><strong>Receipt #:</strong> {payment.receiptNumber}</p>
          <p><strong>Date:</strong> {new Date(payment.date).toLocaleDateString()}</p>
          <p><strong>Property:</strong> {payment.propertyId?.address || 'N/A'}</p>
          <p><strong>Amount:</strong> ${payment.amount.toFixed(2)}</p>
        </div>
        
        <a href={payment.receiptUrl} 
           style={{ display: 'inline-block', padding: '10px 15px', background: '#2563eb', color: 'white', 
                   textDecoration: 'none', borderRadius: '4px' }}>
          Download Receipt
        </a>
        
        <p style={{ marginTop: '20px', color: '#777' }}>
          If you have any questions, please contact our support team.
        </p>
      </div>
    );
  }