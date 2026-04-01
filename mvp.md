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
- [ ] **Staff Architect (Enterprise IAM):** 
    *   **Granular Permissions:** Move from "Role-based" to "Feature-based" (e.g., can perform Check-Out but NOT Check-In).
    *   **Action Matrix:** Collapsible UI in the "Invite Staff" modal to toggle specific capabilities per module.
    *   **Custom Role Templates:** Allow Owners to save a specific matrix configuration (e.g., "Junior Desk") as a reusable template.
- [ ] **Housekeeping Web Terminal:** Mobile-optimized interface for cleaners to reset "Dirty" rooms.

## Pillar 3: Guest Journey & Automation
- [x] **Smart Communications:** Automated n8n emails for Confirmation and Smart Check-In.
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
