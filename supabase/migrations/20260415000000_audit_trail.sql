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
