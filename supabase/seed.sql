-- Seed Data for Deployment

-- 1. Create the Demo Property (Tier 1)
INSERT INTO public.properties (id, name, tier, status)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'The Grand Demo Hotel', 'Enterprise', 'Active')
ON CONFLICT (id) DO NOTHING;

-- 2. Create the Users (Admin, Owner, and Staff) in auth.users
-- Passwords are set to 'password123' using bcrypt salt
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'admin@pms.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"role":"admin"}'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'owner@demo.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"role":"owner"}'),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '00000000-0000-0000-0000-000000000000', 'staff@demo.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"role":"staff"}')
ON CONFLICT (id) DO NOTHING;

-- 3. Link Users to Profiles and Properties
INSERT INTO public.profiles (id, email, full_name, role, property_id)
VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin@pms.com', 'System Admin', 'admin', NULL),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'owner@demo.com', 'Demo Owner', 'owner', '11111111-1111-1111-1111-111111111111'),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'staff@demo.com', 'Demo Staff', 'staff', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- 4. Create Standard and Deluxe Rooms for the Demo Property (Tier 2)
INSERT INTO public.rooms (id, property_id, room_number, type, status)
VALUES
    ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', '101', 'Standard', 'Available'),
    ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '102', 'Standard', 'Available'),
    ('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111111', '201', 'Deluxe', 'Available'),
    ('22222222-2222-2222-2222-222222222224', '11111111-1111-1111-1111-111111111111', '202', 'Suite', 'Dirty')
ON CONFLICT (id) DO NOTHING;

-- 5. Ensure the n8n webhook URL is set
INSERT INTO public.app_settings (key, value, description)
VALUES ('n8n_webhook_url', 'http://n8n:5678/webhook/booking-notification', 'The URL for n8n to process booking welcome emails')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
