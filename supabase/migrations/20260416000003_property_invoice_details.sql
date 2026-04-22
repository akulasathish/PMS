-- Migration: Add Missing Property Columns for Invoicing
-- Adds the address, phone, and GST fields required by the checkout trigger and the property management UI

ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS gst_number TEXT,
ADD COLUMN IF NOT EXISTS state_code TEXT;
