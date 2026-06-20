-- Migration: Restrict Admin RLS Policies for Fleet Commander
-- This migration hardens RLS policies to restrict the 'admin' role (Fleet Commander)
-- to property management only, removing access to individual property details (rooms, bookings)
-- and other user profiles.

-- Drop existing admin-related policies that grant too much access
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins and Owners can manage rooms in their properties" ON public.rooms;
DROP POLICY IF EXISTS "Admins and Owners can manage bookings in their properties" ON public.bookings;
-- The properties policy for admin is kept as it allows fleet-level property management.

-- New Policy for public.profiles: Admin can only manage their own profile
CREATE POLICY "Admins can manage their own profile only"
ON public.profiles
FOR ALL
USING (id = auth.uid() AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
WITH CHECK (id = auth.uid());

-- New Policy for public.rooms: Admin has no access
CREATE POLICY "Admins have no access to rooms"
ON public.rooms
FOR ALL
USING (FALSE)
WITH CHECK (FALSE);

-- New Policy for public.bookings: Admin has no access
CREATE POLICY "Admins have no access to bookings"
ON public.bookings
FOR ALL
USING (FALSE)
WITH CHECK (FALSE);

-- Re-create existing owner/front-desk policies that might have been dropped implicitly or need explicit re-creation
-- (Ensuring non-admin roles retain their intended access)

-- Policy for public.profiles (Users can view and update their own profile - should still exist)
-- This policy should be unaffected and still allow users to manage their own profiles regardless of role.
-- CREATE POLICY "Users can view and update their own profile"
-- ON public.profiles
-- FOR ALL
-- USING (id = auth.uid()); -- This policy should already exist from previous migrations

-- Policy for public.rooms (Owners/Front-desk access - ensure they still work)
DROP POLICY IF EXISTS "Front-desk can view rooms in properties they are assigned to" ON public.rooms;
CREATE POLICY "Front-desk can view rooms in properties they are assigned to"
ON public.rooms
FOR SELECT
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'front-desk' AND
  property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid())
);

-- Policy for public.bookings (Owners/Front-desk access - ensure they still work)
DROP POLICY IF EXISTS "Front-desk can manage bookings in properties they are assigned to" ON public.bookings;
CREATE POLICY "Front-desk can manage bookings in properties they are assigned to"
ON public.bookings
FOR ALL
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'front-desk' AND
  property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid())
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'front-desk' AND
  property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid())
);

-- Ensure the existing "Admins and Owners can manage rooms in their properties" policy
-- from 20260523000000_harden_rls_policies.sql is correctly handled for owners.
-- It was dropped to apply the 'admin' restriction, so re-add it only for owners if needed.
-- Or, modify the original policy if it's simpler.
-- Let's define a combined policy for owners on rooms and bookings.

DROP POLICY IF EXISTS "Owners can manage rooms in their properties" ON public.rooms;
CREATE POLICY "Owners can manage rooms in their properties"
ON public.rooms
FOR ALL
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner' AND
  property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid())
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner' AND
  property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Owners can manage bookings in their properties" ON public.bookings;
CREATE POLICY "Owners can manage bookings in their properties"
ON public.bookings
FOR ALL
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner' AND
  property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid())
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner' AND
  property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid())
);
