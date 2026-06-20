-- Fix self-service RLS: remove recursive profiles subqueries and allow owner onboarding.
-- Replaces tier-era policies from 20260328, 20260523, and 20260531.

-- ---------------------------------------------------------------------------
-- 1. Schema repairs for self-service property creation
-- ---------------------------------------------------------------------------
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT;

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS trial_ends_at;

-- ---------------------------------------------------------------------------
-- 2. SECURITY DEFINER helpers (avoid RLS recursion on profiles)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_user_property_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT property_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.user_has_property_access(check_property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.property_access
    WHERE user_id = auth.uid()
      AND property_id = check_property_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND property_id = check_property_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.properties
    WHERE id = check_property_id
      AND owner_user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_jwt()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff_role()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() IN (
    'front-desk',
    'staff',
    'Guest Journey',
    'Night Auditor',
    'Room Attendant',
    'Supervisor'
  );
$$;

REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_property_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.user_has_property_access(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin_jwt() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_staff_role() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_property_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_has_property_access(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_jwt() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_staff_role() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. PROFILES — drop all legacy policies, recreate
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Admins can do everything on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view and update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage their own profile only" ON public.profiles;

CREATE POLICY "Users manage own profile"
ON public.profiles
FOR ALL
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Owners view staff in their property"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  property_id IS NOT NULL
  AND public.current_user_role() = 'owner'
  AND public.user_has_property_access(property_id)
);

CREATE POLICY "Admins manage profiles via JWT"
ON public.profiles
FOR ALL
TO authenticated
USING (public.is_admin_jwt())
WITH CHECK (public.is_admin_jwt());

-- ---------------------------------------------------------------------------
-- 4. PROPERTIES
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.properties;
DROP POLICY IF EXISTS "Admins can do everything on properties" ON public.properties;
DROP POLICY IF EXISTS "Owners can view their assigned properties" ON public.properties;
DROP POLICY IF EXISTS "Admins and Owners can manage their properties" ON public.properties;
DROP POLICY IF EXISTS "Front-desk can view properties they are assigned to" ON public.properties;

CREATE POLICY "Owners create properties"
ON public.properties
FOR INSERT
TO authenticated
WITH CHECK (
  public.current_user_role() = 'owner'
  AND owner_user_id = auth.uid()
);

CREATE POLICY "Users view accessible properties"
ON public.properties
FOR SELECT
TO authenticated
USING (public.user_has_property_access(id));

CREATE POLICY "Owners update accessible properties"
ON public.properties
FOR UPDATE
TO authenticated
USING (
  public.current_user_role() = 'owner'
  AND public.user_has_property_access(id)
)
WITH CHECK (
  public.current_user_role() = 'owner'
  AND public.user_has_property_access(id)
);

CREATE POLICY "Owners delete accessible properties"
ON public.properties
FOR DELETE
TO authenticated
USING (
  public.current_user_role() = 'owner'
  AND public.user_has_property_access(id)
);

CREATE POLICY "Staff view assigned properties"
ON public.properties
FOR SELECT
TO authenticated
USING (
  public.is_staff_role()
  AND public.user_has_property_access(id)
);

CREATE POLICY "Admins manage properties via JWT"
ON public.properties
FOR ALL
TO authenticated
USING (public.is_admin_jwt())
WITH CHECK (public.is_admin_jwt());

-- ---------------------------------------------------------------------------
-- 5. PROPERTY_ACCESS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can do everything on property_access" ON public.property_access;
DROP POLICY IF EXISTS "Users can view their own access" ON public.property_access;

CREATE POLICY "Users view own property access"
ON public.property_access
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Owners insert own property access"
ON public.property_access
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.current_user_role() = 'owner'
);

CREATE POLICY "Admins manage property access via JWT"
ON public.property_access
FOR ALL
TO authenticated
USING (public.is_admin_jwt())
WITH CHECK (public.is_admin_jwt());

-- ---------------------------------------------------------------------------
-- 6. ROOMS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.rooms;
DROP POLICY IF EXISTS "Admins can do everything on rooms" ON public.rooms;
DROP POLICY IF EXISTS "Owners/Staff can see rooms of their properties" ON public.rooms;
DROP POLICY IF EXISTS "Owners can manage rooms of their properties" ON public.rooms;
DROP POLICY IF EXISTS "Admins and Owners can manage rooms in their properties" ON public.rooms;
DROP POLICY IF EXISTS "Front-desk can view rooms in properties they are assigned to" ON public.rooms;
DROP POLICY IF EXISTS "Admins have no access to rooms" ON public.rooms;
DROP POLICY IF EXISTS "Owners can manage rooms in their properties" ON public.rooms;

CREATE POLICY "Owners manage rooms in their properties"
ON public.rooms
FOR ALL
TO authenticated
USING (
  public.current_user_role() = 'owner'
  AND public.user_has_property_access(property_id)
)
WITH CHECK (
  public.current_user_role() = 'owner'
  AND public.user_has_property_access(property_id)
);

CREATE POLICY "Staff view rooms in their properties"
ON public.rooms
FOR SELECT
TO authenticated
USING (
  public.is_staff_role()
  AND public.user_has_property_access(property_id)
);

CREATE POLICY "Staff manage rooms in their properties"
ON public.rooms
FOR ALL
TO authenticated
USING (
  public.is_staff_role()
  AND public.user_has_property_access(property_id)
)
WITH CHECK (
  public.is_staff_role()
  AND public.user_has_property_access(property_id)
);

CREATE POLICY "Admins manage rooms via JWT"
ON public.rooms
FOR ALL
TO authenticated
USING (public.is_admin_jwt())
WITH CHECK (public.is_admin_jwt());

-- ---------------------------------------------------------------------------
-- 7. BOOKINGS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.bookings;
DROP POLICY IF EXISTS "Admins can do everything on bookings" ON public.bookings;
DROP POLICY IF EXISTS "Owners/Staff can manage bookings of their properties" ON public.bookings;
DROP POLICY IF EXISTS "Admins and Owners can manage bookings in their properties" ON public.bookings;
DROP POLICY IF EXISTS "Front-desk can view rooms in properties they are assigned to" ON public.bookings;
DROP POLICY IF EXISTS "Front-desk can manage bookings in properties they are assigned to" ON public.bookings;
DROP POLICY IF EXISTS "Admins have no access to bookings" ON public.bookings;
DROP POLICY IF EXISTS "Owners can manage bookings in their properties" ON public.bookings;

CREATE POLICY "Owners manage bookings in their properties"
ON public.bookings
FOR ALL
TO authenticated
USING (
  public.current_user_role() = 'owner'
  AND public.user_has_property_access(property_id)
)
WITH CHECK (
  public.current_user_role() = 'owner'
  AND public.user_has_property_access(property_id)
);

CREATE POLICY "Staff manage bookings in their properties"
ON public.bookings
FOR ALL
TO authenticated
USING (
  public.is_staff_role()
  AND public.user_has_property_access(property_id)
)
WITH CHECK (
  public.is_staff_role()
  AND public.user_has_property_access(property_id)
);

CREATE POLICY "Admins manage bookings via JWT"
ON public.bookings
FOR ALL
TO authenticated
USING (public.is_admin_jwt())
WITH CHECK (public.is_admin_jwt());

-- ---------------------------------------------------------------------------
-- 8. AUDIT_LOGS — fix recursive admin check
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can do everything on audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Owners/Staff can view logs of their properties" ON public.audit_logs;

CREATE POLICY "Admins manage audit logs via JWT"
ON public.audit_logs
FOR ALL
TO authenticated
USING (public.is_admin_jwt())
WITH CHECK (public.is_admin_jwt());

CREATE POLICY "Owners and staff view property audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.user_has_property_access(property_id));

-- ---------------------------------------------------------------------------
-- 9. FOLIO / PAYMENTS / INVENTORY — fix recursive property checks
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Owners/Staff can manage incidental_charges for their properties" ON public.incidental_charges;
CREATE POLICY "Owners and staff manage incidental charges"
ON public.incidental_charges
FOR ALL
TO authenticated
USING (public.user_has_property_access(property_id))
WITH CHECK (public.user_has_property_access(property_id));

DROP POLICY IF EXISTS "Owners/Staff can manage payments for their properties" ON public.payments;
CREATE POLICY "Owners and staff manage payments"
ON public.payments
FOR ALL
TO authenticated
USING (public.user_has_property_access(property_id))
WITH CHECK (public.user_has_property_access(property_id));

DROP POLICY IF EXISTS "Owners/Staff can manage room_blocks for their properties" ON public.room_blocks;
CREATE POLICY "Owners and staff manage room blocks"
ON public.room_blocks
FOR ALL
TO authenticated
USING (public.user_has_property_access(property_id))
WITH CHECK (public.user_has_property_access(property_id));
