# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2026-03-24

### Added
- **Complete Guest Lifecycle Automation (n8n & Resend):**
  - **Smart Check-In:** Staff can now transition a Confirmed booking to "Checked In". A new Postgres trigger automatically sends the guest an email containing their Room Number and the property's WiFi credentials (new `wifi_network` and `wifi_password` columns added to properties).
  - **Guest Checkout:** Staff can now click "Check Out". The system automatically flags the physical room as "Dirty" for housekeeping and triggers an n8n webhook to send the guest a "Thank You" email with a review link.
- **Fleet Management Hard Delete:** Admins can now securely delete an entire property via a new 3-dots dropdown menu. The action natively wipes the Supabase Auth users (Owner and Staff) before cascade-deleting the property, rooms, and bookings.
- **Architecture Documentation:** Added a comprehensive `docs/ARCHITECTURE.md` file featuring a Mermaid.js flow diagram and "Feature Parity" explanations. Added `n8n-setup.md` for zero-configuration automation deployment.
- **Property Status "Kill Switch":** Admins can now instantly suspend properties. Tier 2 and Tier 3 users belonging to suspended properties are intercepted by the Edge Middleware and redirected to a `Payment Required` page.
- **Front Desk Booking Modal:** Tier 3 staff can now create walk-in bookings through a new UI modal that filters for available rooms and captures guest details (including email).
- **n8n Automation Integration:** Configured an `n8n` Docker container attached to the Supabase network.
- **Postgres Webhooks:** Added dynamic Supabase SQL Triggers (`pg_net`) that send HTTP POST requests to n8n upon booking creation, check-in, and check-out to fire emails via Resend.
- **Database Seeding:** Established a robust `seed.sql` system containing a baseline Tier 1, Tier 2, and Tier 3 user, along with a demo property and rooms for instant deployment testing.

### Fixed
- **Login Redirection Stability:** Fixed a severe `unhandledRejection` race condition on all Tier login pages (`/admin`, `/dashboard`, `/front-desk`) by explicitly syncing the server session with `router.refresh()` *before* invoking `router.push()`.
- **Local Auth Hashing (Invalid Credentials):** Bypassed an outdated `pgcrypto` hashing issue in the local database seed by creating a secure Node script (`wipe-and-recreate.mjs`) to wipe corrupted users and cleanly recreate them via the GoTrue Admin API.
- **Edge Middleware Activation:** Ensured `middleware.ts` correctly executes route interception and Supabase session refreshing, fixing the "random logout" bugs and properly protecting route groups.
- **Server Action Debugging:** Injected extensive backend logging into `registerProperty`, `addStaff`, and `checkOutGuest` to track exact SQL/Auth failure reasons during development.
- **Server Action Security:** Injected strict `supabase.auth.getUser()` session and role validation into the server actions to secure the Service Role Key.
- **Profile Email Crash:** Added the missing `email` column to the `profiles` table via a database migration to prevent runtime crashes on the Owner Dashboard when rendering staff avatars.
