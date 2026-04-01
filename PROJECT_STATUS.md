# Project Status: RE-PMS Engine 2026

## 1. Architecture Map

The project implements a strict 3-tier Role-Based Access Control (RBAC) architecture for the SaaS Property Management System.

```text
[ Next.js 16 App Router ] 
       │
       ├── Tier 1: Admin / Provider Level (Global Fleet Management)
       │    └── Route Group: `(tier1)`
       │    └── Paths: `/admin`, `/admin/login`
       │    └── Role: `admin`
       │
       ├── Tier 2: Owner / Executive Level (Property Management)
       │    └── Route Group: `(tier2)`
       │    └── Paths: `/dashboard`, `/dashboard/inventory`, `/dashboard/staff`, `/dashboard/login`
       │    └── Role: `owner`
       │
       └── Tier 3: Staff / Front-Desk Level (Operational Terminal)
            └── Route Group: `(tier3)`
            └── Paths: `/front-desk`, `/front-desk/login`
            └── Role: `staff` or `front-desk`
```

## 2. Completed Features

- [x] **Folder Structure & Routing:** Clean separation of concerns via Next.js Route Groups `(tier1)`, `(tier2)`, and `(tier3)`. No path conflicts observed.
- [x] **Tailwind v4 Integration:** Minimal and modern CSS configuration via `@import "tailwindcss"` and `@theme inline` in `src/app/globals.css`.
- [x] **Supabase Client Utilities:** Configured SSR clients in `src/lib/supabase/client.ts` and `src/lib/supabase/server.ts`.
- [x] **Authentication Flow:** Supabase auth implemented across tiers. Fixed severe `router.refresh()` race conditions that were causing `unhandledRejection` errors during login.
- [x] **Edge Middleware Protection:** Routes (`/admin`, `/dashboard`, `/front-desk`) are completely secured by the Next.js `middleware.ts` edge runtime, automatically ejecting unauthenticated users and blocking access if a property is "Suspended".
- [x] **Complete Guest Lifecycle Automation (n8n Integration):**
  - Configured Postgres Triggers (`pg_net`) to dispatch JSON payloads on table changes.
  - **Booking Creation:** Webhook fires an HTML Welcome Email via Resend.
  - **Smart Check-In:** Staff click "Check In" -> Room changes to Occupied -> Webhook fires an HTML Email sending the guest their Room Number and `wifi_password`.
  - **Guest Checkout:** Staff click "Check Out" -> Room changes to Dirty -> Webhook fires a "Thank You & Review" HTML Email via Resend.
- [x] **Tier 1 Owner Provisioning & Access Control:**
  - Configured `/admin/owners` dashboard for provisioning new executives.
  - Implemented the `property_access` join table for many-to-many property assignments.
  - Added an `on_owner_provisioned` Postgres trigger to send n8n "Welcome to the Fleet" emails.
- [x] **Advanced Row Level Security (RLS):**
  - Secured `properties`, `rooms`, `bookings`, and `profiles` tables.
  - Owners and Staff are now programmatically isolated at the database layer to only view/mutate data associated with their assigned properties.
- [x] **Server Actions for Mutations:**
  - `registerProperty` (Creates property, provisions owner account, links profile).
  - `provisionOwner` (Creates new executives and assigns them to multiple properties).
  - `addRoom` (Adds specific rooms to a property's inventory).
  - `addStaff` (Provisions staff accounts and assigns them to a property).
  - `deleteProperty` (Admin "Hard Delete" that strictly cascades auth deletion of owners/staff before wiping DB data).

## 3. Security Gaps

- **Low: Hardcoded Dummy Passwords:** `addStaff`, `provisionOwner`, and `registerProperty` currently generate random string passwords and return them in the frontend response. The user is forced to change this password on their first login via a secure UI blockade (`requires_password_change`), but bypassing this with Supabase's native invite email flow (`supabase.auth.admin.inviteUserByEmail`) would be more robust.

## 4. Next Implementation Steps

1. **Staff Architect (Enterprise IAM):**
   - Implement the granular **Action-Level Matrix** (e.g. Check-in vs Check-out).
   - Build **Reusable Role Templates** for Owners to save custom configurations.
2. **Housekeeping Evolution:**
   - Add the **"Inspect"** button for supervisors to move rooms from Clean ➡️ Ready.
   - Implement **Minibar Posting** and cleaning timers in the mobile view.
3. **Front Office Suite:**
   - Implement **Room Upgrades** (Live room swapping) and **Refund Folios**.
   - Build **Room Blocking** logic for maintenance/marriages/meetings.
   - Implement **Guest Notes** per booking.
4. **Transition to Transactional Auth Logic:** 
   - Replace the dummy password generation with Supabase's native invite email flow.
5. **Guest Compliance (Indian Market):**
   - Build the Digital RegCard with **Aadhar/ID upload** and e-signatures.
6. **Indian Financial Suite:**
   - Implement **GST-compliant invoicing** and **Razorpay UPI** dynamic QR codes.
7. **Financial Analytics:** 
   - Build out the Recharts visualization suite for revenue and occupancy trends.
