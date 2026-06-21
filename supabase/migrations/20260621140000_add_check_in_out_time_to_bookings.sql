-- Migration: Add check_in_time and check_out_time to bookings table
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS check_in_time TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS check_out_time TIMESTAMPTZ;
