-- Migration: Folio Engine (Incidental Charges & Payments)

-- 1. Create incidental_charges table
CREATE TABLE IF NOT EXISTS public.incidental_charges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Indexes for fast folio retrieval
CREATE INDEX IF NOT EXISTS incidental_charges_booking_id_idx ON public.incidental_charges(booking_id);

-- Enable RLS
ALTER TABLE public.incidental_charges ENABLE ROW LEVEL SECURITY;

-- Admin Policy
CREATE POLICY "Admins can manage incidental_charges" 
ON public.incidental_charges FOR ALL 
USING (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'admin' OR 
    auth.jwt() -> 'user_metadata' ->> 'role' = 'admin'
);

-- Owner/Staff Policy
CREATE POLICY "Owners/Staff can manage incidental_charges for their properties" 
ON public.incidental_charges FOR ALL
USING (
    property_id IN (SELECT property_id FROM public.property_access WHERE user_id = auth.uid())
    OR property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid())
) WITH CHECK (
    property_id IN (SELECT property_id FROM public.property_access WHERE user_id = auth.uid())
    OR property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid())
);
