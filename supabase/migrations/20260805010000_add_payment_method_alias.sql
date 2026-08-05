-- Migration: Ensure payments table has both method and payment_method columns for schema cache safety
-- Date: 2026-08-05

ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'Cash',
ADD COLUMN IF NOT EXISTS method VARCHAR(50) DEFAULT 'Cash';

NOTIFY pgrst, 'reload schema';
