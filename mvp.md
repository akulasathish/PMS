# RE-PMS Engine 2026: Commercial MVP Roadmap

This document defines the Minimum Viable Product (MVP) requirements for the commercial market release of the RE-PMS Engine. It focuses on the end-to-end guest lifecycle, multi-tenant security, and legal/financial compliance for the **Indian Market**.

---

## Pillar 1: SaaS Foundation (Admin - Tier 1)
*Status: Infrastructure Ready*

- [x] **Fleet Command Dashboard:** Global registration and management of properties.
- [x] **Administrative "Kill Switch":** Instant suspension/activation of property access.
- [x] **Multi-Tenant Security:** Bulletproof data isolation using Postgres RLS.
- [ ] **SaaS Subscription Billing:** Stripe integration to charge owners monthly fees.
- [ ] **Native Email Invites:** Secure "Set Password" flow for new Owners/Staff (replacing dummy passwords).

## Pillar 2: Operational Terminal (Owner & Staff - Tier 2/3)
*Status: Core Functional*

- [x] **Interactive Tape Chart:** Real-time timeline for room occupancy and availability.
- [x] **Property Switcher:** Multi-tenant navigation for owners managing several hotels.
- [~] **Tier 2/3 Feature Parity:** Owners (Tier 2) can access the operational Tape Chart and Booking tools directly.
- [ ] **Housekeeping Web Dashboard (Tier 3):** 
    *   **Architecture:** Fully web-based interface (optimized for mobile browsers).
    *   **Functionality:** View only "Dirty" rooms and click "Mark as Cleaned" to instantly update the front-desk inventory.
- [ ] **Room Recovery Logic:** Logic to automatically flip room status from 'Occupied' ➡️ 'Dirty' on guest checkout.

## Pillar 3: Guest Journey & Automation
*Status: Automated*

- [x] **Booking Confirmation:** Automated n8n email sent upon reservation creation.
- [x] **Smart Check-In:** Automated n8n email with Room Number and WiFi password.
- [ ] **Digital Registration Card (RegCard):**
    *   Digital form to capture Address, ID Type (Aadhar/DL/Passport), and Father's Name.
    *   Legal agreement/Terms & Conditions signing via UI.
- [ ] **Automated PDF Invoicing:** Generation of professional guest folios emailed upon checkout.

## Pillar 4: Indian Market Compliance (Localization)
*Status: To Be Implemented*

- [ ] **GST-Compliant Invoicing:**
    *   Automatic calculation of CGST, SGST, and IGST based on the ₹7,500 tariff slab rules.
    *   HSN/SAC code inclusion (9963).
- [ ] **Police Register (Digital Form F):** One-click export of guest data and ID photos for local police compliance.
- [ ] **Razorpay Integration:** 
    *   Support for UPI (Google Pay, PhonePe, Paytm).
    *   On-screen dynamic QR code generation for front-desk payments.

---

## Implementation Priority Table

| Priority | Feature | Category |
| :--- | :--- | :--- |
| **P0 (Critical)** | **Housekeeping Web Dashboard** | Operations |
| **P0 (Critical)** | **GST Invoicing & Razorpay** | Finance |
| **P1 (Legal)** | **RegCard & ID Capture** | Compliance |
| **P1 (UX)** | **Tier 2/3 Parity** | Operations |
| **P2 (Scale)** | **SaaS Subscription Billing**| Revenue |
