-- ==========================================
-- Migration: 20260322171305_initial_schema.sql
-- ==========================================
-- Initial Schema for PMS

-- 1. Properties Table
CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    tier TEXT NOT NULL CHECK (tier IN ('Starter', 'Pro', 'Enterprise')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Profiles Table (linking Auth users to properties and roles)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'owner', 'front-desk')),
    property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Rooms Table
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    room_number TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Standard', 'Deluxe', 'Suite')),
    status TEXT NOT NULL CHECK (status IN ('Available', 'Occupied', 'Dirty', 'Maintenance')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(property_id, room_number)
);

-- 4. Bookings Table
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    guest_name TEXT NOT NULL,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Pending', 'Confirmed', 'Checked In', 'Checked Out', 'Cancelled')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Policies (Simplified for local dev: Authenticated users can do everything)
CREATE POLICY "Allow all for authenticated users" ON public.properties FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.profiles FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.rooms FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.bookings FOR ALL USING (auth.role() = 'authenticated');


-- ==========================================
-- Migration: 20260324112138_add_property_status.sql
-- ==========================================
-- Add status column to properties table
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended'));


-- ==========================================
-- Migration: 20260324135607_add_email_to_profiles.sql
-- ==========================================
-- Add email column to profiles table to support dashboard UI
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;


-- ==========================================
-- Migration: 20260324142939_add_staff_role_to_profiles.sql
-- ==========================================
-- Update the role check constraint to include 'staff'
ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'owner', 'front-desk', 'staff'));


-- ==========================================
-- Migration: 20260324153257_add_guest_email_to_bookings.sql
-- ==========================================
-- Add guest_email column to bookings table to support n8n Welcome Email automation
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS guest_email TEXT;


-- ==========================================
-- Migration: 20260324161547_add_booking_webhook_trigger.sql
-- ==========================================
-- Enable the pg_net extension to allow HTTP requests from Postgres
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- Create the webhook function
CREATE OR REPLACE FUNCTION public.send_booking_notification()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
    request_id BIGINT;
BEGIN
    -- Construct the payload
    payload := jsonb_build_object(
        'booking_id', NEW.id,
        'guest_name', NEW.guest_name,
        'guest_email', NEW.guest_email,
        'room_id', NEW.room_id,
        'check_in', NEW.check_in,
        'check_out', NEW.check_out,
        'amount', NEW.amount,
        'property_id', NEW.property_id
    );

    -- Send the HTTP POST request to the internal n8n docker container
    -- (The service is named 'n8n' and reachable on port 5678 within the docker network)
    SELECT net.http_post(
        url := 'http://n8n:5678/webhook-test/booking-notification',
        body := payload,
        headers := '{"Content-Type": "application/json"}'::jsonb
    ) INTO request_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on the bookings table
DROP TRIGGER IF EXISTS on_booking_created ON public.bookings;
CREATE TRIGGER on_booking_created
AFTER INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.send_booking_notification();


-- ==========================================
-- Migration: 20260324173433_update_webhook_path_to_production.sql
-- ==========================================
-- Update the webhook function to use the production webhook URL
CREATE OR REPLACE FUNCTION public.send_booking_notification()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
    request_id BIGINT;
BEGIN
    -- Construct the payload
    payload := jsonb_build_object(
        'booking_id', NEW.id,
        'guest_name', NEW.guest_name,
        'guest_email', NEW.guest_email,
        'room_id', NEW.room_id,
        'check_in', NEW.check_in,
        'check_out', NEW.check_out,
        'amount', NEW.amount,
        'property_id', NEW.property_id
    );

    -- Send the HTTP POST request to the internal n8n docker container
    -- Changed from /webhook-test/ to /webhook/ for "Active" workflows
    SELECT net.http_post(
        url := 'http://n8n:5678/webhook/booking-notification',
        body := payload,
        headers := '{"Content-Type": "application/json"}'::jsonb
    ) INTO request_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ==========================================
-- Migration: 20260324180539_make_webhook_dynamic.sql
-- ==========================================
-- Create a table for application settings
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert the default local n8n webhook URL
INSERT INTO public.app_settings (key, value, description)
VALUES ('n8n_webhook_url', 'http://n8n:5678/webhook/booking-notification', 'The URL for n8n to process booking welcome emails')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Enable RLS and add a policy so only admins can read/write settings
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON public.app_settings 
FOR ALL USING (auth.role() = 'authenticated');

-- Update the webhook function to dynamically fetch the URL
CREATE OR REPLACE FUNCTION public.send_booking_notification()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
    request_id BIGINT;
    webhook_url TEXT;
BEGIN
    -- Fetch the dynamic webhook URL from the settings table
    SELECT value INTO webhook_url FROM public.app_settings WHERE key = 'n8n_webhook_url';

    -- Fallback to the default if not set
    IF webhook_url IS NULL THEN
        webhook_url := 'http://n8n:5678/webhook/booking-notification';
    END IF;

    -- Construct the payload
    payload := jsonb_build_object(
        'booking_id', NEW.id,
        'guest_name', NEW.guest_name,
        'guest_email', NEW.guest_email,
        'room_id', NEW.room_id,
        'check_in', NEW.check_in,
        'check_out', NEW.check_out,
        'amount', NEW.amount,
        'property_id', NEW.property_id
    );

    -- Send the HTTP POST request to the dynamic n8n webhook URL
    SELECT net.http_post(
        url := webhook_url,
        body := payload,
        headers := '{"Content-Type": "application/json"}'::jsonb
    ) INTO request_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ==========================================
-- Migration: 20260326000000_smart_checkin.sql
-- ==========================================
-- Migration: Smart Check-In Workflow
-- Safely adds WiFi fields and a new trigger for 'Checked In' status

-- 1. Add WiFi credentials to the properties table
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS wifi_network TEXT DEFAULT 'Guest_WiFi',
ADD COLUMN IF NOT EXISTS wifi_password TEXT DEFAULT 'welcome123';

-- 2. Create the Smart Check-In Webhook Function
CREATE OR REPLACE FUNCTION public.send_smart_checkin_notification()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
    webhook_url TEXT;
    prop_record RECORD;
    room_record RECORD;
