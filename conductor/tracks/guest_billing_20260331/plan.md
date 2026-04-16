# Implementation Plan: Guest Folio & PDF Invoicing

## Phase 1: Folio Engine (Backend)
- [~] Task: Create `incidental_charges` table migration to track extra items (Minibar, Laundry).
- [ ] Task: Create `payments` table migration to track guest settlements (Cash, Card, UPI).
- [ ] Task: Build `postIncidentalCharge` server action with audit logging.
- [ ] Task: Build `postPayment` server action with audit logging.
- [ ] Task: Update `checkOutGuest` to enforce the "Zero-Balance" mathematical blockade.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Folio Engine'

## Phase 2: Professional Folio UI (Frontend)
- [ ] Task: Build the Folio Summary Modal to replace the simple "Check Out" button.
- [ ] Task: Display the two-column ledger (Charges vs Payments).
- [ ] Task: Add UI forms to post incidentals and log payments.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Professional Folio UI'

## Phase 3: Invoice Template (n8n Setup)
- [ ] Task: Create a reusable HTML invoice template including GST/HSN slabs.
- [ ] Task: Update the `on_booking_checked_out` trigger to include itemized charges in the payload.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Invoice Template'

## Phase 4: n8n Workflow Update & Integration
- [ ] Task: Import PDF Generation node into the Guest Checkout workflow.
- [ ] Task: Configure Resend node to include the PDF as an attachment.
- [ ] Task: Perform a real checkout and verify the Zero-Balance lock and PDF delivery.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Integration Test'
