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
