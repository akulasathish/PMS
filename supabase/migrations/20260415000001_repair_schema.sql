-- Migration: Repair Missing Columns
-- Adds columns that were referenced in code but missing in previous migrations

-- 1. Repair 'rooms' table
ALTER TABLE public.rooms 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS assigned_staff_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS cleaning_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_cleaned_at TIMESTAMPTZ;

-- 3. Fix room status constraints for Housekeeping QC loop
ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_status_check;
ALTER TABLE public.rooms ADD CONSTRAINT rooms_status_check 
CHECK (status IN ('Available', 'Occupied', 'Dirty', 'Blocked', 'Cleaning', 'Clean'));
