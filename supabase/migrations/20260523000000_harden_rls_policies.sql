-- Harden RLS Policies
-- Revoke existing permissive policies
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.properties;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.rooms;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.bookings;

-- Policy for public.properties
CREATE POLICY "Admins and Owners can manage their properties"
ON public.properties
FOR ALL
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' OR
  (SELECT property_id FROM public.profiles WHERE id = auth.uid()) = id
);

CREATE POLICY "Front-desk can view properties they are assigned to"
ON public.properties
FOR SELECT
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'front-desk' AND
  (SELECT property_id FROM public.profiles WHERE id = auth.uid()) = id
);

-- Policy for public.profiles
CREATE POLICY "Admins can manage all profiles"
ON public.profiles
FOR ALL
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Users can view and update their own profile"
ON public.profiles
FOR ALL
USING (id = auth.uid());

-- Policy for public.rooms
CREATE POLICY "Admins and Owners can manage rooms in their properties"
ON public.rooms
FOR ALL
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' OR
  (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner' AND
    property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Front-desk can view rooms in properties they are assigned to"
ON public.rooms
FOR SELECT
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'front-desk' AND
  property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid())
);

-- Policy for public.bookings
CREATE POLICY "Admins and Owners can manage bookings in their properties"
ON public.bookings
FOR ALL
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' OR
  (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner' AND
    property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Front-desk can manage bookings in properties they are assigned to"
ON public.bookings
FOR ALL
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'front-desk' AND
  property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid())
);
