# Architectural Transformation: Moving to 1-Tier Role-Free Self-Service PMS

This document outlines the successful architectural evolution of StaySync from a multi-role, hierarchical permissions SaaS platform to a unified, role-free, self-service Property Management System (PMS). 

---

## 1. Executive Summary
We have completely unified the application's user model into a single tier. There are no longer separate roles such as Owner, Staff, Admin, or Front-Desk, and there are no hierarchical permission grids. Every user who signs up via the website gains direct, full, self-service command of their own property workspace and all operational features.

---

## 2. Refactored User Model

| Feature | Legacy Hierarchical Model | New 1-Tier Model |
| :--- | :--- | :--- |
| **User Sign-up** | Multi-role invitation or manual Admin/Owner creation. | **Frictionless Public Self-Service Signup** |
| **Workspace Role** | Grids of roles (`owner`, `staff`, `front-desk`, etc.) | **Standard User Account** with complete autonomy |
| **Feature Access** | Blocked or limited by granular IAM permission maps. | **100% Unlocked Feature Suite** (Analytics, Front Office, Housekeeping, Inventory) |
| **Security/RLS** | Multi-level function checks & RBAC tokens. | **Simple Owner Isolation** (`owner_user_id = auth.uid()`) |

---

## 3. Technical Accomplishments

### 💾 Database Schema & Row-Level Security (RLS)
- **Role Elimination:** Removed all role-checking security definer functions (`current_user_role()`, `is_staff_role()`, `is_admin_jwt()`, `user_has_property_access()`) from the database.
- **Consolidated RLS Policies:** Applied flat RLS policies in a clean migration (`20260620000003_consolidate_single_user.sql`). Authenticated users have fully unrestricted capabilities to insert, update, and manage properties, rooms, and bookings where they are the owner/creator.
- **Clean Slate Seed:** Erased legacy demo users (`owner@demo.com`, `staff@demo.com`, `staysync@online.com`) from `supabase/seed.sql` for a clean local development experience.

### 🎛️ Application Codebase & Actions
- **Simplified auth.ts:** Self-service registration creates a standard user profile without hardcoded `'owner'` roles or complicated, nested JSON permission trees.
- **Role-Free Server Actions:** Refactored `booking.ts` and `inventory.ts` actions to verify user authentication rather than metadata roles.
- **Sidebar Navigation:** Completely removed the "Staff" management panel and corresponding sidebar routes to align with the 100% manual-onboarding-free design.
- **Clean Types & Gateways:** Simplified `UserProfile` in `src/lib/types.ts` and removed role gating in `src/app/login/page.tsx` and all dashboards.
