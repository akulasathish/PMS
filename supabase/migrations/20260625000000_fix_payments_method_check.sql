-- Migration: Fix payments method check constraint to support custom modes and SWIPE
-- This drops the restrictive check constraint on the payments table's method column,
-- enabling custom payment methods logged from the frontend.

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_method_check;
