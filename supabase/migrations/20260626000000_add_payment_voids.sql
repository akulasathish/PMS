-- Migration: Add Void Payment Tracking to Payments Table
-- Adds columns to track if a payment has been voided, the reason, the timestamp, and who voided it.

ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS is_void BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS void_reason TEXT,
ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS voided_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
