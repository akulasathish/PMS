


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."get_30_day_revenue"("p_property_id" "uuid") RETURNS TABLE("daily_date" "date", "revenue" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(
            CURRENT_DATE - INTERVAL '29 days',
            CURRENT_DATE,
            '1 day'::interval
        )::date AS daily_date
    )
    SELECT
        ds.daily_date,
        COALESCE(SUM(b.amount), 0)::NUMERIC AS revenue
    FROM
        date_series ds
    LEFT JOIN
        public.bookings b ON DATE(b.created_at) = ds.daily_date
        AND b.property_id = p_property_id
        AND b.status IN ('Confirmed', 'Checked In', 'Checked Out')
    GROUP BY
        ds.daily_date
    ORDER BY
        ds.daily_date ASC;
END;
$$;


ALTER FUNCTION "public"."get_30_day_revenue"("p_property_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_owner_provisioned"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    payload JSONB;
    webhook_url TEXT;
    user_record RECORD;
    prop_names TEXT;
BEGIN
    -- Construct list of property names for the email
    SELECT string_agg(name, ', ') INTO prop_names 
    FROM public.properties 
    WHERE id IN (SELECT property_id FROM public.property_access WHERE user_id = NEW.user_id);

    -- Fetch user email
    SELECT email, full_name INTO user_record FROM public.profiles WHERE id = NEW.user_id;

    -- Fetch base n8n webhook URL
    SELECT value INTO webhook_url FROM public.app_settings WHERE key = 'n8n_webhook_url';
    webhook_url := replace(webhook_url, 'booking-notification', 'owner-invite');

    payload := jsonb_build_object(
        'user_id', NEW.user_id,
        'email', user_record.email,
        'full_name', user_record.full_name,
        'properties', prop_names,
        'action', 'owner_provisioned'
    );

    PERFORM net.http_post(
        url := webhook_url,
        body := payload,
        headers := '{"Content-Type": "application/json"}'::jsonb
    );

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_owner_provisioned"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_booking_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."send_booking_notification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_guest_checkout_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."send_guest_checkout_notification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_smart_checkin_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."send_smart_checkin_notification"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."app_settings" (
    "key" "text" NOT NULL,
    "value" "text" NOT NULL,
    "description" "text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."app_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "room_id" "uuid" NOT NULL,
    "guest_name" "text" NOT NULL,
    "check_in" "date" NOT NULL,
    "check_out" "date" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "status" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "guest_email" "text",
    "notes" "text",
    "original_room_id" "uuid",
    "id_verified" boolean DEFAULT false,
    "id_photo_url" "text",
    "signature_url" "text",
    CONSTRAINT "bookings_status_check" CHECK (("status" = ANY (ARRAY['Pending'::"text", 'Confirmed'::"text", 'Checked In'::"text", 'Checked Out'::"text", 'Cancelled'::"text"])))
);


ALTER TABLE "public"."bookings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."guests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid",
    "property_id" "uuid",
    "full_name" "text",
    "email" "text",
    "id_type" "text",
    "id_number" "text",
    "id_photo_url" "text",
    "signature_url" "text",
    "address" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."guests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "role" "text" NOT NULL,
    "property_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "email" "text",
    "permissions" "jsonb" DEFAULT '{"finance": {"manage_rates": "deny", "view_analytics": "deny", "run_night_audit": "deny", "view_audit_logs": "deny"}, "inventory": {"view_inventory": "read", "maintenance_log": "deny", "add_delete_rooms": "deny", "manage_room_types": "deny"}, "management": {"property_settings": "deny", "manage_staff_accounts": "deny"}, "front_office": {"block_rooms": "deny", "guest_notes": "read", "refund_folio": "deny", "upgrade_room": "deny", "create_booking": "deny", "modify_booking": "deny", "view_guest_pii": "deny", "view_tape_chart": "read", "perform_check_in": "deny", "perform_check_out": "deny"}, "housekeeping": {"inspect_room": "deny", "mark_room_ready": "deny", "view_cleaning_list": "read", "post_minibar_charges": "deny", "start_finish_cleaning": "deny", "manage_cleaning_boards": "deny"}}'::"jsonb",
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'owner'::"text", 'front-desk'::"text", 'staff'::"text", 'Guest Journey'::"text", 'Night Auditor'::"text", 'Room Attendant'::"text", 'Supervisor'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."properties" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "tier" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'Active'::"text",
    "wifi_network" "text" DEFAULT 'Guest_WiFi'::"text",
    "wifi_password" "text" DEFAULT 'welcome123'::"text",
    CONSTRAINT "properties_status_check" CHECK (("status" = ANY (ARRAY['Active'::"text", 'Suspended'::"text"]))),
    CONSTRAINT "properties_tier_check" CHECK (("tier" = ANY (ARRAY['Starter'::"text", 'Pro'::"text", 'Enterprise'::"text"])))
);


