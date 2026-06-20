-- Migration: Fix properties RLS select returning bug
-- This resolves the "new row violates row-level security policy for table properties" error
-- when inserting a property using select() or RETURNING due to STABLE snapshot visibility limits.

DROP POLICY IF EXISTS "Users view accessible properties" ON public.properties;

CREATE POLICY "Users view accessible properties"
ON public.properties
FOR SELECT
TO authenticated
USING (
  owner_user_id = auth.uid()
  OR public.user_has_property_access(id)
);