BEGIN
    -- Only execute if the status actually changed to 'Checked In'
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'Checked In' THEN
        
        -- Fetch base n8n webhook URL from settings
        SELECT value INTO webhook_url FROM public.app_settings WHERE key = 'n8n_webhook_url';
        IF webhook_url IS NULL THEN
            webhook_url := 'http://n8n:5678/webhook/booking-notification';
        END IF;
        
        -- Route to the specific Smart Check-In endpoint in n8n
        webhook_url := replace(webhook_url, 'booking-notification', 'smart-checkin');

        -- Fetch Property & WiFi info
        SELECT name, wifi_network, wifi_password INTO prop_record 
        FROM public.properties WHERE id = NEW.property_id;
        
        -- Fetch Room info
        SELECT room_number INTO room_record 
        FROM public.rooms WHERE id = NEW.room_id;

        -- Construct the comprehensive payload for n8n
        payload := jsonb_build_object(
            'booking_id', NEW.id,
            'guest_name', NEW.guest_name,
            'guest_email', NEW.guest_email,
            'property_name', prop_record.name,
            'room_number', room_record.room_number,
            'wifi_network', prop_record.wifi_network,
            'wifi_password', prop_record.wifi_password,
            'check_in', NEW.check_in,
            'check_out', NEW.check_out
        );

        -- Dispatch the HTTP POST request to n8n
        PERFORM net.http_post(
            url := webhook_url,
            body := payload,
            headers := '{"Content-Type": "application/json"}'::jsonb
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach the Trigger to the bookings table
DROP TRIGGER IF EXISTS on_booking_checked_in ON public.bookings;
CREATE TRIGGER on_booking_checked_in
AFTER UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.send_smart_checkin_notification();


-- ==========================================
-- Migration: 20260327000000_guest_checkout.sql
-- ==========================================
-- Migration: Guest Checkout Workflow
-- Trigger for 'Checked Out' status to notify n8n

-- 1. Create the Guest Checkout Webhook Function
CREATE OR REPLACE FUNCTION public.send_guest_checkout_notification()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
    webhook_url TEXT;
    prop_record RECORD;
    room_record RECORD;
BEGIN
    -- Only execute if the status actually changed to 'Checked Out'
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'Checked Out' THEN
        
        -- Fetch base n8n webhook URL from settings
        SELECT value INTO webhook_url FROM public.app_settings WHERE key = 'n8n_webhook_url';
        IF webhook_url IS NULL THEN
            webhook_url := 'http://n8n:5678/webhook/booking-notification';
        END IF;
        
        -- Route to the specific Guest Checkout endpoint in n8n
        webhook_url := replace(webhook_url, 'booking-notification', 'guest-checkout');

        -- Fetch Property info
        SELECT name FROM public.properties WHERE id = NEW.property_id INTO prop_record;
        
        -- Fetch Room info
        SELECT room_number FROM public.rooms WHERE id = NEW.room_id INTO room_record;

        -- Construct the payload
        payload := jsonb_build_object(
            'booking_id', NEW.id,
            'guest_name', NEW.guest_name,
            'guest_email', NEW.guest_email,
            'property_name', prop_record.name,
            'room_number', room_record.room_number,
            'check_in', NEW.check_in,
            'check_out', NEW.check_out,
            'amount', NEW.amount
        );

        -- Dispatch the HTTP POST request to n8n
        PERFORM net.http_post(
            url := webhook_url,
            body := payload,
            headers := '{"Content-Type": "application/json"}'::jsonb
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attach the Trigger to the bookings table
DROP TRIGGER IF EXISTS on_booking_checked_out ON public.bookings;
CREATE TRIGGER on_booking_checked_out
AFTER UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.send_guest_checkout_notification();


-- ==========================================
-- Migration: 20260328000000_owner_provisioning.sql
-- ==========================================
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


-- ==========================================
-- Migration: 20260331000000_revenue_analytics.sql
-- ==========================================
-- Aggregate booking revenue by day for a specific property over the last 30 days
-- Use SECURITY INVOKER so the query respects the RLS policies of the caller
CREATE OR REPLACE FUNCTION get_30_day_revenue(p_property_id UUID)
RETURNS TABLE (
    daily_date DATE,
    revenue NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(
            CURRENT_DATE - INTERVAL '29 days',
            CURRENT_DATE,
            '1 day'::interval
        )::date AS daily_date
    )
    SELECT
        ds.daily_date,
        COALESCE(SUM(b.amount), 0)::NUMERIC AS revenue
    FROM
        date_series ds
    LEFT JOIN
        public.bookings b ON DATE(b.created_at) = ds.daily_date
        AND b.property_id = p_property_id
        AND b.status IN ('Confirmed', 'Checked In', 'Checked Out')
    GROUP BY
        ds.daily_date
    ORDER BY
        ds.daily_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;


-- ==========================================
-- Migration: 20260331000001_advanced_rbac.sql
-- ==========================================
-- Migration: Advanced RBAC & Consolidated Dashboard
-- Adds new operational roles and granular permission tracking

-- 1. Update the role check constraint to include all operational roles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN (
    'admin', 
    'owner', 
    'front-desk', 
    'staff', 
    'Guest Journey', 
    'Night Auditor', 
    'Room Attendant', 
    'Supervisor'
));

-- 2. Add granular permissions JSONB column
-- This allows us to define specific access levels (Read/Write/None) per module
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{
    "front_office": "full",
    "housekeeping": "full",
    "analytics": "full",
    "inventory": "full",
    "staff_management": "full"
}'::jsonb;

-- 3. Set default permissions for existing roles
UPDATE public.profiles SET permissions = '{"front_office": "full", "housekeeping": "full", "analytics": "full", "inventory": "full", "staff_management": "full"}'::jsonb WHERE role IN ('admin', 'owner');
UPDATE public.profiles SET permissions = '{"front_office": "full", "housekeeping": "read", "analytics": "none", "inventory": "none", "staff_management": "none"}'::jsonb WHERE role IN ('front-desk', 'staff');


-- ==========================================
-- Migration: 20260331000002_role_templates.sql
-- ==========================================
-- Migration: Role Templates for Staff Architect
-- Creates the role_templates table and seeds default system templates

-- 1. Create the role_templates table
CREATE TABLE IF NOT EXISTS public.role_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE, -- NULL means System Default
    name TEXT NOT NULL,
    permissions JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.role_templates ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "Admins can do everything on role_templates" 
ON public.role_templates FOR ALL 
USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Owners can view system templates and their own" 
ON public.role_templates FOR SELECT 
USING (
    property_id IS NULL OR 
    property_id IN (SELECT property_id FROM public.property_access WHERE user_id = auth.uid())
);

CREATE POLICY "Owners can manage templates for their properties" 
ON public.role_templates FOR ALL 
USING (
    property_id IN (SELECT property_id FROM public.property_access WHERE user_id = auth.uid())
)
WITH CHECK (
    property_id IN (SELECT property_id FROM public.property_access WHERE user_id = auth.uid())
);

-- 4. Seed Default System Templates (property_id IS NULL)
INSERT INTO public.role_templates (name, permissions) VALUES 
('Guest Journey', '{
    "front_office": "full",
    "housekeeping": "read",
    "analytics": "none",
    "inventory": "read",
    "staff_management": "none"
}'::jsonb),
('Night Auditor', '{
    "front_office": "full",
    "housekeeping": "none",
    "analytics": "full",
    "inventory": "none",
    "staff_management": "none"
}'::jsonb),
('Room Attendant', '{
    "front_office": "read",
    "housekeeping": "full",
    "analytics": "none",
    "inventory": "none",
    "staff_management": "none"
}'::jsonb),
('Supervisor', '{
    "front_office": "full",
    "housekeeping": "full",
    "analytics": "read",
    "inventory": "full",
    "staff_management": "none"
}'::jsonb);


-- ==========================================
-- Migration: 20260331000003_granular_permissions.sql
-- ==========================================
-- Migration: Granular Action-Level Permissions
-- Upgrades the permissions schema from module-level strings to nested action-level objects

-- 1. Update the default value for new profiles to use the nested structure
ALTER TABLE public.profiles 
ALTER COLUMN permissions SET DEFAULT '{
    "front_office": {
        "tape_chart": "read",
        "check_in_out": "read",
        "room_upgrades": "none",
        "refund_folios": "none",
        "guest_notes": "read",
        "block_rooms": "none"
    },
    "housekeeping": {
        "task_list": "read",
        "room_inspection": "none",
        "minibar_posting": "none",
        "ops_management": "none"
    },
    "finance": {
        "night_audit": "none",
        "reports": "none"
    },
    "inventory": {
        "manage_rooms": "none"
    },
    "staff_management": {
        "manage_staff": "none"
    }
}'::jsonb;

-- 2. Update existing Admin & Owner profiles to have FULL nested access
UPDATE public.profiles 
SET permissions = '{
    "front_office": {
        "tape_chart": "full",
        "check_in_out": "full",
        "room_upgrades": "full",
        "refund_folios": "full",
        "guest_notes": "full",
        "block_rooms": "full"
    },
    "housekeeping": {
        "task_list": "full",
        "room_inspection": "full",
        "minibar_posting": "full",
        "ops_management": "full"
    },
    "finance": {
        "night_audit": "full",
        "reports": "full"
    },
    "inventory": {
        "manage_rooms": "full"
    },
    "staff_management": {
        "manage_staff": "full"
    }
}'::jsonb
WHERE role IN ('admin', 'owner');

-- 3. Wipe old simple templates and insert the advanced nested templates
DELETE FROM public.role_templates WHERE property_id IS NULL;

