-- Add email column to profiles table to support dashboard UI
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
