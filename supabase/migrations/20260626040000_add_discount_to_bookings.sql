-- Migration: Add discount fields to bookings and update checkout notification trigger

-- 1. Add discount columns to bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0.00 CHECK (discount_amount >= 0.00);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS discount_reason TEXT DEFAULT NULL;

-- 2. Update send_guest_checkout_notification trigger function
CREATE OR REPLACE FUNCTION public.send_guest_checkout_notification()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
    webhook_url TEXT;
    prop_record RECORD;
    room_record RECORD;
    incidental_array JSONB;
    payment_array JSONB;
    net_room_amount NUMERIC(10,2);
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
        SELECT name, address, phone INTO prop_record FROM public.properties WHERE id = NEW.property_id;
        
        -- Fetch Room info
        SELECT room_number INTO room_record FROM public.rooms WHERE id = NEW.room_id;

        -- Aggregate Incidentals
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object('description', description, 'amount', amount)
        ), '[]'::jsonb) INTO incidental_array
        FROM public.incidental_charges
        WHERE booking_id = NEW.id;

        -- Aggregate Payments
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object('method', method, 'amount', amount, 'transaction_id', transaction_id)
        ), '[]'::jsonb) INTO payment_array
        FROM public.payments
        WHERE booking_id = NEW.id;

        -- Calculate net room amount
        net_room_amount := NEW.amount - COALESCE(NEW.discount_amount, 0.00);

        -- Construct the advanced payload with net room amount
        payload := jsonb_build_object(
            'booking_id', NEW.id,
            'guest_name', NEW.guest_name,
            'guest_email', NEW.guest_email,
            'property_name', prop_record.name,
            'property_address', prop_record.address,
            'property_phone', prop_record.phone,
            'room_number', room_record.room_number,
            'check_in', NEW.check_in,
            'check_out', NEW.check_out,
            'original_room_amount', NEW.amount,
            'discount_amount', COALESCE(NEW.discount_amount, 0.00),
            'discount_reason', NEW.discount_reason,
            'room_amount', net_room_amount,
            'incidentals', incidental_array,
            'payments', payment_array
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
