# StaySync PMS: System Overview & Recent Changes

This document provides a single, unified reference containing everything about the StaySync Property Management System (PMS) website, including its architecture, core features, local development setup, deployment flow, and recent updates.

---

## 🏗️ Architecture: 1-Tier Unified Monolith
StaySync has evolved from a legacy multi-role 3-tier setup to a highly optimized **1-Tier Unified Monolithic Architecture**.

- **Frontend & Backend Unified:** Next.js (App Router) client pages leverage Next.js Server Components and Server Actions to directly communicate with the database and auth layer, eliminating the need for an intermediate API gateway.
- **Database & Auth (Supabase):** Built-in Row-Level Security (RLS) handles tenant data isolation securely. The database ensures that a user can only read or modify records belonging to their own property (`owner_user_id = auth.uid()`).
- **Real-Time Automations (n8n):** Postgres database triggers dispatch HTTP webhooks to a local/production `n8n` workflow engine to automatically send rich transactional emails (Confirmations, Check-ins, Checkouts) via the **Resend API**.
- **Containerized Serverless Deployment:** Deployed on **AWS ECS Fargate** with rolling updates and zero-downtime container replacement behind an Elastic Load Balancer (ALB).

---

## ⚡ Core Website Features

1. **Self-Service Onboarding:** Frictionless public signup (`/signup`) and setup wizard (`/dashboard/property-setup`) to register properties and configure room types instantly.
2. **Interactive Tape Chart (Availability Matrix):** Real-time grid displaying occupancy. Includes support for monthly co-living room cards with a tabbed bed selector.
3. **Front Office Terminal:** Tabbed dashboards for arrivals, departures, and in-house guests, walk-in overbooking prevention, and instant upgrades.
4. **Housekeeping Master Board:** Three-step quality loop (`Dirty` ➡️ `Clean` ➡️ `Inspected`) with occupied-room status updates and cleaning timers.
5. **Guest Compliance (Digital RegCard):** Magic link sent to guests for mobile Aadhar/passport image upload and digital signatures.
6. **Folio Billing Engine:** Incidental posting ( laundry, minibar, room service), checkout balance enforcement, and automated PDF invoicing with local GST slabs.

---

## 📂 Key Directory Map
- `/src/app/` — Next.js routing pages and Server Actions.
  - `/dashboard/front-office/` — Main reservation list, action drawers, and billing.
  - `/dashboard/housekeeping/` — Cleaning master board and cleaner view.
  - `/dashboard/inventory/` — Room configuration.
  - `/dashboard/property-setup/` — Post-signup wizard.
- `/src/components/` — Shared UI components (Tape Chart, RoomBlockModal, FolioModal).
- `/scripts/` — Database migration, testing, and administration utility scripts.
- `/supabase/migrations/` — Database schema files and RLS configurations.

---

## 🛠️ Local Development Setup
1. Run `npm install` to install dependencies.
2. Configure `.env.local` with the local Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_local_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_local_supabase_anon_key
   ```
3. Run `npm run dev` to start the local server on `http://localhost:3000`.

---

## 📈 Recent Changes Log (Up to July 2026)

### Added
- **Front Office Co-living Support:** Redesigned room cards for monthly co-living setups, introducing a tabbed bed selector to optimize screen real estate and improve visual clarity.
- **Folio & Ledger Upgrades:** Enabled full folio ledgers and payment posting directly for bookings in 'Confirmed' status.
- **Settings Drawer Enhancement:** Added a premium email verification card in the Settings drawer, prompting users to verify their email.
- **Onboarding Flow Enhancements:** Added graceful handling and user-facing notifications for existing email addresses in the signup form.
- **Accessibility Enhancements:** Resolved forms accessibility issues by strictly associating labels with their respective inputs.

### Fixed
- **Folio PDF & Reconciliation:** Corrected the PDF invoicing to use the property's operational `business_date` and implemented a chronological monthly payment allocation method for central ledger reports.
- **Settings Drawers UX:** Fixed a JSX tag imbalance crash in the Settings/Subscription drawer layout.
- **Baking Key Fallbacks:** Added client-side fallbacks and logging to prevent application build failures when environment variables are not baked during Docker compilation.
