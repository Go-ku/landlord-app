// lib/pdfGenerator.js
import PDFDocument from 'pdfkit';
import fs from 'fs';

export async function generatePDF(invoice) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const buffers = [];
    
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Header
    doc.fontSize(20).text('INVOICE', { align: 'center' });
    doc.moveDown();
    
    // Invoice info
    doc.fontSize(10)
      .text(`Invoice #: ${invoice.invoiceNumber}`, { continued: true })
      .text(`Date: ${new Date(invoice.issueDate).toLocaleDateString()}`, { align: 'right' });
    
    doc.moveDown();
    
    // From/To
    doc.text('From:', { continued: true }).text('Your Property Management', { align: 'right' });
    doc.text('To:', { continued: true }).text(invoice.tenantId.name, { align: 'right' });
    
    doc.moveDown();
    
    // Items table
    const tableTop = doc.y;
    doc.font('Helvetica-Bold');
    doc.text('Description', 50, tableTop);
    doc.text('Amount', 350, tableTop, { width: 100, align: 'right' });
    doc.text('Tax', 450, tableTop, { width: 100, align: 'right' });
    doc.text('Total', 550, tableTop, { width: 100, align: 'right' });
    doc.font('Helvetica');
    
    let y = tableTop + 25;
    invoice.items.forEach(item => {
      doc.text(item.description, 50, y);
      doc.text(item.amount.toFixed(2), 350, y, { width: 100, align: 'right' });
      doc.text(`${item.taxRate}% (${(item.amount * item.taxRate/100).toFixed(2)})`, 450, y, { width: 100, align: 'right' });
      doc.text((item.amount * (1 + item.taxRate/100)).toFixed(2), 550, y, { width: 100, align: 'right' });
      y += 20;
    });
    
    // Totals
    doc.moveTo(50, y).lineTo(550, y).stroke();
    y += 10;
    
    doc.text('Subtotal:', 450, y, { width: 100, align: 'right' });
    doc.text(invoice.subtotal.toFixed(2), 550, y, { width: 100, align: 'right' });
    y += 20;
    
    doc.text('Tax:', 450, y, { width: 100, align: 'right' });
    doc.text(invoice.tax.toFixed(2), 550, y, { width: 100, align: 'right' });
    y += 20;
    
    doc.font('Helvetica-Bold');
    doc.text('Total:', 450, y, { width: 100, align: 'right' });
    doc.text(invoice.total.toFixed(2), 550, y, { width: 100, align: 'right' });
    y += 30;
    
    // Payment status
    doc.font('Helvetica');
    doc.text(`Payment Status: ${invoice.status.toUpperCase()}`, 50, y);
    y += 20;
    
    if (invoice.balanceDue > 0) {
      doc.text(`Balance Due: ${invoice.balanceDue.toFixed(2)}`, 50, y);
      y += 20;
      doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, 50, y);
    }
    
    doc.end();
  });
}