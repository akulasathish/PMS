-- Migration: Add operational business_date key to app_settings
INSERT INTO public.app_settings (key, value, description)
VALUES ('business_date', '2026-06-21', 'The active operational business date of the property management system')
ON CONFLICT (key) DO NOTHING;
