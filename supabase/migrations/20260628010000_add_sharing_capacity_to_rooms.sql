-- Add sharing_capacity column to public.rooms
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS sharing_capacity INTEGER;

-- Initialize existing rooms with capacities matching their current type-derived capacities
UPDATE public.rooms SET sharing_capacity = 3 WHERE type IN ('Suite', 'Deluxe');
UPDATE public.rooms SET sharing_capacity = 2 WHERE sharing_capacity IS NULL;

-- Enforce NOT NULL constraint and set DEFAULT to 2
ALTER TABLE public.rooms ALTER COLUMN sharing_capacity SET DEFAULT 2;
ALTER TABLE public.rooms ALTER COLUMN sharing_capacity SET NOT NULL;
