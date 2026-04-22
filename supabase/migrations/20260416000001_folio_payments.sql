-- Migration: Folio Engine (Payments)

-- 1. Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    method TEXT NOT NULL CHECK (method IN ('Cash', 'Credit Card', 'UPI', 'Bank Transfer', 'OTA Pre-Paid')),
    transaction_id TEXT, -- Optional ID from Stripe/Razorpay
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Indexes for fast folio retrieval
CREATE INDEX IF NOT EXISTS payments_booking_id_idx ON public.payments(booking_id);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Admin Policy
CREATE POLICY "Admins can manage payments" 
ON public.payments FOR ALL 
USING (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'admin' OR 
    auth.jwt() -> 'user_metadata' ->> 'role' = 'admin'
);

-- Owner/Staff Policy
CREATE POLICY "Owners/Staff can manage payments for their properties" 
ON public.payments FOR ALL
USING (
    property_id IN (SELECT property_id FROM public.property_access WHERE user_id = auth.uid())
    OR property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid())
) WITH CHECK (
    property_id IN (SELECT property_id FROM public.property_access WHERE user_id = auth.uid())
    OR property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid())
);
