ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS id_verified BOOLEAN DEFAULT false;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS id_photo_url TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS signature_url TEXT;
