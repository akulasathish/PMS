# StaySync: Commercial MVP Roadmap

This document defines the Minimum Viable Product (MVP) requirements for the commercial market release of StaySync. It focuses on the self-service guest lifecycle, 1-tier role-free workspace design, and legal/financial compliance.

---

## Pillar 1: Single-Tier SaaS Foundation (Self-Service Onboarding)
- [x] **Self-Service Signup:** Public onboarding flow at `/signup` replacing manual Tier-1 provisioning.
- [x] **Instant Property Setup:** Post-login wizard allowing users to immediately register their properties and set up room inventory.
- [x] **Multi-Tenant Security:** Bulletproof data isolation between property workspaces using Postgres Row-Level Security (RLS).
- [x] **Zero-Gated Architecture:** Deprecation of old administrative gating, trial expirations, and billing screens.
- [x] **Simple Workspace Design:** Seamless, single-tier direct dashboard access. Your account is your workspace—no complex RBAC matrices, no multi-level permissions, and no admin approval gates.

## Pillar 2: Operational Power (Core Terminals)
- [x] **Interactive Tape Chart:** Real-time timeline for room occupancy and availability.
- [x] **Unified Dashboard:** "Single Pane of Glass" where owners manage all aspects of operations from `/dashboard`.
- [x] **Front Office Suite:**
    *   **Daily Operational Lists:** Tabbed interface for fast, high-volume action (Arrivals Today, Departures Today, In-House).
    *   **Master Reservations:** Universal search for future/past bookings with chronological sorting and professional date formats (e.g., "Apr 21, 2026").
    *   **Transactional Actions:** Room Upgrades (live move), Refund Folios, Guest Notes directly accessible from any list view via the slide-out Action Drawer.
    *   **Stay Summary Header:** Action Drawer displays `Total Nights` and `Date Range` clearly for operators.
    *   **Enterprise Check-In Guardrails:** Mandatory 3-step checklist (ID, Signature, Payment) mathematically blocks the "Check In" status flip until compliance is met.
    *   **Inventory Protection:** Dynamic date overlap calculation mathematically prevents overbooking during Walk-Ins.
- [x] **Night Audit & Room Blocking (Inventory Control):**
    *   **Enterprise Calendar Block:** Replace instant locks with a "Date & Reason" modal (Out of Order vs. Out of Service).
    *   **Strict Conflict Resolution:** The system prevents blocking a room if a booking exists or a guest is checked in on any overlapping date.
- [x] **Housekeeping Web Terminal (Master Board):** 
    *   **The QC Loop:** Move from a linear Clean/Dirty toggle to a 3-step workflow: `Dirty` ➡️ `Clean` ➡️ `Inspected` (Ready for Sale).
    *   **Guest Context (X-Ray Vision):** Room cards display real-time guest status (e.g., "Departing Today", "Arriving Soon", "Stayover") to prioritize cleaning order.
    *   **Stayover Service:** A dedicated view for occupied rooms requiring daily light cleaning/towel changes.
    *   **Cleaner View:** Mobile task list with "Start/Finish" timers.

## Pillar 3: Guest Journey & Automation
- [x] **Smart Communications:** Automated n8n emails for Confirmation and Smart Check-In.
- [x] **Digital Registration Card (RegCard):**
    *   **Magic Link Workflow:** SMS/Email link sent to guest's phone for self-serve ID capture.
    *   **Mobile ID Upload:** Guest captures Aadhar/Passport directly to secure Supabase storage.
    *   **Digital Signature:** React Canvas integration for legal terms agreement.
    *   **Real-Time Sync:** Auto-ticks the Front Desk's Check-In checklist upon completion.
- [x] **Guest Identity (Receptionist Hardware):**
    *   **Mobile QR Handshake:** Receptionist uses their own smartphone to scan physical IDs directly into the desktop PMS.
- [x] **The Professional Folio (Commercial Checkout Workflow):**
    *   **Folio Engine:** `incidental_charges` and `payments` tables with audit logging.
    *   **Balance Enforcement:** Physically block "Check-Out" button if Folio balance is not $0.00.
    *   **Extra Charges:** UI to post incidentals (Laundry, Minibar, Room Service) and log payments.
    *   **Automated PDF Invoicing:** Generation of guest folios with GST compliance, emailed upon checkout via n8n.

## Pillar 4: Indian Market Compliance (Localization)
- [ ] **GST-Compliant Invoicing:**
    *   Auto-calculation of CGST, SGST, and IGST based on room price slabs.
    *   HSN/SAC code (9963) and Hotel GSTIN on invoice.
- [x] **Police Register (Digital Form F):** One-click export of daily arrivals for local authority compliance.
