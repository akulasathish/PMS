-- Migration: Add monthly_rent, security_deposit, rent_due_day, monthly_rate, billing_cycle_date to bookings table
-- Date: 2026-08-05

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS monthly_rent NUMERIC(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS monthly_rate NUMERIC(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS security_deposit NUMERIC(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS rent_due_day INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS billing_cycle_date INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS is_monthly BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10, 2) DEFAULT 0.00;

NOTIFY pgrst, 'reload schema';
