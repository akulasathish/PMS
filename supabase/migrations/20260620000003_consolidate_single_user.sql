-- 1-Tier Consolidate Single User Migration

-- 1. PROFILES policies clean up
DROP POLICY IF EXISTS "Users manage own profile" ON public.profiles;
DROP POLICY IF EXISTS "Owners view staff in their property" ON public.profiles;
DROP POLICY IF EXISTS "Admins manage profiles via JWT" ON public.profiles;

CREATE POLICY "Users manage own profile"
ON public.profiles
FOR ALL
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Select profile access"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- 2. PROPERTIES policies clean up
DROP POLICY IF EXISTS "Owners create properties" ON public.properties;
DROP POLICY IF EXISTS "Users view accessible properties" ON public.properties;
DROP POLICY IF EXISTS "Owners update accessible properties" ON public.properties;
DROP POLICY IF EXISTS "Owners delete accessible properties" ON public.properties;
DROP POLICY IF EXISTS "Staff view assigned properties" ON public.properties;
DROP POLICY IF EXISTS "Admins manage properties via JWT" ON public.properties;

CREATE POLICY "Users create properties"
ON public.properties
FOR INSERT
TO authenticated
WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Users view own properties"
ON public.properties
FOR SELECT
TO authenticated
USING (owner_user_id = auth.uid());

CREATE POLICY "Users update own properties"
ON public.properties
FOR UPDATE
TO authenticated
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Users delete own properties"
ON public.properties
FOR DELETE
TO authenticated
USING (owner_user_id = auth.uid());

-- 3. PROPERTY_ACCESS policies clean up
DROP POLICY IF EXISTS "Users view own property access" ON public.property_access;
DROP POLICY IF EXISTS "Owners insert own property access" ON public.property_access;
DROP POLICY IF EXISTS "Admins manage property access via JWT" ON public.property_access;

CREATE POLICY "Users manage own property access"
ON public.property_access
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 4. ROOMS policies clean up
DROP POLICY IF EXISTS "Owners manage rooms in their properties" ON public.rooms;
DROP POLICY IF EXISTS "Staff view rooms in their properties" ON public.rooms;
DROP POLICY IF EXISTS "Staff manage rooms in their properties" ON public.rooms;
DROP POLICY IF EXISTS "Admins manage rooms via JWT" ON public.rooms;

CREATE POLICY "Users manage rooms for own properties"
ON public.rooms
FOR ALL
TO authenticated
USING (
  property_id IN (
    SELECT id FROM public.properties WHERE owner_user_id = auth.uid()
  )
)
WITH CHECK (
  property_id IN (
    SELECT id FROM public.properties WHERE owner_user_id = auth.uid()
  )
);

-- 5. BOOKINGS policies clean up
DROP POLICY IF EXISTS "Owners manage bookings in their properties" ON public.bookings;
DROP POLICY IF EXISTS "Staff manage bookings in their properties" ON public.bookings;
DROP POLICY IF EXISTS "Admins manage bookings via JWT" ON public.bookings;

CREATE POLICY "Users manage bookings for own properties"
ON public.bookings
FOR ALL
TO authenticated
USING (
  property_id IN (
    SELECT id FROM public.properties WHERE owner_user_id = auth.uid()
  )
)
WITH CHECK (
  property_id IN (
    SELECT id FROM public.properties WHERE owner_user_id = auth.uid()
  )
);

-- 6. AUDIT_LOGS policies clean up
DROP POLICY IF EXISTS "Admins manage audit logs via JWT" ON public.audit_logs;
DROP POLICY IF EXISTS "Owners and staff view property audit logs" ON public.audit_logs;

CREATE POLICY "Users view property audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  property_id IN (
    SELECT id FROM public.properties WHERE owner_user_id = auth.uid()
  )
);

-- 7. INCIDENTAL_CHARGES, PAYMENTS, ROOM_BLOCKS policies clean up
DROP POLICY IF EXISTS "Owners and staff manage incidental charges" ON public.incidental_charges;
DROP POLICY IF EXISTS "Owners and staff manage payments" ON public.payments;
DROP POLICY IF EXISTS "Owners and staff manage room blocks" ON public.room_blocks;

CREATE POLICY "Users manage incidental charges"
ON public.incidental_charges
FOR ALL
TO authenticated
USING (
  property_id IN (
    SELECT id FROM public.properties WHERE owner_user_id = auth.uid()
  )
)
WITH CHECK (
  property_id IN (
    SELECT id FROM public.properties WHERE owner_user_id = auth.uid()
  )
);

CREATE POLICY "Users manage payments"
ON public.payments
FOR ALL
TO authenticated
USING (
  property_id IN (
    SELECT id FROM public.properties WHERE owner_user_id = auth.uid()
  )
)
WITH CHECK (
  property_id IN (
    SELECT id FROM public.properties WHERE owner_user_id = auth.uid()
  )
);

CREATE POLICY "Users manage room blocks"
ON public.room_blocks
FOR ALL
TO authenticated
USING (
  property_id IN (
    SELECT id FROM public.properties WHERE owner_user_id = auth.uid()
  )
)
WITH CHECK (
  property_id IN (
    SELECT id FROM public.properties WHERE owner_user_id = auth.uid()
  )
);

-- 8. Clean up obsolete roles functions
DROP FUNCTION IF EXISTS public.current_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.current_user_property_id() CASCADE;
DROP FUNCTION IF EXISTS public.user_has_property_access(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin_jwt() CASCADE;
DROP FUNCTION IF EXISTS public.is_staff_role() CASCADE;