ALTER TABLE "public"."properties" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."property_access" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "property_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."property_access" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."role_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid",
    "name" "text" NOT NULL,
    "permissions" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."role_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rooms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "room_number" "text" NOT NULL,
    "type" "text" NOT NULL,
    "status" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "assigned_staff_id" "uuid",
    "cleaning_started_at" timestamp with time zone,
    "last_cleaned_at" timestamp with time zone,
    "is_deleted" boolean DEFAULT false,
    CONSTRAINT "rooms_status_check" CHECK (("status" = ANY (ARRAY['Available'::"text", 'Occupied'::"text", 'Dirty'::"text", 'Blocked'::"text", 'Maintenance'::"text", 'Cleaning'::"text", 'Clean'::"text"]))),
    CONSTRAINT "rooms_type_check" CHECK (("type" = ANY (ARRAY['Standard'::"text", 'Deluxe'::"text", 'Suite'::"text"])))
);


ALTER TABLE "public"."rooms" OWNER TO "postgres";


ALTER TABLE ONLY "public"."app_settings"
    ADD CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guests"
    ADD CONSTRAINT "guests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."properties"
    ADD CONSTRAINT "properties_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."property_access"
    ADD CONSTRAINT "property_access_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."property_access"
    ADD CONSTRAINT "property_access_user_id_property_id_key" UNIQUE ("user_id", "property_id");



ALTER TABLE ONLY "public"."role_templates"
    ADD CONSTRAINT "role_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_property_id_room_number_key" UNIQUE ("property_id", "room_number");



CREATE OR REPLACE TRIGGER "on_booking_checked_in" AFTER UPDATE ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."send_smart_checkin_notification"();



CREATE OR REPLACE TRIGGER "on_booking_checked_out" AFTER UPDATE ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."send_guest_checkout_notification"();



CREATE OR REPLACE TRIGGER "on_booking_created" AFTER INSERT ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."send_booking_notification"();



