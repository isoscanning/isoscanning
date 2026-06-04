import { jsPDF } from "jspdf";

export const downloadAgreementPdf = (
  candidateName: string,
  employerName: string,
  agreementText: string
) => {
  if (!agreementText) return;

  const doc = new jsPDF();
  
  // Set font
  doc.setFont("helvetica");
  
  // Add body text
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  
  // Split text to fit page width
  // 210mm width - 20mm left margin - 20mm right margin = 170mm text width
  const splitText = doc.splitTextToSize(agreementText, 170);
  
  // Y position for text
  let yPos = 20;
  
  // Add text line by line, adding new pages if needed
  for (let i = 0; i < splitText.length; i++) {
    if (yPos > 280) {
      doc.addPage();
      yPos = 20;
    }
    doc.text(splitText[i], 20, yPos);
    yPos += 7; // Line height
  }
  
  // Save the PDF
  const safeCandidateName = candidateName ? candidateName.replace(/\s+/g, '_') : 'candidato';
  const safeEmployerName = employerName ? employerName.replace(/\s+/g, '_') : 'empregador';
  doc.save(`Contrato_${safeCandidateName}_${safeEmployerName}.pdf`);
};
