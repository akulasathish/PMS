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
- [x] **Authentication Flow:** Supabase auth implemented across tiers with specific login pages for each tier.
- [x] **Server Actions for Mutations:**
  - `registerProperty` (Creates property, provisions owner account, links profile).
  - `addRoom` (Adds specific rooms to a property's inventory).
  - `addStaff` (Provisions staff accounts and assigns them to a property).

## 3. Security Gaps

- **Critical: Inactive Edge Middleware:** The route protection logic is currently written in `src/proxy.ts`. Since Next.js only recognizes `src/middleware.ts` for Edge Middleware, the routing interception and JWT validation is completely inactive, meaning routes are not protected at the edge level.
- **High: Unprotected Server Actions:** The Server Actions (`property.ts`, `inventory.ts`, `staff.ts`) perform database mutations using the Supabase Service Role Key (`supabaseAdmin`), which bypasses Row Level Security (RLS). Currently, these actions do not verify the caller's session or role. A malicious actor could theoretically call these endpoints directly to create properties, rooms, or staff accounts.
- **Medium: Hardcoded Dummy Passwords:** `addStaff` and `registerProperty` generate random string passwords and return them in the response, bypassing proper secure email invitation workflows.

## 4. Next Implementation Steps

1. **Activate Middleware:** Rename `src/proxy.ts` to `src/middleware.ts` and ensure the `proxy` function is exported as `middleware` so Next.js actively protects the `/admin`, `/dashboard`, and `/front-desk` routes.
2. **Secure Server Actions:** Inject session validation (`supabase.auth.getUser()`) at the very top of each Server Action to verify that the requesting user is authenticated and holds the necessary role (`admin` or `owner`) before executing any operations with the Service Role Key.
3. **Transition to Transactional Logic:** 
   - Replace the dummy password generation with Supabase's native invite email flow (`supabase.auth.admin.inviteUserByEmail`).
   - Implement strict Row Level Security (RLS) policies in the Postgres database so `supabaseAdmin` usage can be reduced in favor of the authenticated user's standard Supabase client.
4. **Tape Chart & Booking Logic:** Begin implementing the transactional booking endpoints for Tier 3, mapping the available room inventory (`status = 'Available'`) to an interactive tape chart matrix.