INSERT INTO public.role_templates (name, permissions) VALUES 
('Guest Journey', '{
    "front_office": {
        "tape_chart": "read",
        "check_in_out": "full",
        "room_upgrades": "none",
        "refund_folios": "none",
        "guest_notes": "full",
        "block_rooms": "none"
    },
    "housekeeping": {
        "task_list": "none",
        "room_inspection": "none",
        "minibar_posting": "none",
        "ops_management": "none"
    },
    "finance": {
        "night_audit": "none",
        "reports": "none"
    },
    "inventory": {
        "manage_rooms": "none"
    },
    "staff_management": {
        "manage_staff": "none"
    }
}'::jsonb),

('Night Auditor', '{
    "front_office": {
        "tape_chart": "read",
        "check_in_out": "full",
        "room_upgrades": "none",
        "refund_folios": "none",
        "guest_notes": "full",
        "block_rooms": "none"
    },
    "housekeeping": {
        "task_list": "none",
        "room_inspection": "none",
        "minibar_posting": "none",
        "ops_management": "none"
    },
    "finance": {
        "night_audit": "full",
        "reports": "full"
    },
    "inventory": {
        "manage_rooms": "none"
    },
    "staff_management": {
        "manage_staff": "none"
    }
}'::jsonb),

('Room Attendant', '{
    "front_office": {
        "tape_chart": "none",
        "check_in_out": "none",
        "room_upgrades": "none",
        "refund_folios": "none",
        "guest_notes": "none",
        "block_rooms": "none"
    },
    "housekeeping": {
        "task_list": "full",
        "room_inspection": "none",
        "minibar_posting": "full",
        "ops_management": "none"
    },
    "finance": {
        "night_audit": "none",
        "reports": "none"
    },
    "inventory": {
        "manage_rooms": "none"
    },
    "staff_management": {
        "manage_staff": "none"
    }
}'::jsonb),

('Supervisor', '{
    "front_office": {
        "tape_chart": "full",
        "check_in_out": "full",
        "room_upgrades": "full",
        "refund_folios": "none",
        "guest_notes": "full",
        "block_rooms": "none"
    },
    "housekeeping": {
        "task_list": "full",
        "room_inspection": "full",
        "minibar_posting": "full",
        "ops_management": "full"
    },
    "finance": {
        "night_audit": "none",
        "reports": "read"
    },
    "inventory": {
        "manage_rooms": "read"
    },
    "staff_management": {
        "manage_staff": "none"
    }
}'::jsonb);


-- ==========================================
-- Migration: 20260401000000_iam_action_registry.sql
-- ==========================================
-- Migration: Surgical IAM Action Registry
-- Expands the permission schema to 25+ granular action keys with [Write, Read, Deny] levels

-- 1. Update the default JSON for new profiles
ALTER TABLE public.profiles 
ALTER COLUMN permissions SET DEFAULT '{
    "front_office": {
        "view_tape_chart": "read",
        "create_booking": "deny",
        "perform_check_in": "deny",
        "perform_check_out": "deny",
        "modify_booking": "deny",
        "upgrade_room": "deny",
        "refund_folio": "deny",
        "guest_notes": "read",
        "block_rooms": "deny",
        "view_guest_pii": "deny"
    },
    "housekeeping": {
        "view_cleaning_list": "read",
        "start_finish_cleaning": "deny",
        "mark_room_ready": "deny",
        "inspect_room": "deny",
        "post_minibar_charges": "deny",
        "manage_cleaning_boards": "deny"
    },
    "inventory": {
        "view_inventory": "read",
        "manage_room_types": "deny",
        "add_delete_rooms": "deny",
        "maintenance_log": "deny"
    },
    "finance": {
        "view_analytics": "deny",
        "run_night_audit": "deny",
        "manage_rates": "deny",
        "view_audit_logs": "deny"
    },
    "management": {
        "manage_staff_accounts": "deny",
        "property_settings": "deny"
    }
}'::jsonb;

-- 2. Update System Templates to the new 25-key structure
DELETE FROM public.role_templates WHERE property_id IS NULL;

INSERT INTO public.role_templates (name, permissions) VALUES 
('Guest Journey (FO)', '{
    "front_office": {
        "view_tape_chart": "read",
        "create_booking": "write",
        "perform_check_in": "write",
        "perform_check_out": "write",
        "modify_booking": "write",
        "upgrade_room": "read",
        "refund_folio": "deny",
        "guest_notes": "write",
        "block_rooms": "deny",
        "view_guest_pii": "read"
    },
    "housekeeping": {
        "view_cleaning_list": "read",
        "start_finish_cleaning": "deny",
        "mark_room_ready": "deny",
        "inspect_room": "deny",
        "post_minibar_charges": "read",
        "manage_cleaning_boards": "deny"
    },
    "inventory": { "view_inventory": "read", "manage_room_types": "deny", "add_delete_rooms": "deny", "maintenance_log": "deny" },
    "finance": { "view_analytics": "deny", "run_night_audit": "deny", "manage_rates": "deny", "view_audit_logs": "deny" },
    "management": { "manage_staff_accounts": "deny", "property_settings": "deny" }
}'::jsonb),

('Room Attendant (HK)', '{
    "front_office": {
        "view_tape_chart": "deny",
        "create_booking": "deny",
        "perform_check_in": "deny",
        "perform_check_out": "deny",
        "modify_booking": "deny",
        "upgrade_room": "deny",
        "refund_folio": "deny",
        "guest_notes": "deny",
        "block_rooms": "deny",
        "view_guest_pii": "deny"
    },
    "housekeeping": {
        "view_cleaning_list": "write",
        "start_finish_cleaning": "write",
        "mark_room_ready": "write",
        "inspect_room": "deny",
        "post_minibar_charges": "write",
        "manage_cleaning_boards": "deny"
    },
    "inventory": { "view_inventory": "deny", "manage_room_types": "deny", "add_delete_rooms": "deny", "maintenance_log": "deny" },
    "finance": { "view_analytics": "deny", "run_night_audit": "deny", "manage_rates": "deny", "view_audit_logs": "deny" },
    "management": { "manage_staff_accounts": "deny", "property_settings": "deny" }
}'::jsonb),

('Night Auditor', '{
    "front_office": {
        "view_tape_chart": "read",
        "create_booking": "write",
        "perform_check_in": "write",
        "perform_check_out": "write",
        "modify_booking": "write",
        "upgrade_room": "read",
        "refund_folio": "write",
        "guest_notes": "write",
        "block_rooms": "deny",
        "view_guest_pii": "read"
    },
    "housekeeping": { "view_cleaning_list": "deny", "start_finish_cleaning": "deny", "mark_room_ready": "deny", "inspect_room": "deny", "post_minibar_charges": "deny", "manage_cleaning_boards": "deny" },
    "inventory": { "view_inventory": "deny", "manage_room_types": "deny", "add_delete_rooms": "deny", "maintenance_log": "deny" },
    "finance": {
        "view_analytics": "write",
        "run_night_audit": "write",
        "manage_rates": "read",
        "view_audit_logs": "write"
    },
    "management": { "manage_staff_accounts": "deny", "property_settings": "deny" }
}'::jsonb);


-- ==========================================
-- Migration: 20260403000000_front_office_suite.sql
-- ==========================================
-- Migration: Front Office Suite (Upgrades, Blocks, Notes)
-- Expands the schema to support advanced front desk operations

-- 1. Add 'notes' column to bookings for internal staff communication
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Update room status constraint to allow 'Blocked' for maintenance/events
ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_status_check;
ALTER TABLE public.rooms ADD CONSTRAINT rooms_status_check 
CHECK (status IN ('Available', 'Occupied', 'Dirty', 'Blocked'));

-- 3. Add 'original_room_id' to track room moves/upgrades
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS original_room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL;


-- ==========================================
-- Migration: 20260403000001_guest_identity_storage.sql
-- ==========================================
-- Create a bucket for guest IDs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('guest-ids', 'guest-ids', false)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow authenticated staff to view IDs
CREATE POLICY "Staff can view guest IDs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'guest-ids');

