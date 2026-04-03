# RE-PMS Engine 2026: Commercial MVP Roadmap

This document defines the Minimum Viable Product (MVP) requirements for the commercial market release of the RE-PMS Engine. It focuses on the end-to-end guest lifecycle, enterprise-grade permissions, and legal/financial compliance for the **Indian Market**.

---

## Pillar 1: SaaS Foundation (Admin - Tier 1)
- [x] **Fleet Command Dashboard:** Global registration and management of properties.
- [x] **Administrative "Kill Switch":** Instant suspension/activation of property access.
- [x] **Multi-Tenant Security:** Bulletproof data isolation using Postgres RLS.
- [ ] **SaaS Subscription Billing:** Stripe integration to charge owners monthly fees.
- [ ] **Native Email Invites:** Secure "Set Password" flow for new Owners/Staff (replacing dummy passwords).

## Pillar 2: Operational Power & IAM (Owner & Staff - Tier 2/3)
- [x] **Interactive Tape Chart:** Real-time timeline for room occupancy and availability.
- [x] **Unified Dashboard:** "Single Pane of Glass" where everyone logs into `/dashboard`.
- [x] **Visual Padlock Logic:** Sidebar links show 🔒 based on user role.
- [x] **Staff Architect (Enterprise IAM):** 
    *   **Action-Level Matrix:** Toggle specific sub-features (e.g., allow Check-Out but block Check-In).
    *   **Feature Grouping:** Front Office (Tape Chart, Upgrades, Refunds), Housekeeping (Cleaning, Inspection, Minibar), Finance (Audit, Reports).
    *   **Custom Role Templates:** Save hybrid configurations as reusable templates for specific shift needs.
    *   **Staff Lifecycle Control:** Exclusively allow **Tier 2 Owners** to permanently delete staff accounts and revoke access for employees within their specific property.
    *   **Surgical IAM Profile (`/staff/[id]`):** Dedicated "Command Center" page for each employee.
    *   **Cross-Department Assignment:** Ability to assign 25+ specific features (from any department) to any user, regardless of their base job title.
    *   **The 3-Tier Toggle:** Every feature must have `[R] Read`, `[W] Write`, and `[D] Deny` access levels.
    *   **JSON Playground:** An advanced view for Owners to directly write/paste raw JSON permission arrays.
    *   **Searchable Matrix:** A live search bar to instantly filter the 25+ features (e.g., typing "Refund").
- [ ] **Performance & Logs (Audit Trail):**
    *   **Activity Feed:** Real-time logging of who created bookings, issued refunds, or marked rooms clean.
    *   **Owner Visibility:** A dedicated "Recent Activity" widget on the Tier 2 Dashboard.
- [ ] **Front Office Suite:**
    *   **Daily Operational Lists:** Tabbed interface replacing purely visual Tape Charts for fast, high-volume action (Arrivals Today, Departures Today, In-House).
    *   **Master Reservations:** Searchable master list for future/past bookings with date filters (Solves "where is my guest for 24th April?").
    *   **Transactional Actions:** Room Upgrades (live move), Refund Folios, Guest Notes directly accessible from any list view via the slide-out Action Drawer.
    *   **Stay Summary Header:** Action Drawer displays `Total Nights` and `Date Range` clearly for staff.
    *   **Room Blocking:** Administrative lock on rooms for maintenance, meetings, or group events (Marriages/Meetings).
    *   **Night Audit:** "End of Day" logic to lock revenue and generate daily reports.
- [ ] **Housekeeping Web Terminal:** 
    *   **Cleaner View:** Mobile task list with "Start/Finish" timers and Minibar posting.
    *   **Supervisor View:** Dedicated "Inspect" button to move rooms from Clean ➡️ Ready/Inspected.
    *   **Ops Management:** Assigning "Boards" or room sections to specific staff members.

## Pillar 3: Guest Journey & Automation
- [x] **Smart Communications:** Automated n8n emails for Confirmation and Smart Check-In.
- [ ] **The Professional Folio:**
    *   **Balance Enforcement:** Physically block "Check-Out" button if Folio balance is not $0.00.
    *   **Extra Charges:** UI to post incidentals (Laundry, Minibar, Room Service) to the guest's bill.
- [ ] **Smart Cancellation:** One-click "Cancel / No Show" button to instantly release room inventory.
- [ ] **Digital Registration Card (RegCard):**
    *   Capture Address, ID Type (Aadhar/Passport/DL), and Father's Name.
    *   UI for legal terms agreement and e-signature.
    *   Photo upload for Guest ID/Aadhar.
- [ ] **Automated PDF Invoicing:** Generation of guest folios emailed upon checkout.

## Pillar 4: Indian Market Compliance (Localization)
- [ ] **GST-Compliant Invoicing:**
    *   Auto-calculation of CGST, SGST, and IGST based on room price slabs.
    *   HSN/SAC code (9963) and Hotel GSTIN on invoice.
- [ ] **Police Register (Digital Form F):** One-click export of daily arrivals for local authority compliance.
- [ ] **Razorpay & UPI Integration:** 
    *   Dynamic QR codes for UPI (GPay/PhonePe) at the Front Desk.
    *   Native Razorpay checkout for Credit/Debit cards.

---

## Implementation Priority Table

| Priority | Feature | Category |
| :--- | :--- | :--- |
| **P0 (Critical)** | **Staff Architect (IAM)** | Security |
| **P0 (Critical)** | **Housekeeping Terminal** | Operations |
| **P0 (Critical)** | **GST Invoicing & Razorpay** | Finance |
| **P1 (Legal)** | **RegCard & ID Capture** | Compliance |
| **P2 (Scale)** | **SaaS Billing (Stripe)** | Revenue |
