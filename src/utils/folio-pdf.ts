"use client";

/**
 * Guest Folio & Invoice PDF Generation Utility
 * Generates a premium, highly professional hotel invoice/folio report.
 */

interface FolioPDFData {
  bookingId: string;
  roomAmount: number;
  bookingStatus: string;
  checkIn: string;
  checkOut: string;
  checkInTime?: string;
  checkOutTime?: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  roomNumber: string;
  propertyName: string;
  propertyAddress?: string;
  propertyCity?: string;
  propertyCountry?: string;
  propertyGst?: string;
  propertyStateCode?: string;
  isMonthly?: boolean;
  incidentals: Array<{
    id: string;
    amount: number;
    description: string;
    created_at: string;
    business_date?: string;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    method: string;
    created_at: string;
    business_date?: string;
    transaction_id?: string;
  }>;
  totalCharges: number;
  totalPayments: number;
  balanceDue: number;
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch (e) {
    return dateStr;
  }
};

const formatDateTime = (isoStr?: string) => {
  if (!isoStr) return 'N/A';
  try {
    const date = new Date(isoStr);
    const formattedDate = date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const hasTime = isoStr.includes('T') && 
                    !isoStr.endsWith('T00:00:00') && 
                    !isoStr.endsWith('T00:00:00.000Z');
    if (hasTime) {
      const formattedTime = date.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      return `${formattedDate} (${formattedTime})`;
    }
    return formattedDate;
  } catch (e) {
    return isoStr;
  }
};

