import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';

interface ConsentPdfData {
  clientName: string;
  clinicianName: string;
  consentDate: string;
  clientId: string;
  
  // Understanding
  understoodLimitations: boolean;
  understoodRisks: boolean;
  understoodBenefits: boolean;
  understoodAlternatives: boolean;
  risksAcknowledged: string[];
  
  // Emergency
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  currentPhysicalLocation: string;
  localEmergencyNumber: string;
  
  // Privacy
  privacyPolicyReviewed: boolean;
  confidentialityLimitsUnderstood: boolean;
  
  // State & Technical
  clientStateOfResidence: string;
  clinicianLicensedInState: boolean;
  adequateConnectionConfirmed: boolean;
  privateLocationConfirmed: boolean;
  
  // Recording
  consentsToRecording: boolean;
  
  // Signature
  signature: string; // base64 image
  expirationDate: string;
}

export async function generateConsentPdf(consent: ConsentPdfData): Promise<string> {
  const doc = new jsPDF();
  let yPosition = 20;
  const lineHeight = 7;
  const leftMargin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Telehealth Consent Form', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += lineHeight * 2;
  
  // Client & Date Info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Client: ${consent.clientName}`, leftMargin, yPosition);
  yPosition += lineHeight;
  doc.text(`Clinician: ${consent.clinicianName}`, leftMargin, yPosition);
  yPosition += lineHeight;
  doc.text(`Date: ${consent.consentDate}`, leftMargin, yPosition);
  yPosition += lineHeight;
  doc.text(`Expiration: ${consent.expirationDate}`, leftMargin, yPosition);
  yPosition += lineHeight * 2;
  
  // Section 1: Understanding of Telehealth
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Understanding of Telehealth', leftMargin, yPosition);
  yPosition += lineHeight;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  doc.text(`${consent.understoodLimitations ? '☑' : '☐'} I understand the limitations of telehealth services`, leftMargin + 5, yPosition);
  yPosition += lineHeight;
  doc.text(`${consent.understoodRisks ? '☑' : '☐'} I understand the risks involved`, leftMargin + 5, yPosition);
  yPosition += lineHeight;
  doc.text(`${consent.understoodBenefits ? '☑' : '☐'} I understand the benefits`, leftMargin + 5, yPosition);
  yPosition += lineHeight;
  doc.text(`${consent.understoodAlternatives ? '☑' : '☐'} I understand the alternatives available`, leftMargin + 5, yPosition);
  yPosition += lineHeight * 1.5;
  
  if (consent.risksAcknowledged.length > 0) {
    doc.text('Risks Acknowledged:', leftMargin + 5, yPosition);
    yPosition += lineHeight;
    consent.risksAcknowledged.forEach(risk => {
      doc.setFontSize(9);
      doc.text(`• ${risk}`, leftMargin + 10, yPosition);
      yPosition += lineHeight * 0.8;
    });
    doc.setFontSize(10);
    yPosition += lineHeight * 0.5;
  }
  
  // Section 2: Emergency Procedures
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('2. Emergency Procedures', leftMargin, yPosition);
  yPosition += lineHeight;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  doc.text(`Emergency Contact: ${consent.emergencyContact.name}`, leftMargin + 5, yPosition);
  yPosition += lineHeight;
  doc.text(`Phone: ${consent.emergencyContact.phone}`, leftMargin + 5, yPosition);
  yPosition += lineHeight;
  doc.text(`Relationship: ${consent.emergencyContact.relationship}`, leftMargin + 5, yPosition);
  yPosition += lineHeight;
  doc.text(`Current Location: ${consent.currentPhysicalLocation}`, leftMargin + 5, yPosition);
  yPosition += lineHeight;
  doc.text(`Local Emergency Number: ${consent.localEmergencyNumber}`, leftMargin + 5, yPosition);
  yPosition += lineHeight * 1.5;
  
  // Section 3: Privacy & Security
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('3. Privacy & Security', leftMargin, yPosition);
  yPosition += lineHeight;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  doc.text(`${consent.privacyPolicyReviewed ? '☑' : '☐'} I have reviewed the privacy policy`, leftMargin + 5, yPosition);
  yPosition += lineHeight;
  doc.text(`${consent.confidentialityLimitsUnderstood ? '☑' : '☐'} I understand confidentiality limits`, leftMargin + 5, yPosition);
  yPosition += lineHeight * 1.5;
  
  // Section 4: State Licensure
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('4. State Licensure', leftMargin, yPosition);
  yPosition += lineHeight;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  doc.text(`Client State: ${consent.clientStateOfResidence}`, leftMargin + 5, yPosition);
  yPosition += lineHeight;
  doc.text(`Clinician Licensed in State: ${consent.clinicianLicensedInState ? 'Yes' : 'No'}`, leftMargin + 5, yPosition);
  yPosition += lineHeight * 1.5;
  
  // Section 5: Technical Requirements
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('5. Technical Requirements', leftMargin, yPosition);
  yPosition += lineHeight;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  doc.text(`${consent.adequateConnectionConfirmed ? '☑' : '☐'} I have adequate internet connection`, leftMargin + 5, yPosition);
  yPosition += lineHeight;
  doc.text(`${consent.privateLocationConfirmed ? '☑' : '☐'} I am in a private location`, leftMargin + 5, yPosition);
  yPosition += lineHeight * 1.5;
  
  // Section 6: Recording
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('6. Session Recording', leftMargin, yPosition);
  yPosition += lineHeight;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  doc.text(`${consent.consentsToRecording ? '☑' : '☐'} I consent to session recording (if applicable)`, leftMargin + 5, yPosition);
  yPosition += lineHeight * 2;
  
  // Signature Section
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('7. Client Signature', leftMargin, yPosition);
  yPosition += lineHeight;
  
  if (consent.signature) {
    try {
      doc.addImage(consent.signature, 'PNG', leftMargin + 5, yPosition, 60, 20);
      yPosition += 25;
    } catch (error) {
      console.error('Error adding signature to PDF:', error);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text('[Digital Signature on File]', leftMargin + 5, yPosition);
      yPosition += lineHeight * 2;
    }
  }
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text(`Signed on: ${consent.consentDate}`, leftMargin + 5, yPosition);
  
  // Footer
  yPosition = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('This is a legally binding document. Please retain for your records.', pageWidth / 2, yPosition, { align: 'center' });
  
  // Generate PDF and upload to Supabase Storage
  const pdfBlob = doc.output('blob');
  const fileName = `consent_${consent.clientId}_${Date.now()}.pdf`;
  
  const { data, error } = await supabase.storage
    .from('telehealth-consents')
    .upload(fileName, pdfBlob, {
      contentType: 'application/pdf',
      upsert: false,
    });
  
  if (error) {
    console.error('Error uploading PDF:', error);
    throw error;
  }
  
  return data.path;
}

export async function downloadConsentPdf(pdfPath: string): Promise<void> {
  const { data, error } = await supabase.storage
    .from('telehealth-consents')
    .download(pdfPath);
  
  if (error) {
    console.error('Error downloading PDF:', error);
    throw error;
  }
  
  // Create download link
  const url = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = pdfPath.split('/').pop() || 'consent.pdf';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