CREATE OR REPLACE TRIGGER "on_owner_provisioned" AFTER INSERT ON "public"."property_access" FOR EACH ROW EXECUTE FUNCTION "public"."notify_owner_provisioned"();



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_original_room_id_fkey" FOREIGN KEY ("original_room_id") REFERENCES "public"."rooms"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guests"
    ADD CONSTRAINT "guests_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guests"
    ADD CONSTRAINT "guests_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."property_access"
    ADD CONSTRAINT "property_access_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_access"
    ADD CONSTRAINT "property_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."role_templates"
    ADD CONSTRAINT "role_templates_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_assigned_staff_id_fkey" FOREIGN KEY ("assigned_staff_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can do everything on bookings" ON "public"."bookings" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "Admins can do everything on profiles" ON "public"."profiles" USING ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "Admins can do everything on properties" ON "public"."properties" USING ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "Admins can do everything on property_access" ON "public"."property_access" USING ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "Admins can do everything on role_templates" ON "public"."role_templates" USING (((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "Admins can do everything on rooms" ON "public"."rooms" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "Allow all for authenticated users" ON "public"."app_settings" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Master Key Bookings" ON "public"."bookings" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Master Key Guests" ON "public"."guests" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Owners can manage templates for their properties" ON "public"."role_templates" USING (("property_id" IN ( SELECT "property_access"."property_id"
   FROM "public"."property_access"
  WHERE ("property_access"."user_id" = "auth"."uid"())))) WITH CHECK (("property_id" IN ( SELECT "property_access"."property_id"
   FROM "public"."property_access"
  WHERE ("property_access"."user_id" = "auth"."uid"()))));



CREATE POLICY "Owners can view profiles in their properties" ON "public"."profiles" FOR SELECT USING (("property_id" IN ( SELECT "property_access"."property_id"
   FROM "public"."property_access"
  WHERE ("property_access"."user_id" = "auth"."uid"()))));



CREATE POLICY "Owners can view system templates and their own" ON "public"."role_templates" FOR SELECT USING ((("property_id" IS NULL) OR ("property_id" IN ( SELECT "property_access"."property_id"
   FROM "public"."property_access"
  WHERE ("property_access"."user_id" = "auth"."uid"())))));



CREATE POLICY "Owners can view their assigned properties" ON "public"."properties" FOR SELECT USING (true);



CREATE POLICY "Strict Multi-Tenant Isolation for Rooms" ON "public"."rooms" TO "authenticated" USING ((("property_id" IN ( SELECT "property_access"."property_id"
   FROM "public"."property_access"
  WHERE ("property_access"."user_id" = "auth"."uid"()))) OR ("property_id" IN ( SELECT "profiles"."property_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own access" ON "public"."property_access" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT USING (("id" = "auth"."uid"()));



ALTER TABLE "public"."app_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bookings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."guests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."properties" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."property_access" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."role_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rooms" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."bookings";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."rooms";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";































































































































































GRANT ALL ON FUNCTION "public"."get_30_day_revenue"("p_property_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_30_day_revenue"("p_property_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_30_day_revenue"("p_property_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_owner_provisioned"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_owner_provisioned"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_owner_provisioned"() TO "service_role";



GRANT ALL ON FUNCTION "public"."send_booking_notification"() TO "anon";
GRANT ALL ON FUNCTION "public"."send_booking_notification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_booking_notification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."send_guest_checkout_notification"() TO "anon";
GRANT ALL ON FUNCTION "public"."send_guest_checkout_notification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_guest_checkout_notification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."send_smart_checkin_notification"() TO "anon";
GRANT ALL ON FUNCTION "public"."send_smart_checkin_notification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_smart_checkin_notification"() TO "service_role";


















GRANT ALL ON TABLE "public"."app_settings" TO "anon";
GRANT ALL ON TABLE "public"."app_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."app_settings" TO "service_role";



GRANT ALL ON TABLE "public"."bookings" TO "anon";
GRANT ALL ON TABLE "public"."bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."bookings" TO "service_role";



GRANT ALL ON TABLE "public"."guests" TO "anon";
GRANT ALL ON TABLE "public"."guests" TO "authenticated";
GRANT ALL ON TABLE "public"."guests" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."properties" TO "anon";
GRANT ALL ON TABLE "public"."properties" TO "authenticated";
GRANT ALL ON TABLE "public"."properties" TO "service_role";



GRANT ALL ON TABLE "public"."property_access" TO "anon";
GRANT ALL ON TABLE "public"."property_access" TO "authenticated";
GRANT ALL ON TABLE "public"."property_access" TO "service_role";



GRANT ALL ON TABLE "public"."role_templates" TO "anon";
GRANT ALL ON TABLE "public"."role_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."role_templates" TO "service_role";



GRANT ALL ON TABLE "public"."rooms" TO "anon";
GRANT ALL ON TABLE "public"."rooms" TO "authenticated";
GRANT ALL ON TABLE "public"."rooms" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