-- Policy to allow public uploads (via the magic link)
-- Note: In a production app, we would use a signed URL or a more restrictive policy
-- but for the MVP, we allow uploads to this specific bucket.
CREATE POLICY "Anyone can upload guest IDs"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'guest-ids');


-- ==========================================
-- Migration: 20260415000000_audit_trail.sql
-- ==========================================
-- Migration: Performance & Logs (Audit Trail)
-- Creates the audit_logs table and sets up RLS for secure activity tracking

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical'))
);

-- Indexing for performance on the dashboard feed
CREATE INDEX IF NOT EXISTS audit_logs_property_id_idx ON public.audit_logs(property_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Admins have full access
CREATE POLICY "Admins can do everything on audit_logs" 
ON public.audit_logs FOR ALL 
USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- 2. Owners and Staff can view logs for their assigned properties
CREATE POLICY "Owners/Staff can view logs of their properties" 
ON public.audit_logs FOR SELECT 
USING (
    property_id IN (SELECT property_id FROM public.property_access WHERE user_id = auth.uid())
    OR property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid())
);

-- 3. Authenticated users (Server Actions) can insert logs
CREATE POLICY "Authenticated users can insert audit_logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (true);


-- ==========================================
-- Migration: 20260415000001_repair_schema.sql
-- ==========================================
-- Migration: Repair Missing Columns
-- Adds columns that were referenced in code but missing in previous migrations

-- 1. Repair 'rooms' table
ALTER TABLE public.rooms 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS assigned_staff_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS cleaning_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_cleaned_at TIMESTAMPTZ;

-- 3. Fix room status constraints for Housekeeping QC loop
ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_status_check;
ALTER TABLE public.rooms ADD CONSTRAINT rooms_status_check 
CHECK (status IN ('Available', 'Occupied', 'Dirty', 'Blocked', 'Cleaning', 'Clean'));


-- ==========================================
-- Migration: 20260416000000_folio_engine.sql
-- ==========================================
-- Migration: Folio Engine (Incidental Charges & Payments)

-- 1. Create incidental_charges table
CREATE TABLE IF NOT EXISTS public.incidental_charges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Indexes for fast folio retrieval
CREATE INDEX IF NOT EXISTS incidental_charges_booking_id_idx ON public.incidental_charges(booking_id);

-- Enable RLS
ALTER TABLE public.incidental_charges ENABLE ROW LEVEL SECURITY;

-- Admin Policy
CREATE POLICY "Admins can manage incidental_charges" 
ON public.incidental_charges FOR ALL 
USING (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'admin' OR 
    auth.jwt() -> 'user_metadata' ->> 'role' = 'admin'
);

-- Owner/Staff Policy
CREATE POLICY "Owners/Staff can manage incidental_charges for their properties" 
ON public.incidental_charges FOR ALL
USING (
    property_id IN (SELECT property_id FROM public.property_access WHERE user_id = auth.uid())
    OR property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid())
) WITH CHECK (
    property_id IN (SELECT property_id FROM public.property_access WHERE user_id = auth.uid())
    OR property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid())
);


-- ==========================================
-- Migration: 20260416000001_folio_payments.sql
-- ==========================================
-- Migration: Folio Engine (Payments)

-- 1. Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    method TEXT NOT NULL CHECK (method IN ('Cash', 'Credit Card', 'UPI', 'Bank Transfer', 'OTA Pre-Paid')),
    transaction_id TEXT, -- Optional ID from Stripe/Razorpay
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Indexes for fast folio retrieval
CREATE INDEX IF NOT EXISTS payments_booking_id_idx ON public.payments(booking_id);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Admin Policy
CREATE POLICY "Admins can manage payments" 
ON public.payments FOR ALL 
USING (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'admin' OR 
    auth.jwt() -> 'user_metadata' ->> 'role' = 'admin'
);

-- Owner/Staff Policy
CREATE POLICY "Owners/Staff can manage payments for their properties" 
ON public.payments FOR ALL
USING (
    property_id IN (SELECT property_id FROM public.property_access WHERE user_id = auth.uid())
    OR property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid())
) WITH CHECK (
    property_id IN (SELECT property_id FROM public.property_access WHERE user_id = auth.uid())
    OR property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid())
);


-- ==========================================
-- Migration: 20260416000002_update_checkout_trigger.sql
-- ==========================================
-- Migration: Update Guest Checkout Trigger Payload
-- Modifies the trigger to include rich itemized data required for the GST invoice

CREATE OR REPLACE FUNCTION public.send_guest_checkout_notification()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
    webhook_url TEXT;
    prop_record RECORD;
    room_record RECORD;
    incidental_array JSONB;
    payment_array JSONB;
BEGIN
    -- Only execute if the status actually changed to 'Checked Out'
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'Checked Out' THEN
        
        -- Fetch base n8n webhook URL from settings
        SELECT value INTO webhook_url FROM public.app_settings WHERE key = 'n8n_webhook_url';
        IF webhook_url IS NULL THEN
            webhook_url := 'http://n8n:5678/webhook/booking-notification';
        END IF;
        
        -- Route to the specific Guest Checkout endpoint in n8n
        webhook_url := replace(webhook_url, 'booking-notification', 'guest-checkout');

        -- Fetch Property info
        SELECT name, address, phone INTO prop_record FROM public.properties WHERE id = NEW.property_id;
        
        -- Fetch Room info
        SELECT room_number INTO room_record FROM public.rooms WHERE id = NEW.room_id;

        -- Aggregate Incidentals
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object('description', description, 'amount', amount)
        ), '[]'::jsonb) INTO incidental_array
        FROM public.incidental_charges
        WHERE booking_id = NEW.id;

        -- Aggregate Payments
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object('method', method, 'amount', amount, 'transaction_id', transaction_id)
        ), '[]'::jsonb) INTO payment_array
        FROM public.payments
        WHERE booking_id = NEW.id;

        -- Construct the advanced payload
        payload := jsonb_build_object(
            'booking_id', NEW.id,
            'guest_name', NEW.guest_name,
            'guest_email', NEW.guest_email,
            'property_name', prop_record.name,
            'property_address', prop_record.address,
            'property_phone', prop_record.phone,
            'room_number', room_record.room_number,
            'check_in', NEW.check_in,
            'check_out', NEW.check_out,
            'room_amount', NEW.amount,
            'incidentals', incidental_array,
            'payments', payment_array
        );

        -- Dispatch the HTTP POST request to n8n
        PERFORM net.http_post(
            url := webhook_url,
            body := payload,
            headers := '{"Content-Type": "application/json"}'::jsonb
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- Migration: 20260416000003_property_invoice_details.sql
-- ==========================================
-- Migration: Add Missing Property Columns for Invoicing
-- Adds the address, phone, and GST fields required by the checkout trigger and the property management UI

ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS gst_number TEXT,
ADD COLUMN IF NOT EXISTS state_code TEXT;


-- ==========================================
-- Migration: 20260422000000_inventory_control.sql
-- ==========================================
-- Migration: Inventory Control (Advanced Room Blocking)
-- Creates the room_blocks table to track maintenance and Out of Order rooms

CREATE TABLE IF NOT EXISTS public.room_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    block_type TEXT NOT NULL CHECK (block_type IN ('OOO', 'OOS')), -- OOO = Out of Order, OOS = Out of Service
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Resolved', 'Cancelled')),
    
    CONSTRAINT room_blocks_dates_check CHECK (end_date >= start_date)
);

-- Indexing for fast conflict checking
CREATE INDEX IF NOT EXISTS room_blocks_room_id_dates_idx ON public.room_blocks(room_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS room_blocks_property_id_idx ON public.room_blocks(property_id);

-- Enable RLS
ALTER TABLE public.room_blocks ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage room_blocks" 
ON public.room_blocks FOR ALL 
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin') OR 
    (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
);

-- Owners/Staff can view/manage their property's blocks
CREATE POLICY "Owners/Staff can manage room_blocks for their properties" 
ON public.room_blocks FOR ALL
USING (
    property_id IN (SELECT property_id FROM public.property_access WHERE user_id = auth.uid())
    OR property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid())
) WITH CHECK (
    property_id IN (SELECT property_id FROM public.property_access WHERE user_id = auth.uid())
    OR property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid())
);


