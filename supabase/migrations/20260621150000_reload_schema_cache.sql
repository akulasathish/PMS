-- Force verify guest_phone exists and reload PostgREST schema cache
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS guest_phone TEXT;

-- Notify PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
