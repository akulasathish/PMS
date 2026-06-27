-- Migration: Add co-living / monthly billing columns to rooms and bookings
ALTER TABLE rooms 
ADD COLUMN allowed_billing_type VARCHAR(20) DEFAULT 'both' 
CHECK (allowed_billing_type IN ('daily', 'monthly', 'both'));

ALTER TABLE bookings
ADD COLUMN is_monthly BOOLEAN DEFAULT false,
ADD COLUMN billing_cycle_date INTEGER CHECK (billing_cycle_date BETWEEN 1 AND 31),
ADD COLUMN monthly_rate NUMERIC(10, 2);
