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
