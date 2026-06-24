-- Add handed_over_cash column to daily_cash_balances table to track cash handovers to the finance department
ALTER TABLE public.daily_cash_balances 
ADD COLUMN IF NOT EXISTS handed_over_cash NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (handed_over_cash >= 0.00);
