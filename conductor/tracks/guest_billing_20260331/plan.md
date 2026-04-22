# Implementation Plan: Guest Folio & PDF Invoicing

## Phase 1: Folio Engine (Backend)
- [x] Task: Create `incidental_charges` table migration to track extra items (Minibar, Laundry). [3506ef3]
- [x] Task: Create `payments` table migration to track guest settlements (Cash, Card, UPI). [04dcfd3]
- [x] Task: Build `postIncidentalCharge` server action with audit logging. [3506ef3]
- [x] Task: Build `postPayment` server action with audit logging. [04dcfd3]
- [x] Task: Update `checkOutGuest` to enforce the "Zero-Balance" mathematical blockade. [bff1f00]
- [x] Task: Conductor - User Manual Verification 'Phase 1: Folio Engine' [bff1f00]

## Phase 2: Professional Folio UI (Frontend)
- [x] Task: Build the Folio Summary Modal to replace the simple "Check Out" button. [8d4cfa6]
- [x] Task: Display the two-column ledger (Charges vs Payments). [8d4cfa6]
- [x] Task: Add UI forms to post incidentals and log payments. [8d4cfa6]
- [x] Task: Conductor - User Manual Verification 'Phase 2: Professional Folio UI' [8d4cfa6]

## Phase 3: Invoice Template (n8n Setup)
- [x] Task: Create a reusable HTML invoice template including GST/HSN slabs. [1b2967d]
- [x] Task: Update the `on_booking_checked_out` trigger to include itemized charges in the payload. [1b2967d]
- [x] Task: Conductor - User Manual Verification 'Phase 3: Invoice Template' [1b2967d]

## Phase 4: n8n Workflow Update & Integration
- [ ] Task: Import PDF Generation node into the Guest Checkout workflow.
- [ ] Task: Configure Resend node to include the PDF as an attachment.
- [ ] Task: Perform a real checkout and verify the Zero-Balance lock and PDF delivery.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Integration Test'
