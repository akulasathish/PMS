-- Migration: Repair Missing Columns
-- Adds columns that were referenced in code but missing in previous migrations

-- 1. Repair 'rooms' table
ALTER TABLE public.rooms 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS assigned_staff_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS cleaning_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_cleaned_at TIMESTAMPTZ;

-- 2. Repair 'bookings' table
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS id_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS id_photo_url TEXT,
ADD COLUMN IF NOT EXISTS signature_url TEXT;
