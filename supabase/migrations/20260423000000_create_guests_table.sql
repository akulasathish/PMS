-- Create the guests table to store PII securely
CREATE TABLE IF NOT EXISTS public.guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT,
    phone_number TEXT,
    id_photo_url TEXT,
    signature_url TEXT,
    verified_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

-- Staff/Owner can view guests for their property
CREATE POLICY "Staff can view guests"
    ON public.guests FOR SELECT
    TO authenticated
    USING (
        property_id IN (
            SELECT property_id FROM public.property_access WHERE user_id = auth.uid()
        )
    );

-- System can insert guests (via Service Role)
-- Service Role bypasses RLS, so no INSERT policy is strictly needed for the backend action,
-- but we add this for completeness if we ever allow authenticated inserts.
CREATE POLICY "Staff can insert guests"
    ON public.guests FOR INSERT
    TO authenticated
    WITH CHECK (
        property_id IN (
            SELECT property_id FROM public.property_access WHERE user_id = auth.uid()
        )
    );
