-- Add status column to properties table
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended'));
