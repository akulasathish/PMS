-- Migration: Add business_date column to payments and incidental_charges
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS business_date DATE;
ALTER TABLE public.incidental_charges ADD COLUMN IF NOT EXISTS business_date DATE;

-- Update existing records to have business_date matching their created_at date
UPDATE public.payments SET business_date = created_at::date WHERE business_date IS NULL;
UPDATE public.incidental_charges SET business_date = created_at::date WHERE business_date IS NULL;
