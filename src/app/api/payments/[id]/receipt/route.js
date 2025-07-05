// app/api/tenant/payments/[paymentId]/receipt/route.js - Generate and download payment receipts
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { NextResponse } from 'next/server';
import dbConnect from 'lib/db';
import Payment from 'models/Payment';
import PDFDocument from 'pdfkit';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'tenant') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { paymentId } = params;

    // Find payment and verify ownership
    const payment = await Payment.findOne({
      _id: paymentId,
      tenant: session.user.id
    })
    .populate('tenant', 'name email firstName lastName')
    .populate('property', 'address city type')
    .populate('lease', 'monthlyRent startDate endDate')
    .populate('landlordId', 'name email company')
    .lean();

    if (!payment) {
      return NextResponse.json({ 
        error: 'Payment not found or access denied' 
      }, { status: 404 });
    }

    // Generate PDF receipt
    const pdfBuffer = await generatePaymentReceipt(payment);

    // Return PDF as download
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="payment-receipt-${paymentId}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error generating receipt:', error);
    return NextResponse.json({ 
      error: 'Failed to generate receipt' 
    }, { status: 500 });
  }
}

// Function to generate PDF receipt
async function generatePaymentReceipt(payment) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(24)
         .fillColor('#2563eb')
         .text('PAYMENT RECEIPT', 50, 50, { align: 'center' });

      doc.fontSize(12)
         .fillColor('#6b7280')
         .text('Official Payment Confirmation', 50, 85, { align: 'center' });

      // Company/Platform Info
      doc.fillColor('#000000')
         .fontSize(10)
         .text('RentalPay Zambia', 50, 120)
         .text('Property Management Platform', 50, 135)
         .text('Lusaka, Zambia', 50, 150)
         .text('support@rentalpay.zm', 50, 165);

      // Receipt Details Box
      doc.rect(50, 200, 500, 2).fill('#e5e7eb');
      
      // Payment Information
      doc.fontSize(14)
         .fillColor('#000000')
         .text('PAYMENT DETAILS', 50, 220);

      const leftCol = 70;
      const rightCol = 300;
      let yPos = 250;

      // Payment Amount (highlighted)
      doc.rect(50, yPos - 10, 500, 30).fill('#f0f9ff');
      doc.fontSize(16)
         .fillColor('#1e40af')
         .text('Amount Paid:', leftCol, yPos)
         .fontSize(18)
         .fillColor('#059669')
         .text(`ZMW ${payment.amount.toLocaleString()}`, rightCol, yPos);

      yPos += 40;

      // Other payment details
      doc.fontSize(11).fillColor('#000000');

      const details = [
        ['Receipt Number:', payment.receiptNumber || payment.referenceNumber || payment._id],
        ['Payment Date:', new Date(payment.paymentDate || payment.createdAt).toLocaleDateString()],
        ['Payment Method:', payment.paymentMethod === 'mobile_money' ? 'MTN Mobile Money' : payment.paymentMethod],
        ['Payment Type:', getPaymentTypeLabel(payment.paymentType)],
        ['Status:', payment.status.charAt(0).toUpperCase() + payment.status.slice(1)],
        ['Reference ID:', payment.referenceNumber || 'N/A']
      ];

      details.forEach(([label, value]) => {
        doc.text(label, leftCol, yPos)
           .text(value, rightCol, yPos);
        yPos += 20;
      });

      // Tenant Information
      yPos += 20;
      doc.rect(50, yPos - 10, 500, 2).fill('#e5e7eb');
      yPos += 10;

      doc.fontSize(14)
         .text('TENANT INFORMATION', 50, yPos);
      yPos += 30;

      doc.fontSize(11);
      const tenantName = payment.tenant?.name || 
                        `${payment.tenant?.firstName || ''} ${payment.tenant?.lastName || ''}`.trim() ||
                        'N/A';
      
      const tenantDetails = [
        ['Tenant Name:', tenantName],
        ['Email:', payment.tenant?.email || 'N/A'],
        ['Tenant ID:', payment.tenant?._id?.toString() || 'N/A']
      ];

      tenantDetails.forEach(([label, value]) => {
        doc.text(label, leftCol, yPos)
           .text(value, rightCol, yPos);
        yPos += 20;
      });

      // Property Information
      yPos += 20;
      doc.rect(50, yPos - 10, 500, 2).fill('#e5e7eb');
      yPos += 10;

      doc.fontSize(14)
         .text('PROPERTY INFORMATION', 50, yPos);
      yPos += 30;

      doc.fontSize(11);
      const propertyDetails = [
        ['Property Address:', payment.property?.address || 'N/A'],
        ['Property Type:', payment.property?.type || 'Residential'],
        ['City:', payment.property?.city || 'Lusaka'],
        ['Monthly Rent:', `ZMW ${payment.lease?.monthlyRent?.toLocaleString() || 'N/A'}`]
      ];

      propertyDetails.forEach(([label, value]) => {
        doc.text(label, leftCol, yPos)
           .text(value, rightCol, yPos);
        yPos += 20;
      });

      // Landlord Information
      if (payment.landlordId) {
        yPos += 20;
        doc.rect(50, yPos - 10, 500, 2).fill('#e5e7eb');
        yPos += 10;

        doc.fontSize(14)
           .text('LANDLORD INFORMATION', 50, yPos);
        yPos += 30;

        doc.fontSize(11);
        const landlordDetails = [
          ['Landlord:', payment.landlordId.name || 'N/A'],
          ['Email:', payment.landlordId.email || 'N/A'],
          ['Company:', payment.landlordId.company || 'N/A']
        ];

        landlordDetails.forEach(([label, value]) => {
          doc.text(label, leftCol, yPos)
             .text(value, rightCol, yPos);
          yPos += 20;
        });
      }

      // Transaction Details (if available)
      if (payment.transactionDetails || payment.momoDetails) {
        yPos += 20;
        doc.rect(50, yPos - 10, 500, 2).fill('#e5e7eb');
        yPos += 10;

        doc.fontSize(14)
           .text('TRANSACTION DETAILS', 50, yPos);
        yPos += 30;

        doc.fontSize(11);
        const transactionDetails = [];

        if (payment.transactionDetails?.transactionId) {
          transactionDetails.push(['Transaction ID:', payment.transactionDetails.transactionId]);
        }
        if (payment.transactionDetails?.mobileMoneyNumber) {
          transactionDetails.push(['Phone Number:', payment.transactionDetails.mobileMoneyNumber]);
        }
        if (payment.transactionDetails?.confirmationCode) {
          transactionDetails.push(['Confirmation Code:', payment.transactionDetails.confirmationCode]);
        }

        transactionDetails.forEach(([label, value]) => {
          doc.text(label, leftCol, yPos)
             .text(value, rightCol, yPos);
          yPos += 20;
        });
      }

      // Footer
      yPos = Math.max(yPos + 40, 700);
      doc.rect(50, yPos, 500, 2).fill('#e5e7eb');
      yPos += 20;

      doc.fontSize(10)
         .fillColor('#6b7280')
         .text('This is an official payment receipt generated electronically.', 50, yPos, { align: 'center' })
         .text(`Generated on: ${new Date().toLocaleString()}`, 50, yPos + 15, { align: 'center' })
         .text('For support inquiries, contact: support@rentalpay.zm | +260 XXX XXX XXX', 50, yPos + 30, { align: 'center' });

      // Add a subtle watermark
      doc.fontSize(60)
         .fillColor('#f3f4f6')
         .text('PAID', 200, 400, { 
           rotate: -45, 
           align: 'center',
           opacity: 0.1
         });

      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}

// Helper function to get payment type label
function getPaymentTypeLabel(paymentType) {
  switch (paymentType) {
    case 'first_payment':
      return 'First Payment (Deposit + Rent)';
    case 'rent':
      return 'Monthly Rent Payment';
    case 'partial':
      return 'Partial Payment';
    case 'utilities':
      return 'Utilities Payment';
    case 'maintenance':
      return 'Maintenance Fee';
    default:
      return paymentType?.charAt(0).toUpperCase() + paymentType?.slice(1) || 'Payment';
  }
}