export async function generateGuestBillPDF(folio: FolioPDFData) {
  const { jsPDF } = await import('jspdf');
  
  // Polyfill window.jsPDF to ensure jspdf-autotable loads and binds correctly in Next.js CSR
  if (typeof window !== 'undefined') {
    (window as any).jsPDF = jsPDF;
  }
  
  const { default: autoTable } = await import('jspdf-autotable');
  
  // Create portrait A4 document (210mm x 297mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;

  // --- BRANDING HEADER (DARK BANNER) ---
  doc.setFillColor(18, 18, 20); // Sleek deep luxury gray/black
  doc.rect(0, 0, pageWidth, 42, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(folio.propertyName.toUpperCase(), margin, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(180, 180, 182);
  
  const addressLine1 = [
    folio.propertyAddress,
    folio.propertyCity,
    folio.propertyCountry
  ].filter(Boolean).join(', ');
  
  doc.text(addressLine1, margin, 23);
  
  if (folio.propertyGst) {
    doc.text(`GSTIN: ${folio.propertyGst}  |  State Code: ${folio.propertyStateCode || 'N/A'}`, margin, 28);
  } else {
    doc.text(`StaySync Managed Luxury Accommodation`, margin, 28);
  }

  // Folio Banner Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("GUEST FOLIO / INVOICE", pageWidth - margin - 60, 16, { align: 'left' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(180, 180, 182);
  const invoiceNo = `ST-${folio.bookingId.substring(0, 8).toUpperCase()}`;
  doc.text(`Invoice No: ${invoiceNo}`, pageWidth - margin - 60, 23);
  doc.text(`Date of Issue: ${new Date().toLocaleDateString('en-IN')}`, pageWidth - margin - 60, 28);
  doc.text(`Folio Status: ${folio.bookingStatus === 'Checked Out' ? 'SETTLED' : 'ACTIVE'}`, pageWidth - margin - 60, 33);

  // --- GUEST & STAY METADATA BLOCK ---
  let yPos = 52;
  doc.setFillColor(248, 249, 250); // Light off-white backdrop
  doc.rect(margin, yPos, pageWidth - (margin * 2), 32, 'F');
  doc.setDrawColor(230, 232, 235);
  doc.rect(margin, yPos, pageWidth - (margin * 2), 32, 'D');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);

  // Column 1: Guest Info
  doc.text("GUEST DETAILS", margin + 5, yPos + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Name: ${folio.guestName}`, margin + 5, yPos + 12);
  doc.text(`Phone: ${folio.guestPhone || 'N/A'}`, margin + 5, yPos + 17);
  doc.text(`Email: ${folio.guestEmail || 'N/A'}`, margin + 5, yPos + 22);

  // Column 2: Stay Info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text("STAY INFORMATION", margin + 95, yPos + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Room Number: Room ${folio.roomNumber}`, margin + 95, yPos + 12);
  doc.text(`Check-In:  ${formatDateTime(folio.checkInTime || folio.checkIn)}`, margin + 95, yPos + 17);
  doc.text(`Check-Out: ${formatDateTime(folio.checkOutTime || folio.checkOut)}`, margin + 95, yPos + 22);
  
  // Calculate stay duration
  let nightsText = 'N/A';
  try {
    const cIn = new Date(folio.checkIn);
    const cOut = new Date(folio.checkOut);
    const diffTime = Math.abs(cOut.getTime() - cIn.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    nightsText = `${diffDays} ${diffDays === 1 ? 'Night' : 'Nights'}`;
  } catch (e) {}
  doc.text(`Duration:  ${nightsText}`, margin + 95, yPos + 27);

  yPos += 42;

  // --- ITEMISED CHARGES TABLE ---
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text("1. ACCOMMODATION & EXTRA CHARGES", margin, yPos);

  const chargesRows = [
    // Base Room stay
    [
      '1',
      'Room Stay Charges (Base Rate)',
      formatDate(folio.checkIn),
      `Rs. ${folio.roomAmount.toFixed(2)}`
    ]
  ];

  folio.incidentals.forEach((item, index) => {
    chargesRows.push([
      (index + 2).toString(),
      item.description,
      formatDate(item.created_at),
      `Rs. ${Number(item.amount).toFixed(2)}`
    ]);
  });

  autoTable(doc, {
    startY: yPos + 3,
    head: [['SL', 'CHARGE DESCRIPTION', 'POSTED DATE', 'AMOUNT']],
    body: chargesRows,
    theme: 'grid',
    headStyles: { fillColor: [54, 69, 79], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { fontSize: 8.5, textColor: [80, 80, 80] },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 105 },
      2: { cellWidth: 35, halign: 'center' },
      3: { cellWidth: 28, halign: 'right' }
    },
    rowPageBreak: 'avoid',
    margin: { left: margin, right: margin }
  });

  let currentY = (doc as any).lastAutoTable.finalY + 12;

  // --- LOGGED PAYMENTS TABLE ---
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text("2. PAYMENT & TRANSACTION HISTORY", margin, currentY);

  const activePayments = folio.payments.filter(p => !(p as any).is_void);
  const paymentsRows = activePayments.length === 0 
    ? [['-', 'No payments recorded on ledger', '-', '-']]
    : activePayments.map((p, index) => [
        (index + 1).toString(),
        p.method + (p.transaction_id ? ` (Txn: ${p.transaction_id})` : '') + ((p as any).billing_period ? ` [Cycle: ${(p as any).billing_period}]` : ''),
        formatDate(p.business_date || p.created_at),
        `-Rs. ${Number(p.amount).toFixed(2)}`
      ]);

  autoTable(doc, {
    startY: currentY + 3,
    head: [['SL', 'PAYMENT METHOD / TRANS ID', 'TRANSACTION DATE', 'AMOUNT PAID']],
    body: paymentsRows,
    theme: 'grid',
    headStyles: { fillColor: [46, 125, 50], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { fontSize: 8.5, textColor: [80, 80, 80] },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 105 },
      2: { cellWidth: 35, halign: 'center' },
      3: { cellWidth: 28, halign: 'right' }
    },
    rowPageBreak: 'avoid',
    margin: { left: margin, right: margin }
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // --- LEDGER SUMMARY SUMMARY BANNER ---
  if (currentY > pageHeight - 75) {
    doc.addPage();
    currentY = 20;
  }

  // Draw a summary section box on the right
  const summaryBoxWidth = 85;
  const summaryBoxHeight = 35;
  const summaryX = pageWidth - margin - summaryBoxWidth;

  doc.setFillColor(245, 247, 248);
  doc.rect(summaryX, currentY, summaryBoxWidth, summaryBoxHeight, 'F');
  doc.setDrawColor(220, 222, 225);
  doc.rect(summaryX, currentY, summaryBoxWidth, summaryBoxHeight, 'D');

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  
  // Total Charges line
  doc.text("Total Itemised Charges:", summaryX + 4, currentY + 7);
  doc.setFont('helvetica', 'bold');
  doc.text(`Rs. ${folio.totalCharges.toFixed(2)}`, pageWidth - margin - 4, currentY + 7, { align: 'right' });

  // Total Payments line
  doc.setFont('helvetica', 'normal');
  doc.text("Total Payments Received:", summaryX + 4, currentY + 14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(46, 125, 50);
  doc.text(`-Rs. ${folio.totalPayments.toFixed(2)}`, pageWidth - margin - 4, currentY + 14, { align: 'right' });

  // Divider
  doc.setDrawColor(200, 202, 205);
  doc.line(summaryX + 4, currentY + 19, pageWidth - margin - 4, currentY + 19);

  // Balance Due line
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  if (Math.abs(folio.balanceDue) <= 0.01) {
    doc.setTextColor(46, 125, 50); // Safe emerald green
    doc.text("BALANCE DUE (PAID):", summaryX + 4, currentY + 26);
    doc.text("Rs. 0.00", pageWidth - margin - 4, currentY + 26, { align: 'right' });
    
    // Add a small settled stamp badge
    doc.setDrawColor(46, 125, 50);
    doc.setFillColor(232, 245, 233);
    doc.rect(summaryX + 4, currentY + 29, 32, 4.5, 'DF');
    doc.setFontSize(7.5);
    doc.setTextColor(46, 125, 50);
    doc.text("FULLY SETTLED", summaryX + 6, currentY + 32.5);
  } else {
    doc.setTextColor(211, 47, 47); // Warning Rose Red
    doc.text("BALANCE DUE:", summaryX + 4, currentY + 26);
    doc.text(`Rs. ${folio.balanceDue.toFixed(2)}`, pageWidth - margin - 4, currentY + 26, { align: 'right' });
    
    // Add outstanding notice badge
    doc.setDrawColor(211, 47, 47);
    doc.setFillColor(255, 235, 235);
    doc.rect(summaryX + 4, currentY + 29, 34, 4.5, 'DF');
    doc.setFontSize(7.5);
    doc.setTextColor(211, 47, 47);
    doc.text("PAYMENT OUTSTANDING", summaryX + 5, currentY + 32.5);
  }

  // --- FOOTER & SIGN-OFFS ---
  const footerY = pageHeight - 35;
  
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(120, 120, 120);
  doc.text("This is an electronically generated folio invoice statement. No physical signature is required.", margin, footerY);
  doc.text("Thank you for choosing to stay with us. Please let us know if we can assist you again soon!", margin, footerY + 4);

  // Sign-off lines
  doc.setFont('helvetica', 'normal');
  doc.setDrawColor(180, 180, 180);
  
  // Guest signature line
  doc.line(margin, footerY + 20, margin + 45, footerY + 20);
  doc.text("Guest Signature", margin, footerY + 24);

  // Staff signature line
  doc.line(pageWidth - margin - 45, footerY + 20, pageWidth - margin, footerY + 20);
  doc.text("Authorized Representative", pageWidth - margin - 45, footerY + 24);

  // Save/Download the PDF with custom file name
  const fileName = `Folio_Invoice_Room_${folio.roomNumber}_${folio.guestName.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
}

export async function generateDailyItemizedLedgerPDF(folio: FolioPDFData) {
  const { jsPDF } = await import('jspdf');
  
  if (typeof window !== 'undefined') {
    (window as any).jsPDF = jsPDF;
  }
  
  const { default: autoTable } = await import('jspdf-autotable');
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;

  // Header Banner
  doc.setFillColor(18, 18, 20); // Deep luxury dark theme
  doc.rect(0, 0, pageWidth, 42, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(folio.propertyName.toUpperCase(), margin, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(180, 180, 182);
  
  const addressLine = [
    folio.propertyAddress,
    folio.propertyCity,
    folio.propertyCountry
  ].filter(Boolean).join(', ');
  doc.text(addressLine, margin, 23);
  
  if (folio.propertyGst) {
    doc.text(`GSTIN: ${folio.propertyGst}`, margin, 28);
  }

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text("DAILY ROOM CHARGES LEDGER", pageWidth - margin - 75, 16, { align: 'left' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(180, 180, 182);
  doc.text(`Room: Room ${folio.roomNumber}`, pageWidth - margin - 75, 23);
  doc.text(`Guest: ${folio.guestName}`, pageWidth - margin - 75, 28);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, pageWidth - margin - 75, 33);

  // Metadata block (Guest details)
  let yPos = 52;
  doc.setFillColor(248, 249, 250);
  doc.rect(margin, yPos, pageWidth - (margin * 2), 22, 'F');
  doc.setDrawColor(230, 232, 235);
  doc.rect(margin, yPos, pageWidth - (margin * 2), 22, 'D');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text("LEDGER METADATA", margin + 5, yPos + 6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Stay Period: ${formatDate(folio.checkIn)} to ${formatDate(folio.checkOut)}`, margin + 5, yPos + 12);
  doc.text(`Base Total Tariff: Rs. ${folio.roomAmount.toFixed(2)}`, margin + 5, yPos + 17);

  // Parse days
  const dates: string[] = [];
  const start = new Date(folio.checkIn);
  const end = new Date(folio.checkOut);

  let current = new Date(start);
  while (current < end) {
    dates.push(current.toISOString().substring(0, 10));
    current.setDate(current.getDate() + 1);
  }

  // If stay duration is somehow 0, fallback to checkIn date
  if (dates.length === 0) {
    dates.push(folio.checkIn.substring(0, 10));
  }

  // Parse codes helpers
  const extractQty = (desc: string): number => {
    const qtyMatch = desc.match(/\(Qty:\s*(\d+)\)/i);
    if (qtyMatch) return parseInt(qtyMatch[1]);
    const xMatch = desc.match(/x\s*(\d+)/i);
    if (xMatch) return parseInt(xMatch[1]);
    return 1;
  };

  const rows: any[] = [];
  let grandTotal = 0;

  dates.forEach((dateStr, idx) => {
    // 1. TARIFF
    let dailyTariff = 0;
    const dailyAuditCharge = folio.incidentals.find(item => {
      const itemDate = item.business_date || item.created_at.substring(0, 10);
      return itemDate === dateStr && item.description.startsWith('Daily Room Charge');
    });
    if (dailyAuditCharge) {
      dailyTariff = Number(dailyAuditCharge.amount);
    } else if (!folio.isMonthly) {
      dailyTariff = folio.roomAmount / dates.length;
    }

    // 2. F/W & OTHERS
    const dayIncidentals = folio.incidentals.filter(item => {
      const itemDate = item.business_date || item.created_at.substring(0, 10);
      return itemDate === dateStr && 
             !item.description.startsWith('Daily Room Charge') && 
             item.id !== 'security-deposit-charge';
    });

    const fwCodes: string[] = [];
    let dayIncidentalTotal = 0;

    dayIncidentals.forEach(item => {
      dayIncidentalTotal += Number(item.amount);
      const desc = item.description.toLowerCase();
      const qty = extractQty(item.description);

      if (desc.includes('lunch')) {
        fwCodes.push(`${item.amount}L`);
      } else if (desc.includes('dinner')) {
        fwCodes.push(`${item.amount}D`);
      } else if (desc.includes('water')) {
        fwCodes.push(qty > 1 ? `${qty}W` : `${item.amount}W`);
      } else {
        const categoryInitial = item.description.trim().substring(0, 1).toUpperCase();
        fwCodes.push(`${item.amount}${categoryInitial}`);
      }
    });

    const fwString = fwCodes.length > 0 ? fwCodes.join(' / ') : '';
    const dailyTotal = dailyTariff + dayIncidentalTotal;
    grandTotal += dailyTotal;

    // Convert YYYY-MM-DD to DD/MM/YYYY
    const dateParts = dateStr.split('-');
    const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

    rows.push([
      (idx + 1).toString(),
      formattedDate,
      `Rs. ${dailyTariff.toFixed(2)}`,
      fwString || '-',
      `Rs. ${dailyTotal.toFixed(2)}`
    ]);
  });

  autoTable(doc, {
    startY: yPos + 28,
    head: [['SL', 'DATE', 'TARIFF', 'F/W (LUNCH / DINNER / WATER CODES)', 'DAILY TOTAL']],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [54, 69, 79], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8.5, textColor: [80, 80, 80] },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 35, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 80, halign: 'center' },
      4: { cellWidth: 33, halign: 'right' }
    },
    margin: { left: margin, right: margin }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;

  // Add Grand Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text("GRAND TOTAL CHARGES:", pageWidth - margin - 80, finalY);
  doc.text(`Rs. ${grandTotal.toFixed(2)}`, pageWidth - margin - 4, finalY, { align: 'right' });

  // Codes Guide Legend
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("Codes Guide: L = Lunch, D = Dinner, W = Water bottles. (e.g. 2W/1D = 2 Water Bottles and 1 Dinner, 40W = Rs. 40 Water).", margin, finalY + 12);

  // Save/Download the PDF with custom file name
  const fileName = `Daily_Ledger_Room_${folio.roomNumber}_${folio.guestName.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
}
