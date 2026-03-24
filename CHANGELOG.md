# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2026-03-24

### Added
- **Property Status "Kill Switch":** Admins can now instantly suspend properties. Tier 2 and Tier 3 users belonging to suspended properties are intercepted by the Edge Middleware and redirected to a `Payment Required` page.
- **Front Desk Booking Modal:** Tier 3 staff can now create walk-in bookings through a new UI modal that filters for available rooms and captures guest details (including email).
- **n8n Automation Integration:** Configured an `n8n` Docker container attached to the Supabase network.
- **Postgres Webhooks:** Added a dynamic Supabase SQL Trigger (`pg_net`) that sends an HTTP POST request to n8n upon booking creation to fire a Welcome Email via Resend.
- **Database Seeding:** Established a robust `seed.sql` system containing a baseline Tier 1, Tier 2, and Tier 3 user, along with a demo property and rooms for instant deployment testing.
- **Dynamic Webhook Configuration:** Created an `app_settings` table to store the n8n webhook URL, allowing seamless transitions from local development to cloud production without rewriting SQL triggers.

### Fixed
- **Edge Middleware Activation:** Renamed `proxy.ts` to `middleware.ts` to ensure Next.js correctly executes route interception and Supabase session refreshing, fixing the "random logout" bugs.
- **Server Action Security:** Injected strict `supabase.auth.getUser()` session and role validation into the `registerProperty`, `addRoom`, `addStaff`, and `createBooking` server actions to secure the Service Role Key.
- **Profile Email Crash:** Added the missing `email` column to the `profiles` table via a database migration to prevent runtime crashes on the Owner Dashboard when rendering staff avatars.
- **Staff Role Constraint:** Updated the `profiles_role_check` Postgres constraint to properly accept the `'staff'` role during account provisioning.
