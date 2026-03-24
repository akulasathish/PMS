-- Update the webhook function to use the production webhook URL
CREATE OR REPLACE FUNCTION public.send_booking_notification()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
    request_id BIGINT;
BEGIN
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

    -- Send the HTTP POST request to the internal n8n docker container
    -- Changed from /webhook-test/ to /webhook/ for "Active" workflows
    SELECT net.http_post(
        url := 'http://n8n:5678/webhook/booking-notification',
        body := payload,
        headers := '{"Content-Type": "application/json"}'::jsonb
    ) INTO request_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
