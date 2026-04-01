# Track: Guest Folio & PDF Invoicing

## Overview
This track automates the generation of guest invoices upon checkout. It utilizes n8n for PDF creation and delivery to ensure a professional and scalable billing process.

## Strategy
1.  **n8n Node Integration:** Add a PDF generation node to the existing "Guest Checkout" n8n workflow.
2.  **HTML to PDF Template:** Design a professional invoice template in HTML/CSS for the PDF converter.
3.  **Automatic Delivery:** Attach the generated PDF to the "Thank You" email sent via Resend.

## Acceptance Criteria
- [ ] Guest receives an email immediately upon checkout.
- [ ] Email contains a PDF attachment labeled "Invoice_[BookingID].pdf".
- [ ] PDF correctly displays Guest Name, Property Name, Room Number, and Total Amount.