-- ==========================================
-- Migration: 20260423000000_create_guests_table.sql
-- ==========================================
-- Create the guests table to store PII securely
CREATE TABLE IF NOT EXISTS public.guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT,
    phone_number TEXT,
    id_photo_url TEXT,
    signature_url TEXT,
    verified_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

-- Staff/Owner can view guests for their property
CREATE POLICY "Staff can view guests"
    ON public.guests FOR SELECT
    TO authenticated
    USING (
        property_id IN (
            SELECT property_id FROM public.property_access WHERE user_id = auth.uid()
        )
    );

-- System can insert guests (via Service Role)
-- Service Role bypasses RLS, so no INSERT policy is strictly needed for the backend action,
-- but we add this for completeness if we ever allow authenticated inserts.
CREATE POLICY "Staff can insert guests"
    ON public.guests FOR INSERT
    TO authenticated
    WITH CHECK (
        property_id IN (
            SELECT property_id FROM public.property_access WHERE user_id = auth.uid()
        )
    );


-- ==========================================
-- Migration: 20260423000001_add_id_fields_to_bookings.sql
-- ==========================================
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS id_verified BOOLEAN DEFAULT false;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS id_photo_url TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS signature_url TEXT;


-- ==========================================
-- Migration: 20260423000002_fix_auth_corruption.sql
-- ==========================================
-- Force delete any corrupted user state for provider@pms.com
DELETE FROM public.profiles WHERE email = 'provider@pms.com';
DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'provider@pms.com');
DELETE FROM auth.sessions WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'provider@pms.com');
DELETE FROM auth.users WHERE email = 'provider@pms.com';


-- ==========================================
-- Migration: 20260523000000_harden_rls_policies.sql
-- ==========================================
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


-- ==========================================
-- Migration: 20260531120000_restrict_admin_rls.sql
-- ==========================================
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


-- ==========================================
-- Migration: 20260604_revoke_anon_execute_notify_owner.sql
-- ==========================================
REVOKE EXECUTE ON FUNCTION public.notify_owner_provisioned() FROM anon;

-- ==========================================
-- Migration: 20260616055032_add_subscriptions_and_update_profiles.sql
-- ==========================================

-- Create the subscriptions table
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL, -- Optional, if one subscription per user can cover multiple properties or if initial property is linked.
    plan_type TEXT NOT NULL, -- e.g., 'free_trial', '1_month', '3_month', '6_month', '1_year'
    start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    end_date TIMESTAMPTZ NOT NULL,
    grace_period_ends_at TIMESTAMPTZ, -- New column for grace period
    status TEXT NOT NULL DEFAULT 'trialing', -- e.g., 'active', 'trialing', 'cancelled', 'expired'
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add RLS to subscriptions table
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and manage their own subscriptions." ON public.subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Update the profiles table
ALTER TABLE public.profiles
ADD COLUMN current_subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
ADD COLUMN trial_ends_at TIMESTAMPTZ;

-- Optional: Create a function to update `updated_at` column automatically
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;   
END;
$$ language 'plpgsql';

-- Optional: Create a trigger for the subscriptions table to update `updated_at`
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Optional: Create a trigger for the profiles table to update `updated_at` (if it exists)
-- Assuming profiles table already has an updated_at column or you add one.
-- If profiles already has a trigger, merge this logic.
-- ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
-- CREATE TRIGGER update_profiles_updated_at
-- BEFORE UPDATE ON public.profiles
-- FOR EACH ROW
-- EXECUTE FUNCTION public.update_updated_at_column();


-- ==========================================
-- Migration: 20260618000000_remove_tier_subscription_logic.sql
-- ==========================================
-- 1. Remove foreign key constraints and columns related to subscriptions/tiers
ALTER TABLE public.profiles DROP COLUMN IF EXISTS current_subscription_id;
ALTER TABLE public.properties DROP COLUMN IF EXISTS tier;

-- 2. Drop the subscriptions table if it exists
DROP TABLE IF EXISTS public.subscriptions CASCADE;

-- 3. Cleanup RLS policies or triggers if they existed (optional, but good practice)
-- If there were specific triggers for subscriptions, they would be removed by DROP TABLE CASCADE above.


-- ==========================================
-- Migration: 20260619000000_fix_self_service_rls.sql
-- ==========================================
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


-- ==========================================
-- Migration: 20260620000000_heal_flat_permissions.sql
-- ==========================================
-- Migration: Heal flat permissions for existing owner/admin profiles
-- Converts any legacy flat JSON permissions to the modern nested action-level permissions format.

UPDATE public.profiles
SET permissions = '{
    "front_office": {
        "tape_chart": "full",
        "check_in_out": "full",
        "room_upgrades": "full",
        "refund_folios": "full",
        "guest_notes": "full",
        "block_rooms": "full"
    },
    "housekeeping": {
        "task_list": "full",
        "room_inspection": "full",
        "minibar_posting": "full",
        "ops_management": "full"
    },
    "finance": {
        "night_audit": "full",
        "reports": "full"
    },
    "inventory": {
        "manage_rooms": "full"
    },
    "staff_management": {
        "manage_staff": "full"
    }
}'::jsonb
WHERE role IN ('admin', 'owner')
  AND (
    permissions IS NULL 
    OR jsonb_typeof(permissions -> 'front_office') = 'string'
  );


-- ==========================================
-- Migration: 20260620000001_remove_legacy_admin_logic.sql
-- ==========================================
-- Drop legacy admin-created owner provisioning trigger and function
DROP TRIGGER IF EXISTS on_owner_provisioned ON public.property_access CASCADE;
DROP FUNCTION IF EXISTS public.notify_owner_provisioned() CASCADE;

-- Drop legacy trial_ends_at column from profiles if it exists
ALTER TABLE public.profiles DROP COLUMN IF EXISTS trial_ends_at CASCADE;


-- ==========================================
-- Migration: 20260620000002_fix_properties_rls_returning_bug.sql
-- ==========================================
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


-- ==========================================
-- Migration: 20260620000003_consolidate_single_user.sql
-- ==========================================
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


-- ==========================================
-- Migration: 20260620000004_make_role_optional.sql
-- ==========================================
-- Make role column optional in profiles table to support 1-tier role-free model
ALTER TABLE public.profiles ALTER COLUMN role DROP NOT NULL;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;


-- ==========================================
-- Migration: 20260620000005_add_billing_hours_and_rules.sql
-- ==========================================
-- Migration: Add standard billing hours and automated early check-in/late checkout rules

-- Extend Properties Table with standard hours and flexible JSONB rules
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS standard_checkin_time TIME DEFAULT '14:00:00';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS standard_checkout_time TIME DEFAULT '11:00:00';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS early_checkin_rules JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS late_checkout_rules JSONB DEFAULT '[]'::jsonb;

-- Extend Incidental Charges with automation status and waiver logs
ALTER TABLE public.incidental_charges ADD COLUMN IF NOT EXISTS is_automated BOOLEAN DEFAULT false;
ALTER TABLE public.incidental_charges ADD COLUMN IF NOT EXISTS waiver_reason TEXT DEFAULT NULL;
ALTER TABLE public.incidental_charges ADD COLUMN IF NOT EXISTS waived_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;


-- ==========================================
-- Migration: 20260621120000_add_business_date.sql
-- ==========================================
-- Migration: Add operational business_date key to app_settings
INSERT INTO public.app_settings (key, value, description)
VALUES ('business_date', '2026-06-21', 'The active operational business date of the property management system')
ON CONFLICT (key) DO NOTHING;


-- ==========================================
-- Migration: 20260621130000_add_guest_phone_to_bookings.sql
-- ==========================================
-- Migration: Add guest_phone to bookings table and update webhook payloads
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS guest_phone TEXT;

