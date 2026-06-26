-- Migration: Add guest_phone to bookings table and update webhook payloads
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS guest_phone TEXT;

-- 1. Update Booking Webhook payload function to include guest_phone
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
        'guest_phone', NEW.guest_phone,
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

-- 2. Update Smart Check-In payload function to include guest_phone
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
            'guest_phone', NEW.guest_phone,
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

-- 3. Update Checkout trigger payload function to include guest_phone
CREATE OR REPLACE FUNCTION public.send_guest_checkout_notification()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
    webhook_url TEXT;
    prop_record RECORD;
    room_record RECORD;
    incidental_array JSONB;
    payment_array JSONB;
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

        -- Construct the advanced payload
        payload := jsonb_build_object(
            'booking_id', NEW.id,
            'guest_name', NEW.guest_name,
            'guest_email', NEW.guest_email,
            'guest_phone', NEW.guest_phone,
            'property_name', prop_record.name,
            'property_address', prop_record.address,
            'property_phone', prop_record.phone,
            'room_number', room_record.room_number,
            'check_in', NEW.check_in,
            'check_out', NEW.check_out,
            'room_amount', NEW.amount,
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
