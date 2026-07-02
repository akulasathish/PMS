# Changelog

All notable changes to this project will be documented in this file.

## [Released] - 2026-07-02

### Added
- **Front Office Co-living Support:** Redesigned room cards for monthly co-living setups, introducing a tabbed bed selector to optimize screen real estate and improve visual clarity.
- **Folio & Ledger Upgrades:** Enabled full folio ledgers and payment posting directly for bookings in 'Confirmed' status.
- **Settings Drawer Enhancement:** Added a premium email verification card in the Settings drawer, prompting users to verify their email.
- **Onboarding Flow Enhancements:** Added graceful handling and user-facing notifications for existing email addresses in the signup form.
- **Accessibility Enhancements:** Resolved forms accessibility issues by strictly associating labels with their respective inputs.

### Fixed
- **Page Refresh Redirection:** Implemented `redirect_to` query parameter tracking in the middleware and login page to keep users on their active tabs (like housekeeping) after refreshes.
- **Double-Click Ledger Posting:** Added double-submission prevention checks at the handler level for payments, charges, and check-ins to prevent duplicate entries in database tables.
- **Group Check-In Compliance:** Programmed automatic propagation of guest compliance verification flags, ID photos, and signatures to all rooms in a group reservation.
- **Monthly Card Search:** Enabled the unified search bar on the Co-Living/Monthly page tab to allow receptionists to filter rooms by number.
- **Security Deposit Deletion:** Added support for deleting/clearing the advance payment (security deposit) directly from the professional folio ledger.
- **Folio PDF & Reconciliation:** Corrected the PDF invoicing to use the property's operational `business_date` and implemented a chronological monthly payment allocation method for central ledger reports.
- **Settings Drawers UX:** Fixed a JSX tag imbalance crash in the Settings/Subscription drawer layout.
- **Baking Key Fallbacks:** Added client-side fallbacks and logging to prevent application build failures when environment variables are not baked during Docker compilation.

## [Unreleased] - 2026-03-24

### Added
- **Tier 1 Owner Provisioning & Access Control:**
  - **Admin UI:** Created a new `/admin/owners` dashboard where Admins can provision new executives and link them to multiple properties simultaneously.
  - **Multi-Property Architecture:** Introduced the `property_access` join table, allowing a single Owner account to securely manage an unlimited fleet of properties.
  - **Owner Onboarding Automation:** Added an `on_owner_provisioned` Postgres trigger. When an Admin links an Owner to properties, an n8n webhook instantly fires an HTML "Welcome to the Fleet" email with their login portal and temporary security key.
- **Advanced Row Level Security (RLS):**
  - Completely revamped Supabase Postgres RLS policies. Replaced permissive "allow all" defaults with strict, non-recursive, role-based isolation.
  - Owners and Staff are now programmatically locked down at the database layer; they can only query or mutate rows (Properties, Rooms, Bookings, Profiles) where they have explicitly granted access in `property_access`.
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