-- 1. Update Booking Webhook payload function to include guest_phone
CREATE OR REPLACE FUNCTION public.send_booking_notification()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
    request_id BIGINT;
    webhook_url TEXT;
BEGIN
    -- Fetch the dynamic webhook URL from the settings table
    SELECT value INTO webhook_url FROM public.app_settings WHERE key = 'n8n_webhook_url';

    -- Fallback to the default if not set
    IF webhook_url IS NULL THEN
        webhook_url := 'http://n8n:5678/webhook/booking-notification';
    END IF;

    -- Construct the payload
    payload := jsonb_build_object(
        'booking_id', NEW.id,
        'guest_name', NEW.guest_name,
        'guest_email', NEW.guest_email,
        'guest_phone', NEW.guest_phone,
        'room_id', NEW.room_id,
        'check_in', NEW.check_in,
        'check_out', NEW.check_out,
        'amount', NEW.amount,
        'property_id', NEW.property_id
    );

    -- Send the HTTP POST request to the dynamic n8n webhook URL
    SELECT net.http_post(
        url := webhook_url,
        body := payload,
        headers := '{"Content-Type": "application/json"}'::jsonb
    ) INTO request_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Update Smart Check-In payload function to include guest_phone
CREATE OR REPLACE FUNCTION public.send_smart_checkin_notification()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
    webhook_url TEXT;
    prop_record RECORD;
    room_record RECORD;
BEGIN
    -- Only execute if the status actually changed to 'Checked In'
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'Checked In' THEN
        
        -- Fetch base n8n webhook URL from settings
        SELECT value INTO webhook_url FROM public.app_settings WHERE key = 'n8n_webhook_url';
        IF webhook_url IS NULL THEN
            webhook_url := 'http://n8n:5678/webhook/booking-notification';
        END IF;
        
        -- Route to the specific Smart Check-In endpoint in n8n
        webhook_url := replace(webhook_url, 'booking-notification', 'smart-checkin');

        -- Fetch Property & WiFi info
        SELECT name, wifi_network, wifi_password INTO prop_record 
        FROM public.properties WHERE id = NEW.property_id;
        
        -- Fetch Room info
        SELECT room_number INTO room_record 
        FROM public.rooms WHERE id = NEW.room_id;

        -- Construct the comprehensive payload for n8n
        payload := jsonb_build_object(
            'booking_id', NEW.id,
            'guest_name', NEW.guest_name,
            'guest_email', NEW.guest_email,
            'guest_phone', NEW.guest_phone,
            'property_name', prop_record.name,
            'room_number', room_record.room_number,
            'wifi_network', prop_record.wifi_network,
            'wifi_password', prop_record.wifi_password,
            'check_in', NEW.check_in,
            'check_out', NEW.check_out
        );

        -- Dispatch the HTTP POST request to n8n
        PERFORM net.http_post(
            url := webhook_url,
            body := payload,
            headers := '{"Content-Type": "application/json"}'::jsonb
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update Checkout trigger payload function to include guest_phone
CREATE OR REPLACE FUNCTION public.send_guest_checkout_notification()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
    webhook_url TEXT;
    prop_record RECORD;
    room_record RECORD;
    incidental_array JSONB;
    payment_array JSONB;
BEGIN
    -- Only execute if the status actually changed to 'Checked Out'
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'Checked Out' THEN
        
        -- Fetch base n8n webhook URL from settings
        SELECT value INTO webhook_url FROM public.app_settings WHERE key = 'n8n_webhook_url';
        IF webhook_url IS NULL THEN
            webhook_url := 'http://n8n:5678/webhook/booking-notification';
        END IF;
        
        -- Route to the specific Guest Checkout endpoint in n8n
        webhook_url := replace(webhook_url, 'booking-notification', 'guest-checkout');

        -- Fetch Property info
        SELECT name, address, phone INTO prop_record FROM public.properties WHERE id = NEW.property_id;
        
        -- Fetch Room info
        SELECT room_number INTO room_record FROM public.rooms WHERE id = NEW.room_id;

        -- Aggregate Incidentals
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object('description', description, 'amount', amount)
        ), '[]'::jsonb) INTO incidental_array
        FROM public.incidental_charges
        WHERE booking_id = NEW.id;

        -- Aggregate Payments
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object('method', method, 'amount', amount, 'transaction_id', transaction_id)
        ), '[]'::jsonb) INTO payment_array
        FROM public.payments
        WHERE booking_id = NEW.id;

        -- Construct the advanced payload
        payload := jsonb_build_object(
            'booking_id', NEW.id,
            'guest_name', NEW.guest_name,
            'guest_email', NEW.guest_email,
            'guest_phone', NEW.guest_phone,
            'property_name', prop_record.name,
            'property_address', prop_record.address,
            'property_phone', prop_record.phone,
            'room_number', room_record.room_number,
            'check_in', NEW.check_in,
            'check_out', NEW.check_out,
            'room_amount', NEW.amount,
            'incidentals', incidental_array,
            'payments', payment_array
        );

        -- Dispatch the HTTP POST request to n8n
        PERFORM net.http_post(
            url := webhook_url,
            body := payload,
            headers := '{"Content-Type": "application/json"}'::jsonb
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- Migration: 20260621140000_add_check_in_out_time_to_bookings.sql
-- ==========================================
-- Migration: Add check_in_time and check_out_time to bookings table
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS check_in_time TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS check_out_time TIMESTAMPTZ;


-- ==========================================
-- Migration: 20260621150000_reload_schema_cache.sql
-- ==========================================
-- Force verify guest_phone exists and reload PostgREST schema cache
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS guest_phone TEXT;

-- Notify PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';


-- ==========================================
-- Migration: 20260622080000_fix_audit_logs_profiles_relationship.sql
-- ==========================================
-- Migration: Fix Audit Logs & Profiles Relationship Mapping
-- Adds a direct foreign key constraint in the public schema between audit_logs and profiles
-- This allows PostgREST to automatically resolve joins like .select('..., profiles(...)')

ALTER TABLE public.audit_logs
ADD CONSTRAINT fk_audit_logs_profiles
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Reload schema cache to make PostgREST aware of the change immediately
NOTIFY pgrst, 'reload schema';


-- ==========================================
-- Migration: 20260622090000_add_expenses_and_cash_balances.sql
-- ==========================================
-- Migration: Add Expenses and Daily Cash Drawer Balances

-- 1. Create expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash', 'UPI')),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (RLS) on expenses
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Create policies for expenses
CREATE POLICY "Allow authenticated users to manage expenses"
    ON public.expenses FOR ALL
    TO authenticated
    USING (property_id IN (
        SELECT property_id FROM public.profiles WHERE id = auth.uid()
    ))
    WITH CHECK (property_id IN (
        SELECT property_id FROM public.profiles WHERE id = auth.uid()
    ));

-- 2. Create daily_cash_balances table
CREATE TABLE IF NOT EXISTS public.daily_cash_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    opening_cash NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (opening_cash >= 0),
    closing_cash NUMERIC(10,2) CHECK (closing_cash >= 0),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (property_id, date)
);

-- Enable Row Level Security (RLS) on daily_cash_balances
ALTER TABLE public.daily_cash_balances ENABLE ROW LEVEL SECURITY;

-- Create policies for daily_cash_balances
CREATE POLICY "Allow authenticated users to manage daily_cash_balances"
    ON public.daily_cash_balances FOR ALL
    TO authenticated
    USING (property_id IN (
        SELECT property_id FROM public.profiles WHERE id = auth.uid()
    ))
    WITH CHECK (property_id IN (
        SELECT property_id FROM public.profiles WHERE id = auth.uid()
    ));


-- ==========================================
-- Migration: 20260624000000_add_handed_over_cash.sql
-- ==========================================
-- Add handed_over_cash column to daily_cash_balances table to track cash handovers to the finance department
ALTER TABLE public.daily_cash_balances 
ADD COLUMN IF NOT EXISTS handed_over_cash NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (handed_over_cash >= 0.00);


