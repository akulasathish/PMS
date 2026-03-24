-- Add guest_email column to bookings table to support n8n Welcome Email automation
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS guest_email TEXT;
