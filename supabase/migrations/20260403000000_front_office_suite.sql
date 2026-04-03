-- Migration: Front Office Suite (Upgrades, Blocks, Notes)
-- Expands the schema to support advanced front desk operations

-- 1. Add 'notes' column to bookings for internal staff communication
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Update room status constraint to allow 'Blocked' for maintenance/events
ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_status_check;
ALTER TABLE public.rooms ADD CONSTRAINT rooms_status_check 
CHECK (status IN ('Available', 'Occupied', 'Dirty', 'Blocked'));

-- 3. Add 'original_room_id' to track room moves/upgrades
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS original_room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL;