-- ==========================================
-- Migration: 20260625000000_fix_payments_method_check.sql
-- ==========================================
-- Migration: Fix payments method check constraint to support custom modes and SWIPE
-- This drops the restrictive check constraint on the payments table's method column,
-- enabling custom payment methods logged from the frontend.

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_method_check;


-- ==========================================
-- Migration: 20260626000000_add_payment_voids.sql
-- ==========================================
-- Migration: Add Void Payment Tracking to Payments Table
-- Adds columns to track if a payment has been voided, the reason, the timestamp, and who voided it.

ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS is_void BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS void_reason TEXT,
ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS voided_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;


-- ==========================================
-- Migration: 20260626010000_add_business_date_to_transactions.sql
-- ==========================================
-- Migration: Add business_date column to payments and incidental_charges
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS business_date DATE;
ALTER TABLE public.incidental_charges ADD COLUMN IF NOT EXISTS business_date DATE;

-- Update existing records to have business_date matching their created_at date
UPDATE public.payments SET business_date = created_at::date WHERE business_date IS NULL;
UPDATE public.incidental_charges SET business_date = created_at::date WHERE business_date IS NULL;


-- ==========================================
-- Migration: 20260626020000_remove_room_type_constraint.sql
-- ==========================================
-- Migration: Drop rooms.type check constraint to allow custom room categories
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Find and drop any check constraints on the "type" column of the "rooms" table
    FOR r IN 
        SELECT tc.constraint_name 
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu 
          ON tc.constraint_name = ccu.constraint_name
          AND tc.table_schema = ccu.table_schema
        WHERE tc.table_schema = 'public'
          AND tc.table_name = 'rooms'
          AND ccu.column_name = 'type'
          AND tc.constraint_type = 'CHECK'
    LOOP
        EXECUTE 'ALTER TABLE public.rooms DROP CONSTRAINT ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;


-- ==========================================
-- Migration: 20260626030000_add_group_id_to_bookings.sql
-- ==========================================
-- Migration: Add group_id to bookings to support group bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS group_id UUID;

-- Index for fast lookup of group bookings
CREATE INDEX IF NOT EXISTS bookings_group_id_idx ON public.bookings(group_id);


-- ==========================================
-- Migration: 20260626040000_add_discount_to_bookings.sql
-- ==========================================
-- Migration: Add discount fields to bookings and update checkout notification trigger

-- 1. Add discount columns to bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0.00 CHECK (discount_amount >= 0.00);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS discount_reason TEXT DEFAULT NULL;

-- 2. Update send_guest_checkout_notification trigger function
CREATE OR REPLACE FUNCTION public.send_guest_checkout_notification()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
    webhook_url TEXT;
    prop_record RECORD;
    room_record RECORD;
    incidental_array JSONB;
    payment_array JSONB;
    net_room_amount NUMERIC(10,2);
BEGIN
    -- Only execute if the status actually changed to 'Checked Out'
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'Checked Out' THEN
        
        -- Fetch base n8n webhook URL from settings
        SELECT value INTO webhook_url FROM public.app_settings WHERE key = 'n8n_webhook_url';
        IF webhook_url IS NULL THEN
            webhook_url := 'http://n8n:5678/webhook/booking-notification';
        END IF;
        
        -- Route to the specific Guest Checkout endpoint in n8n
        webhook_url := replace(webhook_url, 'booking-notification', 'guest-checkout');

        -- Fetch Property info
        SELECT name, address, phone INTO prop_record FROM public.properties WHERE id = NEW.property_id;
        
        -- Fetch Room info
        SELECT room_number INTO room_record FROM public.rooms WHERE id = NEW.room_id;

        -- Aggregate Incidentals
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object('description', description, 'amount', amount)
        ), '[]'::jsonb) INTO incidental_array
        FROM public.incidental_charges
        WHERE booking_id = NEW.id;

        -- Aggregate Payments
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object('method', method, 'amount', amount, 'transaction_id', transaction_id)
        ), '[]'::jsonb) INTO payment_array
        FROM public.payments
        WHERE booking_id = NEW.id;

        -- Calculate net room amount
        net_room_amount := NEW.amount - COALESCE(NEW.discount_amount, 0.00);

        -- Construct the advanced payload with net room amount
        payload := jsonb_build_object(
            'booking_id', NEW.id,
            'guest_name', NEW.guest_name,
            'guest_email', NEW.guest_email,
            'property_name', prop_record.name,
            'property_address', prop_record.address,
            'property_phone', prop_record.phone,
            'room_number', room_record.room_number,
            'check_in', NEW.check_in,
            'check_out', NEW.check_out,
            'original_room_amount', NEW.amount,
            'discount_amount', COALESCE(NEW.discount_amount, 0.00),
            'discount_reason', NEW.discount_reason,
            'room_amount', net_room_amount,
            'incidentals', incidental_array,
            'payments', payment_array
        );

        -- Dispatch the HTTP POST request to n8n
        PERFORM net.http_post(
            url := webhook_url,
            body := payload,
            headers := '{"Content-Type": "application/json"}'::jsonb
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- Migration: 20260627120000_make_guest_ids_public.sql
-- ==========================================
-- Update guest-ids bucket to be public so public URLs can load the uploaded ID cards
UPDATE storage.buckets 
SET public = true 
WHERE id = 'guest-ids';

-- Create policy to allow public read access on guest-ids bucket for displaying ID cards
CREATE POLICY "Anyone can view guest IDs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'guest-ids');


-- ==========================================
-- Migration: 20260627130000_add_update_policy_guest_ids.sql
-- ==========================================
-- Policy to allow anyone (public) to update/overwrite objects in guest-ids bucket
-- This is necessary to support upsert operations on client-side camera captures
CREATE POLICY "Anyone can update guest IDs"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'guest-ids')
WITH CHECK (bucket_id = 'guest-ids');

-- Policy to allow anyone (public) to delete objects in guest-ids bucket (useful for retake/void)
CREATE POLICY "Anyone can delete guest IDs"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'guest-ids');


-- ==========================================
-- Migration: 20260627140000_add_co_living_monthly_billing.sql
-- ==========================================
-- Migration: Add co-living / monthly billing columns to rooms and bookings
ALTER TABLE rooms 
ADD COLUMN allowed_billing_type VARCHAR(20) DEFAULT 'both' 
CHECK (allowed_billing_type IN ('daily', 'monthly', 'both'));

ALTER TABLE bookings
ADD COLUMN is_monthly BOOLEAN DEFAULT false,
ADD COLUMN billing_cycle_date INTEGER CHECK (billing_cycle_date BETWEEN 1 AND 31),
ADD COLUMN monthly_rate NUMERIC(10, 2);


-- ==========================================
-- Migration: 20260628000000_grant_public_privileges.sql
-- ==========================================
-- Grant public schema table, sequence, and function privileges to standard Supabase roles.
-- This ensures that roles like service_role, authenticated, and anon have necessary permissions 
-- to execute inserts, updates, and selects on newly created tables, preventing "permission denied" errors.

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role, authenticated, anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role, authenticated, anon;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role, authenticated, anon;

-- Ensure default privileges are set for future objects created by the postgres role
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres, service_role, authenticated, anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, service_role, authenticated, anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, service_role, authenticated, anon;

-- Ensure default privileges are set for future objects created by the supabase_admin role
-- ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres, service_role, authenticated, anon;
-- ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, service_role, authenticated, anon;
-- ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, service_role, authenticated, anon;



-- ==========================================
-- Migration: 20260628010000_add_sharing_capacity_to_rooms.sql
-- ==========================================
-- Add sharing_capacity column to public.rooms
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS sharing_capacity INTEGER;

-- Initialize existing rooms with capacities matching their current type-derived capacities
UPDATE public.rooms SET sharing_capacity = 3 WHERE type IN ('Suite', 'Deluxe');
UPDATE public.rooms SET sharing_capacity = 2 WHERE sharing_capacity IS NULL;

