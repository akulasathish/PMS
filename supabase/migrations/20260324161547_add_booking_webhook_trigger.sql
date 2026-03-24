-- Enable the pg_net extension to allow HTTP requests from Postgres
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- Create the webhook function
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
    -- (The service is named 'n8n' and reachable on port 5678 within the docker network)
    SELECT net.http_post(
        url := 'http://n8n:5678/webhook-test/booking-notification',
        body := payload,
        headers := '{"Content-Type": "application/json"}'::jsonb
    ) INTO request_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on the bookings table
DROP TRIGGER IF EXISTS on_booking_created ON public.bookings;
CREATE TRIGGER on_booking_created
AFTER INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.send_booking_notification();
