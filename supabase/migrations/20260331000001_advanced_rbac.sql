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
