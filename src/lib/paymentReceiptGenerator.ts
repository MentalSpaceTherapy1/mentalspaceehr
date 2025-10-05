import jsPDF from 'jspdf';
import { format } from 'date-fns';

interface ReceiptLineItem {
  serviceDate: string;
  clientName: string;
  cptCode: string;
  description: string;
  chargeAmount: number;
  paymentAmount: number;
  adjustmentAmount: number;
}

interface ReceiptData {
  receiptNumber: string;
  paymentDate: string;
  paymentMethod: string;
  checkNumber?: string;
  payerName: string;
  paymentSource: string;
  lineItems: ReceiptLineItem[];
  totalPayment: number;
  totalAdjustment: number;
  paymentNotes?: string;
  postedBy: string;
}

export const generatePaymentReceipt = (receiptData: ReceiptData): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  let yPos = 20;

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT RECEIPT', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 15;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('MentalSpace Practice Management', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 20;

  // Receipt Info Box
  doc.setFillColor(240, 240, 240);
  doc.rect(15, yPos, pageWidth - 30, 40, 'F');
  
  yPos += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Receipt Number:', 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(receiptData.receiptNumber, 65, yPos);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Date:', pageWidth - 85, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(format(new Date(receiptData.paymentDate), 'MM/dd/yyyy'), pageWidth - 35, yPos, { align: 'right' });
  
  yPos += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Payer:', 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(receiptData.payerName, 65, yPos);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Method:', pageWidth - 85, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(receiptData.paymentMethod, pageWidth - 35, yPos, { align: 'right' });
  
  yPos += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Source:', 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(receiptData.paymentSource, 65, yPos);
  
  if (receiptData.checkNumber) {
    doc.setFont('helvetica', 'bold');
    doc.text('Check #:', pageWidth - 85, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(receiptData.checkNumber, pageWidth - 35, yPos, { align: 'right' });
  }
  
  yPos += 20;

  // Line Items Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Payment Allocation', 20, yPos);
  yPos += 8;

  // Table Headers
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const headers = ['Date', 'Client', 'CPT', 'Charge', 'Payment', 'Adjustment'];
  const colWidths = [25, 45, 20, 25, 25, 30];
  let xPos = 15;
  
  headers.forEach((header, i) => {
    doc.text(header, xPos, yPos);
    xPos += colWidths[i];
  });
  
  yPos += 2;
  doc.line(15, yPos, pageWidth - 15, yPos);
  yPos += 6;

  // Table Rows
  doc.setFont('helvetica', 'normal');
  receiptData.lineItems.forEach((item) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }

    xPos = 15;
    doc.text(format(new Date(item.serviceDate), 'MM/dd/yy'), xPos, yPos);
    xPos += colWidths[0];
    
    const clientName = item.clientName.length > 20 ? item.clientName.substring(0, 20) + '...' : item.clientName;
    doc.text(clientName, xPos, yPos);
    xPos += colWidths[1];
    
    doc.text(item.cptCode, xPos, yPos);
    xPos += colWidths[2];
    
    doc.text(`$${item.chargeAmount.toFixed(2)}`, xPos + colWidths[3], yPos, { align: 'right' });
    xPos += colWidths[3];
    
    doc.text(`$${item.paymentAmount.toFixed(2)}`, xPos + colWidths[4], yPos, { align: 'right' });
    xPos += colWidths[4];
    
    doc.text(`$${item.adjustmentAmount.toFixed(2)}`, xPos + colWidths[5], yPos, { align: 'right' });
    
    yPos += 7;
  });

  yPos += 5;
  doc.line(15, yPos, pageWidth - 15, yPos);
  yPos += 8;

  // Totals
  doc.setFont('helvetica', 'bold');
  doc.text('Total Payment:', pageWidth - 80, yPos);
  doc.text(`$${receiptData.totalPayment.toFixed(2)}`, pageWidth - 15, yPos, { align: 'right' });
  
  yPos += 7;
  doc.text('Total Adjustments:', pageWidth - 80, yPos);
  doc.text(`$${receiptData.totalAdjustment.toFixed(2)}`, pageWidth - 15, yPos, { align: 'right' });
  
  yPos += 7;
  doc.setFontSize(11);
  doc.text('Total Applied:', pageWidth - 80, yPos);
  doc.text(`$${(receiptData.totalPayment + receiptData.totalAdjustment).toFixed(2)}`, pageWidth - 15, yPos, { align: 'right' });

  // Notes
  if (receiptData.paymentNotes) {
    yPos += 15;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', 20, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    const splitNotes = doc.splitTextToSize(receiptData.paymentNotes, pageWidth - 40);
    doc.text(splitNotes, 20, yPos);
  }

  // Footer
  yPos = doc.internal.pageSize.height - 20;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(`Posted by: ${receiptData.postedBy}`, 20, yPos);
  doc.text(`Generated: ${format(new Date(), 'MM/dd/yyyy hh:mm a')}`, pageWidth - 20, yPos, { align: 'right' });

  // Save PDF
  doc.save(`Payment_Receipt_${receiptData.receiptNumber}.pdf`);
};
