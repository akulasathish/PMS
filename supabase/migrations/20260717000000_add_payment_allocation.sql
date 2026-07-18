-- Migration: Add payment allocation type to track Security Deposits vs Room Rent
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS allocation VARCHAR(20) DEFAULT 'Rent' 
CHECK (allocation IN ('Rent', 'Security Deposit')),
ADD COLUMN IF NOT EXISTS billing_period VARCHAR(100);

-- Trigger PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
