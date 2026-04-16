# The Professional Checkout Workflow (Commercial MVP)

This document outlines the industry-standard checkout process required for the RE-PMS Engine to be commercially viable, specifically focusing on financial integrity and Indian market compliance.

## 1. The Core Philosophy: The "Zero-Balance" Rule
The checkout process is not just a status change; it is a financial settlement. 
**A guest cannot be checked out if their folio balance is not exactly 0.00.**

## 2. The 4-Step Checkout Architecture

### Step 1: The Folio Audit (Pre-Checkout)
Before checking out, the Front Desk must be presented with a unified Folio (Ledger) summarizing the stay.
*   **Visuals:** A two-column ledger showing `Charges` (Debits) and `Payments` (Credits).
*   **Actions:** The ability to instantly post incidentals (e.g., Minibar, Laundry, Damage Fee) via a `+ Post Charge` button before finalizing.
*   **Math:** `Total Charges - Total Payments = Balance Due`.

### Step 2: The Financial Blockade
The system must mathematically prevent a checkout if money is owed.
*   **Logic:** The `checkOutGuest` server action must verify the balance. If `Balance Due > 0`, the action must throw an error: `"Folio has a non-zero balance. Settle balance before departure."`
*   **Resolution:** The receptionist must log a payment (Razorpay UPI, Credit Card, or Cash) to bring the balance to 0.00.

### Step 3: The Status & Inventory Flip
Once the balance is settled, the system executes the checkout.
*   **Booking Status:** Updates from `Checked In` to `Checked Out`.
*   **Room Status:** The physical inventory immediately flips from `Occupied` to `Dirty`, alerting Housekeeping.

### Step 4: Document Generation & Automation (Indian Compliance)
Upon successful checkout, the system must generate a legal tax invoice.
*   **Compliance:** The invoice must include the Hotel's GSTIN, the HSN/SAC code (9963 for accommodation), and a breakdown of CGST/SGST based on the price slab (e.g., < ₹1000 = 0%, ₹1001-₹7500 = 12%).
*   **Automation:** The `on_booking_checked_out` Postgres trigger fires a payload to n8n.
*   **Delivery:** n8n generates a PDF from an HTML template and emails it to the guest via Resend, along with a "Thank you & Review" request.

## Implementation Checklist for `checkOutGuest`
- [ ] Build the Folio Summary UI Modal (replaces simple "Check Out" button).
- [ ] Add `postIncidentalCharge` server action.
- [ ] Add `logPayment` server action.
- [ ] Enforce the `Balance === 0` blockade in `checkOutGuest`.
- [ ] Implement dynamic GST slab calculation before finalizing the folio.
- [ ] Configure the n8n webhook to generate and email the PDF invoice.
