-- Seed Data for StaySync (1-Tier Clean Slate)

-- 1. Ensure the n8n webhook URL is set
INSERT INTO public.app_settings (key, value, description)
VALUES ('n8n_webhook_url', 'http://n8n:5678/webhook/booking-notification', 'The URL for n8n to process booking welcome emails')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