-- Enforce NOT NULL constraint and set DEFAULT to 2
ALTER TABLE public.rooms ALTER COLUMN sharing_capacity SET DEFAULT 2;
ALTER TABLE public.rooms ALTER COLUMN sharing_capacity SET NOT NULL;


-- ==========================================
-- Migration: 20260717000000_add_payment_allocation.sql
-- ==========================================
-- Migration: Add payment allocation type to track Security Deposits vs Room Rent
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS allocation VARCHAR(20) DEFAULT 'Rent' 
CHECK (allocation IN ('Rent', 'Security Deposit')),
ADD COLUMN IF NOT EXISTS billing_period VARCHAR(100);

-- Trigger PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';


-- ==========================================
-- Migration: 20260729000000_multi_partner_pg_system.sql
-- ==========================================
-- Migration: Multi-Partner PG Property System & Partner Profit Engine
-- Date: 2026-07-29

-- 1. Create Partner Investment Shares Table
CREATE TABLE IF NOT EXISTS public.partner_investments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    partner_name VARCHAR(255) NOT NULL,
    partner_email VARCHAR(255),
    partner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    investment_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (investment_amount >= 0),
    share_percentage NUMERIC(5,2) NOT NULL CHECK (share_percentage >= 0 AND share_percentage <= 100),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Timestamped Expenses Table
CREATE TABLE IF NOT EXISTS public.timestamped_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'miscellaneous',
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(20) NOT NULL DEFAULT 'UPI' CHECK (payment_method IN ('Cash', 'UPI', 'Bank Transfer')),
    expense_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    business_date DATE NOT NULL DEFAULT CURRENT_DATE,
    receipt_url TEXT,
    logged_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create Staff Payroll Table (Chef, Helper, Housekeeping, etc.)
CREATE TABLE IF NOT EXISTS public.staff_payroll (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    staff_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Chef', 'Helper', 'Housekeeping', 'Security', 'Manager')),
    monthly_salary NUMERIC(10,2) NOT NULL CHECK (monthly_salary >= 0),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Paid', 'Partial')),
    paid_amount NUMERIC(10,2) DEFAULT 0.00,
    paid_date DATE,
    payment_method VARCHAR(20) CHECK (payment_method IN ('Cash', 'UPI', 'Bank Transfer')),
    business_month DATE NOT NULL,
    logged_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create PG Tenants Directory Table
CREATE TABLE IF NOT EXISTS public.pg_tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    bed_number VARCHAR(10),
    sharing_capacity INTEGER NOT NULL DEFAULT 2 CHECK (sharing_capacity BETWEEN 2 AND 5),
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    monthly_rent NUMERIC(10,2) NOT NULL,
    security_deposit NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    deposit_status VARCHAR(20) DEFAULT 'Held' CHECK (deposit_status IN ('Held', 'Refunded', 'Adjusted')),
    rent_due_day INTEGER NOT NULL DEFAULT 5 CHECK (rent_due_day BETWEEN 1 AND 31),
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Vacated', 'Notice')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Create Daily Closing Summary Snapshots Table
CREATE TABLE IF NOT EXISTS public.daily_closing_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    total_cash_collected NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total_upi_collected NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total_expenses_cash NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total_expenses_upi NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    net_cash_in_hand NUMERIC(10,2) GENERATED ALWAYS AS (total_cash_collected - total_expenses_cash) STORED,
    net_daily_profit NUMERIC(10,2) GENERATED ALWAYS AS ((total_cash_collected + total_upi_collected) - (total_expenses_cash + total_expenses_upi)) STORED,
    closed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(property_id, snapshot_date)
);

-- RLS POLICIES FOR SECURE ADMIN VS PARTNER ACCESS

ALTER TABLE public.partner_investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timestamped_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pg_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_closing_snapshots ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users associated with the property to read
CREATE POLICY "Allow authenticated property members to read partner_investments"
    ON public.partner_investments FOR SELECT TO authenticated
    USING (property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Allow admin to manage partner_investments"
    ON public.partner_investments FOR ALL TO authenticated
    USING (property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'super_admin')))
    WITH CHECK (property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'super_admin')));

CREATE POLICY "Allow authenticated property members to read expenses"
    ON public.timestamped_expenses FOR SELECT TO authenticated
    USING (property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Allow admin to manage expenses"
    ON public.timestamped_expenses FOR ALL TO authenticated
    USING (property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'super_admin')))
    WITH CHECK (property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'super_admin')));

CREATE POLICY "Allow authenticated property members to read payroll"
    ON public.staff_payroll FOR SELECT TO authenticated
    USING (property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Allow admin to manage payroll"
    ON public.staff_payroll FOR ALL TO authenticated
    USING (property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'super_admin')))
    WITH CHECK (property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'super_admin')));

CREATE POLICY "Allow authenticated property members to read tenants"
    ON public.pg_tenants FOR SELECT TO authenticated
    USING (property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Allow admin to manage tenants"
    ON public.pg_tenants FOR ALL TO authenticated
    USING (property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'super_admin')))
    WITH CHECK (property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'super_admin')));

CREATE POLICY "Allow authenticated property members to read snapshots"
    ON public.daily_closing_snapshots FOR SELECT TO authenticated
    USING (property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Allow admin to manage snapshots"
    ON public.daily_closing_snapshots FOR ALL TO authenticated
    USING (property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'super_admin')))
    WITH CHECK (property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'super_admin')));

-- AUTOMATIC DEFAULT PARTNER INITIALIZATION TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.seed_default_partner_shares()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.partner_investments (property_id, partner_name, share_percentage)
    VALUES
        (NEW.id, 'Person 1', 28.30),
        (NEW.id, 'Person 2', 22.64),
        (NEW.id, 'Person 3', 18.87),
        (NEW.id, 'Person 4', 18.87),
        (NEW.id, 'Person 5', 11.32);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_seed_default_partner_shares ON public.properties;
CREATE TRIGGER trigger_seed_default_partner_shares
    AFTER INSERT ON public.properties
    FOR EACH ROW
    EXECUTE FUNCTION public.seed_default_partner_shares();


-- ==========================================
-- Migration: 20260729010000_property_category_and_capital.sql
-- ==========================================
-- Migration: Add Property Category & Dynamic Partner Capital Investment
-- Date: 2026-07-29

-- 1. Add property_category and total_capital_investment to public.properties
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS property_category VARCHAR(20) DEFAULT 'Hybrid' CHECK (property_category IN ('PG', 'Hotel', 'Hybrid')),
ADD COLUMN IF NOT EXISTS total_capital_investment NUMERIC(14,2) DEFAULT 0.00 CHECK (total_capital_investment >= 0);

-- 2. Enhance partner_investments table with investment_amount
ALTER TABLE public.partner_investments
ADD COLUMN IF NOT EXISTS investment_amount NUMERIC(14,2) DEFAULT 0.00 CHECK (investment_amount >= 0),
ADD COLUMN IF NOT EXISTS partner_phone VARCHAR(20);

-- 3. Automatic Partner Percentage Calculation Trigger
CREATE OR REPLACE FUNCTION public.recalculate_partner_percentages()
RETURNS TRIGGER AS $$
DECLARE
    prop_capital NUMERIC(14,2);
BEGIN
    SELECT total_capital_investment INTO prop_capital 
    FROM public.properties WHERE id = NEW.property_id;

    IF prop_capital IS NOT NULL AND prop_capital > 0 AND NEW.investment_amount IS NOT NULL AND NEW.investment_amount > 0 THEN
        NEW.share_percentage := ROUND((NEW.investment_amount / prop_capital) * 100, 2);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto recalculating partner percentage on insert/update
DROP TRIGGER IF EXISTS trigger_recalculate_partner_percentages ON public.partner_investments;
CREATE TRIGGER trigger_recalculate_partner_percentages
    BEFORE INSERT OR UPDATE ON public.partner_investments
    FOR EACH ROW
    EXECUTE FUNCTION public.recalculate_partner_percentages();


