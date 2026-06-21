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
