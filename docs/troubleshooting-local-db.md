# Local Database Troubleshooting Guide

This guide details the common causes and solutions for the `"🚨 EMERGENCY TRUTH LOG: ZERO ROOMS FETCHED FOR PROPERTY!"` and `"property profile not found"` errors when setting up or resetting the local Supabase environment for this PMS project.

## Symptoms
*   The Next.js application crashes with a red overlay showing `"🚨 EMERGENCY TRUTH LOG: ZERO ROOMS FETCHED FOR PROPERTY!"`.
*   The dashboard sidebar displays "property profile not found".
*   Users are unable to see rooms, create rooms, or view properties even if they are an `admin` or `owner`.

## Root Causes

This issue is a cascading failure usually caused by a combination of the following four factors after a `supabase db reset`:

1.  **RLS Infinite Recursion Bug:** The Row Level Security (RLS) policies on `public.profiles`, `public.properties`, and `public.property_access` were originally written to query the `profiles` table to check if a user is an 'admin'. This causes an infinite loop (`infinite recursion detected in policy`), causing the database to silently fail and return 0 rows for all property and profile queries.
2.  **Missing Schema Columns:** The frontend Next.js code expects columns like `is_deleted` and `assigned_staff_id` on the `rooms` table, and `id_verified` on the `bookings` table. If these are missing from the local migrations, the database queries fail, returning `null` for `roomsRes.data`.
3.  **Missing Property Access:** When creating users directly via SQL or scripts, they are often not linked to a property in `public.property_access` or their `property_id` in `public.profiles` is null.
4.  **The "Zero Rooms" Fail-Safe:** The Next.js frontend has a hardcoded check: if `roomsRes.data.length === 0`, it assumes the `localStorage` property ID is corrupted (a "zombie ID") and throws the emergency error, halting the render.

## Immediate Solutions

If you encounter this issue, execute the following SQL commands via the local Supabase Studio (`http://127.0.0.1:54323/project/default/sql`) or via `psql`.

### 1. Fix RLS Infinite Recursion
Update the policies to check the JWT token directly instead of querying the `profiles` table.

```sql
-- Fix Profiles
DROP POLICY IF EXISTS "Admins can do everything on profiles" ON public.profiles;
CREATE POLICY "Admins can do everything on profiles" ON public.profiles FOR ALL 
USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin' OR auth.jwt() -> 'user_metadata' ->> 'role' = 'admin' OR current_setting('request.jwt.claims', true)::json->>'role' = 'admin');

-- Fix Properties
DROP POLICY IF EXISTS "Admins can do everything on properties" ON public.properties; 
CREATE POLICY "Admins can do everything on properties" ON public.properties FOR ALL 
USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin' OR auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- Fix Property Access
DROP POLICY IF EXISTS "Admins can do everything on property_access" ON public.property_access; 
CREATE POLICY "Admins can do everything on property_access" ON public.property_access FOR ALL 
USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin' OR auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- Fix Rooms
DROP POLICY IF EXISTS "Admins can do everything on rooms" ON public.rooms;
CREATE POLICY "Admins can do everything on rooms" ON public.rooms FOR ALL 
USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin' OR auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
```

### 2. Repair Missing Columns
Ensure the schema matches what the Next.js application expects. *(Note: This was permanently added to `supabase/migrations/20260415000001_repair_schema.sql`)*.

```sql
ALTER TABLE public.rooms 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS assigned_staff_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS cleaning_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_cleaned_at TIMESTAMPTZ;

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS id_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS id_photo_url TEXT,
ADD COLUMN IF NOT EXISTS signature_url TEXT;
```

### 3. Ensure User Has Property Access
If a user cannot see properties, ensure they are linked.

```sql
-- Replace with the specific user's email
WITH target_user AS (
    SELECT id FROM auth.users WHERE email = 'provider@pms.com'
)
-- Link to all properties
INSERT INTO public.property_access (user_id, property_id)
SELECT (SELECT id FROM target_user), id FROM public.properties
ON CONFLICT DO NOTHING;

-- Set a default property in their profile
UPDATE public.profiles 
SET property_id = (SELECT id FROM public.properties LIMIT 1)
WHERE email = 'provider@pms.com';
```

### 4. Bypass the "Zero Rooms" Fail-Safe
If a property is brand new and has no rooms, you MUST add at least one room to bypass the frontend crash.

```sql
-- Replace 'PROPERTY_UUID' with the ID of the empty property
INSERT INTO public.rooms (property_id, room_number, type, status) 
VALUES ('PROPERTY_UUID', '101', 'Standard', 'Available') 
ON CONFLICT DO NOTHING;
```

### 5. Clear Browser Cache (If stuck on a deleted property)
If the database was wiped but the browser remembers an old property ID, run `localStorage.removeItem('pms_active_property');` in the browser console and refresh.
