-- Migration: Owner Provisioning and RLS Security

-- 1. Create property_access table for many-to-many relationship
CREATE TABLE IF NOT EXISTS public.property_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, property_id)
);

-- 2. Enable RLS on property_access
ALTER TABLE public.property_access ENABLE ROW LEVEL SECURITY;

-- 3. Revoke permissive policies (Cleanup)
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.properties;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.rooms;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.bookings;

-- 4. Re-implement Secure RLS Policies

-- 4.1. Properties Policies
CREATE POLICY "Admins can do everything on properties" 
ON public.properties FOR ALL 
USING (auth.jwt() ->> 'role' = 'admin' OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Owners can view their assigned properties" 
ON public.properties FOR SELECT 
USING (
    id IN (SELECT property_id FROM public.property_access WHERE user_id = auth.uid())
    OR id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid())
);

-- 4.2. Property Access Policies
CREATE POLICY "Admins can do everything on property_access" 
ON public.property_access FOR ALL 
USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin' OR auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');

CREATE POLICY "Users can view their own access" 
ON public.property_access FOR SELECT 
USING (user_id = auth.uid());

-- 4.3. Rooms Policies
CREATE POLICY "Admins can do everything on rooms" 
ON public.rooms FOR ALL 
USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin' OR auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');

CREATE POLICY "Owners/Staff can see rooms of their properties" 
ON public.rooms FOR SELECT 
USING (
    property_id IN (SELECT property_id FROM public.property_access WHERE user_id = auth.uid())
    OR property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Owners can manage rooms of their properties" 
ON public.rooms FOR ALL 
USING (
    property_id IN (SELECT property_id FROM public.property_access WHERE user_id = auth.uid())
    OR property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid())
)
WITH CHECK (
    property_id IN (SELECT property_id FROM public.property_access WHERE user_id = auth.uid())
    OR property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid())
);

-- 4.4. Bookings Policies
CREATE POLICY "Admins can do everything on bookings" 
ON public.bookings FOR ALL 
USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin' OR auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');

CREATE POLICY "Owners/Staff can manage bookings of their properties" 
ON public.bookings FOR ALL 
USING (
    property_id IN (SELECT property_id FROM public.property_access WHERE user_id = auth.uid())
    OR property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid())
)
WITH CHECK (
    property_id IN (SELECT property_id FROM public.property_access WHERE user_id = auth.uid())
    OR property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid())
);

-- 4.5. Profiles Policies
CREATE POLICY "Admins can do everything on profiles" 
ON public.profiles FOR ALL 
USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin' OR auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');

CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (id = auth.uid());

-- 5. Trigger for n8n Owner Invite
CREATE OR REPLACE FUNCTION public.notify_owner_provisioned()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
    webhook_url TEXT;
    user_record RECORD;
    prop_names TEXT;
BEGIN
    -- Construct list of property names for the email
    SELECT string_agg(name, ', ') INTO prop_names 
    FROM public.properties 
    WHERE id IN (SELECT property_id FROM public.property_access WHERE user_id = NEW.user_id);

    -- Fetch user email
    SELECT email, full_name INTO user_record FROM public.profiles WHERE id = NEW.user_id;

    -- Fetch base n8n webhook URL
    SELECT value INTO webhook_url FROM public.app_settings WHERE key = 'n8n_webhook_url';
    webhook_url := replace(webhook_url, 'booking-notification', 'owner-invite');

    payload := jsonb_build_object(
        'user_id', NEW.user_id,
        'email', user_record.email,
        'full_name', user_record.full_name,
        'properties', prop_names,
        'action', 'owner_provisioned'
    );

    PERFORM net.http_post(
        url := webhook_url,
        body := payload,
        headers := '{"Content-Type": "application/json"}'::jsonb
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only trigger once per user assignment set (or just on first assignment)
DROP TRIGGER IF EXISTS on_owner_provisioned ON public.property_access;
CREATE TRIGGER on_owner_provisioned
AFTER INSERT ON public.property_access
FOR EACH ROW
EXECUTE FUNCTION public.notify_owner_provisioned();
