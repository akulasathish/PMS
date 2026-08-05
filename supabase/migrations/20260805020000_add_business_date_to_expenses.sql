-- Migration: Add business_date and payment_method/method columns to expenses table
-- Date: 2026-08-05

ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS business_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'UPI',
ADD COLUMN IF NOT EXISTS method VARCHAR(50) DEFAULT 'UPI';

NOTIFY pgrst, 'reload schema';
