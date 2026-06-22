-- Migration: Fix Audit Logs & Profiles Relationship Mapping
-- Adds a direct foreign key constraint in the public schema between audit_logs and profiles
-- This allows PostgREST to automatically resolve joins like .select('..., profiles(...)')

ALTER TABLE public.audit_logs
ADD CONSTRAINT fk_audit_logs_profiles
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Reload schema cache to make PostgREST aware of the change immediately
NOTIFY pgrst, 'reload schema';
