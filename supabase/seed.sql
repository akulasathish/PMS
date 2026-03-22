-- Seed data for PMS

-- 1. Insert a default property
INSERT INTO public.properties (id, name, tier)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Grand Hyatt Regency', 'Enterprise'),
    ('00000000-0000-0000-0000-000000000002', 'Ocean View Resort', 'Pro'),
    ('00000000-0000-0000-0000-000000000003', 'The Delhi Boutique', 'Starter');

-- 2. Insert some rooms for Grand Hyatt
INSERT INTO public.rooms (id, property_id, room_number, type, status)
VALUES 
    ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', '101', 'Deluxe', 'Occupied'),
    ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', '102', 'Standard', 'Available'),
    ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000001', '103', 'Suite', 'Occupied'),
    ('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000001', '104', 'Standard', 'Dirty');

-- 3. Insert some recent bookings
INSERT INTO public.bookings (id, property_id, room_id, guest_name, check_in, check_out, amount, status)
VALUES 
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101', 'John Wick', '2026-03-20', '2026-03-25', 450.00, 'Checked In'),
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000103', 'Sarah Connor', '2026-03-21', '2026-03-26', 1200.00, 'Checked In');
