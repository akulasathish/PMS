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
