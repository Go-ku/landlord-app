// src/app/api/test-pdf/route.js
import { NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function GET() {
  try {
    console.log('Testing PDF generation...');
    
    // Create a simple test PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    page.drawText('Test PDF Generation', {
      x: 50,
      y: 700,
      size: 20,
      font,
      color: rgb(0, 0, 0),
    });
    
    page.drawText('If you can see this, PDF generation is working!', {
      x: 50,
      y: 650,
      size: 14,
      font,
    });
    
    const pdfBytes = await pdfDoc.save();
    
    console.log('Test PDF generated successfully, size:', pdfBytes.length, 'bytes');
    
    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="test.pdf"'
      }
    });
  } catch (error) {
    console.error('PDF test error:', error);
    return NextResponse.json({ 
      error: 'PDF generation test failed', 
      details: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}