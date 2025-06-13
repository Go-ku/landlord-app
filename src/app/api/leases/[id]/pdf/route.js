// src/app/api/leases/[id]/pdf/route.js
import { NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import mongoose from 'mongoose';
import User from 'models/User';
import Property from 'models/Property';
import Lease from 'models/Lease';
import { formatDate, formatDateWithDay } from 'utils/date';
import { formatCurrency } from 'utils/currency';

// Connect to MongoDB
async function connectDB() {
  if (mongoose.connections[0].readyState) {
    return;
  }
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

export async function GET(request, { params }) {
  try {
    await connectDB();
    
    const leaseId = params.id;
    
    if (!mongoose.Types.ObjectId.isValid(leaseId)) {
      return NextResponse.json({ error: 'Invalid lease ID' }, { status: 400 });
    }
    
    // Fetch lease with populated data
    const lease = await Lease.findById(leaseId)
      .populate('propertyId')
      .populate('tenantId')
      .populate('landlordId');
    
    if (!lease) {
      return NextResponse.json({ error: 'Lease not found' }, { status: 404 });
    }
    
    const tenant = lease.tenantId;
    const property = lease.propertyId;
    const landlord = lease.landlordId;
    
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Standard A4 size
    const { width, height } = page.getSize();
    
    // Embed fonts
    const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const headerFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    let yPosition = height - 60;
    const leftMargin = 50;
    const rightMargin = width - 50;
    const lineHeight = 16;
    
    // Helper function to add text with word wrap
    const addText = (text, x, y, size, font, maxWidth = rightMargin - leftMargin) => {
      const words = text.split(' ');
      let line = '';
      let currentY = y;
      
      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' ';
        const testWidth = font.widthOfTextAtSize(testLine, size);
        
        if (testWidth > maxWidth && i > 0) {
          page.drawText(line.trim(), { x, y: currentY, size, font, color: rgb(0, 0, 0) });
          line = words[i] + ' ';
          currentY -= lineHeight;
        } else {
          line = testLine;
        }
      }
      
      if (line.trim()) {
        page.drawText(line.trim(), { x, y: currentY, size, font, color: rgb(0, 0, 0) });
      }
      
      return currentY - lineHeight;
    };
    
    // Title
    page.drawText('RESIDENTIAL LEASE AGREEMENT', {
      x: leftMargin,
      y: yPosition,
      size: 18,
      font: titleFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 40;
    
    // Date and parties
    const currentDate = new Date();
    yPosition = addText(
      `This Lease Agreement is made and entered into on ${formatDateWithDay(currentDate.toISOString())}, ` +
      `between the following parties:`,
      leftMargin, yPosition, 11, bodyFont
    );
    yPosition -= 20;
    
    // Landlord information
    page.drawText('LANDLORD:', {
      x: leftMargin,
      y: yPosition,
      size: 12,
      font: headerFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= lineHeight;
    
    const landlordName = landlord?.name || `${landlord?.firstName || ''} ${landlord?.lastName || ''}`.trim() || 'Not specified';
    yPosition = addText(`Name: ${landlordName}`, leftMargin + 20, yPosition, 11, bodyFont);
    
    if (landlord?.email) {
      yPosition = addText(`Email: ${landlord.email}`, leftMargin + 20, yPosition, 11, bodyFont);
    }
    
    if (landlord?.phone) {
      yPosition = addText(`Phone: ${landlord.phone}`, leftMargin + 20, yPosition, 11, bodyFont);
    }
    yPosition -= 10;
    
    // Tenant information
    page.drawText('TENANT:', {
      x: leftMargin,
      y: yPosition,
      size: 12,
      font: headerFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= lineHeight;
    
    const tenantName = tenant?.name || `${tenant?.firstName || ''} ${tenant?.lastName || ''}`.trim() || 'Not specified';
    yPosition = addText(`Name: ${tenantName}`, leftMargin + 20, yPosition, 11, bodyFont);
    
    if (tenant?.email) {
      yPosition = addText(`Email: ${tenant.email}`, leftMargin + 20, yPosition, 11, bodyFont);
    }
    
    if (tenant?.phone) {
      yPosition = addText(`Phone: ${tenant.phone}`, leftMargin + 20, yPosition, 11, bodyFont);
    }
    
    // Emergency contact
    if (tenant?.emergencyContact) {
      const emergencyContact = typeof tenant.emergencyContact === 'object' 
        ? tenant.emergencyContact 
        : { name: tenant.emergencyContact };
      
      yPosition = addText(
        `Emergency Contact: ${emergencyContact.name || 'Not specified'}` +
        (emergencyContact.phone ? ` - ${emergencyContact.phone}` : '') +
        (emergencyContact.relationship ? ` (${emergencyContact.relationship})` : ''),
        leftMargin + 20, yPosition, 11, bodyFont
      );
    }
    yPosition -= 20;
    
    // Property information
    page.drawText('PROPERTY:', {
      x: leftMargin,
      y: yPosition,
      size: 12,
      font: headerFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= lineHeight;
    
    const propertyAddress = property?.address || property?.name || 'Property address not specified';
    yPosition = addText(`Address: ${propertyAddress}`, leftMargin + 20, yPosition, 11, bodyFont);
    
    if (property?.type) {
      yPosition = addText(`Type: ${property.type}`, leftMargin + 20, yPosition, 11, bodyFont);
    }
    
    if (property?.bedrooms) {
      yPosition = addText(`Bedrooms: ${property.bedrooms}`, leftMargin + 20, yPosition, 11, bodyFont);
    }
    
    if (property?.bathrooms) {
      yPosition = addText(`Bathrooms: ${property.bathrooms}`, leftMargin + 20, yPosition, 11, bodyFont);
    }
    yPosition -= 20;
    
    // Lease terms
    page.drawText('LEASE TERMS:', {
      x: leftMargin,
      y: yPosition,
      size: 12,
      font: headerFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= lineHeight;
    
    yPosition = addText(`1. LEASE PERIOD: This lease shall commence on ${formatDateWithDay(lease.startDate)} and end on ${formatDateWithDay(lease.endDate)}.`, leftMargin, yPosition, 11, bodyFont);
    yPosition -= 5;
    
    yPosition = addText(`2. RENT: The monthly rent is ${formatCurrency(lease.monthlyRent)}, due on the ${lease.paymentDueDay}${lease.paymentDueDay === 1 ? 'st' : lease.paymentDueDay === 2 ? 'nd' : lease.paymentDueDay === 3 ? 'rd' : 'th'} day of each month.`, leftMargin, yPosition, 11, bodyFont);
    yPosition -= 5;
    
    yPosition = addText(`3. SECURITY DEPOSIT: A security deposit of ${formatCurrency(lease.securityDeposit)} is required upon signing this agreement.`, leftMargin, yPosition, 11, bodyFont);
    yPosition -= 5;
    
    yPosition = addText(`4. LATE FEES: Rent not received within 5 days of the due date will incur a late fee of 10% of the monthly rent amount.`, leftMargin, yPosition, 11, bodyFont);
    yPosition -= 5;
    
    yPosition = addText(`5. UTILITIES: Tenant is responsible for all utilities unless specifically stated otherwise in writing.`, leftMargin, yPosition, 11, bodyFont);
    yPosition -= 5;
    
    yPosition = addText(`6. MAINTENANCE: Tenant agrees to maintain the property in good condition and report any damages immediately.`, leftMargin, yPosition, 11, bodyFont);
    yPosition -= 5;
    
    yPosition = addText(`7. TERMINATION: Either party may terminate this lease with 30 days written notice, subject to applicable laws.`, leftMargin, yPosition, 11, bodyFont);
    yPosition -= 20;
    
    // Payment information
    if (lease.nextPaymentDue || lease.balanceDue > 0) {
      page.drawText('PAYMENT INFORMATION:', {
        x: leftMargin,
        y: yPosition,
        size: 12,
        font: headerFont,
        color: rgb(0, 0, 0),
      });
      yPosition -= lineHeight;
      
      if (lease.nextPaymentDue) {
        yPosition = addText(`Next Payment Due: ${formatDate(lease.nextPaymentDue)}`, leftMargin + 20, yPosition, 11, bodyFont);
      }
      
      if (lease.balanceDue > 0) {
        yPosition = addText(`Current Balance Due: ${formatCurrency(lease.balanceDue)}`, leftMargin + 20, yPosition, 11, bodyFont);
      }
      
      yPosition = addText(`Total Paid to Date: ${formatCurrency(lease.totalPaid || 0)}`, leftMargin + 20, yPosition, 11, bodyFont);
      yPosition -= 20;
    }
    
    // Signatures section
    yPosition = Math.max(yPosition, 150); // Ensure signatures are not too low
    
    page.drawText('SIGNATURES:', {
      x: leftMargin,
      y: yPosition,
      size: 12,
      font: headerFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 30;
    
    // Tenant signature
    page.drawText('Tenant:', {
      x: leftMargin,
      y: yPosition,
      size: 11,
      font: headerFont,
      color: rgb(0, 0, 0),
    });
    
    page.drawText('_______________________________', {
      x: leftMargin + 80,
      y: yPosition,
      size: 11,
      font: bodyFont,
      color: rgb(0, 0, 0),
    });
    
    page.drawText('Date: _______________', {
      x: leftMargin + 350,
      y: yPosition,
      size: 11,
      font: bodyFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 40;
    
    // Landlord signature
    page.drawText('Landlord:', {
      x: leftMargin,
      y: yPosition,
      size: 11,
      font: headerFont,
      color: rgb(0, 0, 0),
    });
    
    page.drawText('_______________________________', {
      x: leftMargin + 80,
      y: yPosition,
      size: 11,
      font: bodyFont,
      color: rgb(0, 0, 0),
    });
    
    page.drawText('Date: _______________', {
      x: leftMargin + 350,
      y: yPosition,
      size: 11,
      font: bodyFont,
      color: rgb(0, 0, 0),
    });
    
    // Footer
    page.drawText(`Generated on ${formatDateWithDay(currentDate.toISOString())}`, {
      x: leftMargin,
      y: 30,
      size: 9,
      font: bodyFont,
      color: rgb(0.5, 0.5, 0.5),
    });
    
    page.drawText(`Lease ID: ${lease._id}`, {
      x: rightMargin - 150,
      y: 30,
      size: 9,
      font: bodyFont,
      color: rgb(0.5, 0.5, 0.5),
    });
    
    const pdfBytes = await pdfDoc.save();
    
    // Generate filename
    const tenantNameForFile = tenantName.replace(/[^a-zA-Z0-9]/g, '_');
    const propertyNameForFile = (property?.address || 'Property').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Lease_${tenantNameForFile}_${propertyNameForFile}_${formatDate(lease.startDate).replace(/\//g, '-')}.pdf`;
    
    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
    
  } catch (error) {
    console.error('Error generating lease PDF:', error);
    return NextResponse.json({ 
      error: 'Failed to generate lease PDF', 
      details: error.message 
    }, { status: 500 });
  }
}

// Alternative POST endpoint for custom terms
export async function POST(request, { params }) {
  try {
    await connectDB();
    
    const { customTerms } = await request.json();
    const leaseId = params.id;
    
    if (!mongoose.Types.ObjectId.isValid(leaseId)) {
      return NextResponse.json({ error: 'Invalid lease ID' }, { status: 400 });
    }
    
    // Fetch lease with populated data
    const lease = await Lease.findById(leaseId)
      .populate('propertyId')
      .populate('tenantId')
      .populate('landlordId');
    
    if (!lease) {
      return NextResponse.json({ error: 'Lease not found' }, { status: 404 });
    }
    
    // Similar PDF generation logic but with custom terms
    // You can extend this to include custom terms if needed
    
    return NextResponse.json({ message: 'Custom terms PDF generation not yet implemented' }, { status: 501 });
    
  } catch (error) {
    console.error('Error generating custom lease PDF:', error);
    return NextResponse.json({ 
      error: 'Failed to generate custom lease PDF', 
      details: error.message 
    }, { status: 500 });
  }
}