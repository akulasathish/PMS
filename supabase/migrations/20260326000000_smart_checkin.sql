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
