-- Migration: Inventory Control (Advanced Room Blocking)
-- Creates the room_blocks table to track maintenance and Out of Order rooms

CREATE TABLE IF NOT EXISTS public.room_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    block_type TEXT NOT NULL CHECK (block_type IN ('OOO', 'OOS')), -- OOO = Out of Order, OOS = Out of Service
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Resolved', 'Cancelled')),
    
    CONSTRAINT room_blocks_dates_check CHECK (end_date >= start_date)
);

-- Indexing for fast conflict checking
CREATE INDEX IF NOT EXISTS room_blocks_room_id_dates_idx ON public.room_blocks(room_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS room_blocks_property_id_idx ON public.room_blocks(property_id);

-- Enable RLS
ALTER TABLE public.room_blocks ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage room_blocks" 
ON public.room_blocks FOR ALL 
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin') OR 
    (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
);

-- Owners/Staff can view/manage their property's blocks
CREATE POLICY "Owners/Staff can manage room_blocks for their properties" 
ON public.room_blocks FOR ALL
USING (
    property_id IN (SELECT property_id FROM public.property_access WHERE user_id = auth.uid())
    OR property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid())
) WITH CHECK (
    property_id IN (SELECT property_id FROM public.property_access WHERE user_id = auth.uid())
    OR property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid())
);
