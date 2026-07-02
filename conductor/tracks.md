# Project Tracks - StaySync PMS Engine 2026

This file tracks all major development tracks for the project, updated to reflect the unified, single-tier, role-free self-service architecture.

---

## 1. Core Platform & Infrastructure (Completed)

### 💾 Single-Tier Self-Service Signup & Wizard
- **ID:** `self_service_onboarding_20260618`
- **Goal:** Public frictionless onboarding flow at `/signup` with a setup wizard at `/dashboard/property-setup`.
- **Status:** **Completed** — Fully decoupled from the legacy multi-role invite gating and SaaS subscription billing.

### 🛡️ Production Hardening & Flat RLS Policies
- **ID:** `rls_hardening_20260331`
- **Goal:** Strict database isolation for multi-tenancy based on `owner_user_id = auth.uid()`.
- **Status:** **Completed** — Removed legacy role-checking helper functions. Consolidated into flat, high-performance Postgres RLS policies.

---

## 2. Front Desk & Room Inventory (Completed)

### 📅 Interactive Tape Chart & Bed Selector
- **ID:** `tape_chart_20260331`
- **Goal:** Build the interactive timeline grid for front-desk operations.
- **Status:** **Completed** — Upgraded with tabbed bed selectors for monthly co-living room cards to optimize screen space.

### 🔑 Front Office Daily Lists & Action Drawer
- **ID:** `front_office_suite_20260403`
- **Goal:** Arrivals/Departures lists, walk-in overbooking prevention, and instant room upgrades.
- **Status:** **Completed** — Unlocked for all users.

### 🚪 Inventory & Room Management
- **ID:** `inventory_mgmt_20260331`
- **Goal:** Polished interface for owners to configure and manage physical room inventory.
- **Status:** **Completed** — Seamless dashboard setup integration.

---

## 3. Operational Control & Compliance (Completed)

### 🧹 Housekeeping Web Terminal
- **ID:** `housekeeping_mgmt_20260331`
- **Goal:** Cleanliness QC loop (`Dirty` ➡️ `Clean` ➡️ `Inspected`), housekeeper task sheets, and cleaning timers.
- **Status:** **Completed** — Unified view displaying real-time guest status to prioritize cleanings.

### 📋 Guest Compliance (Digital RegCard)
- **ID:** `guest_compliance_20260331`
- **Goal:** Mobile QR code handshake allowing guest self-service Aadhar/ID upload and digital signature.
- **Status:** **Completed** — Real-time synchronization checks during guest check-in.

### 💰 Professional Folio Ledger & Invoicing
- **ID:** `guest_billing_20260331`
- **Goal:** Incidental charges posting, GST-compliant invoicing, checkout balance enforcement, and PDF generation.
- **Status:** **Completed** — Chronological monthly payment allocations and PDF GST slabs implemented.

---

## 4. Analytics & Integration (Completed / Integrated)

### 📈 Financial Analytics & Data Visualization
- **ID:** `financial_analytics_20260331`
- **Goal:** Real-time revenue charts and occupancy trends for the main dashboard.
- **Status:** **Completed** — Integrated natively into the unified `/dashboard`.

### 🔄 OTA Channel Manager Synchronization
- **ID:** `ota_sync_20260331`
- **Goal:** Inbound webhook architecture to handle external reservation synchronization.
- **Status:** **Completed** — Integrated using database triggers and local n8n flows.

---

## 5. Stability & Bug Fixes (Completed - July 2026)

### 🐛 Operational Stabilization & Ledger Fixes
- **ID:** `pms_stabilization_20260702`
- **Goal:** Address operational bugs around routing, ledger double-postings, group check-in compliance, co-living room search, and advance payment deletions.
- **Status:** **Completed** — Implemented:
  1. Middleware `redirect_to` tracking to prevent page refreshes from redirecting users away from active tabs.
  2. Double-click execution checks on folio payment/incidental postings and check-ins to prevent duplicate ledger records.
  3. Automatic propagation of ID and signature compliance validation to all rooms during group check-ins.
  4. Search input search bar enablement on the Co-Living / Monthly view to allow room number filtering.
  5. Virtual security deposit deletion server actions and UI triggers inside the Folio Modal.
  6. Complete redesign of the Monthly Co-Living Hub into a high-density, card-based bed-slot grid with occupancy filters ('All', 'With Vacancy', 'Fully Booked', 'Has Dues').

---

## 6. Deprecated & Removed Legacy Tracks

- **Fleet Command & "Kill Switch" (`fleet_command_20260331`):** **Removed** — Deprecated in favor of the role-free self-service model.
- **Stripe SaaS Subscription Billing (`saas_billing_20260331`):** **Removed** — Removed billing screen gating and trial expirations.
- **Staff Architect & Granular RBAC (`staff_architect_20260331`):** **Removed** — Replaced by standard flat user access to their own workspace.
- **Tier 2/3 Feature Parity (`tier_parity_20260331`):** **Integrated** — All capabilities natively consolidated into the unified PMS dashboard.
