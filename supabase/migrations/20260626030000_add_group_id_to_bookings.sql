-- Migration: Add group_id to bookings to support group bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS group_id UUID;

-- Index for fast lookup of group bookings
CREATE INDEX IF NOT EXISTS bookings_group_id_idx ON public.bookings(group_id);
