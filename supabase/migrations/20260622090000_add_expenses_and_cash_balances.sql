-- Migration: Add Expenses and Daily Cash Drawer Balances

-- 1. Create expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash', 'UPI')),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (RLS) on expenses
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Create policies for expenses
CREATE POLICY "Allow authenticated users to manage expenses"
    ON public.expenses FOR ALL
    TO authenticated
    USING (property_id IN (
        SELECT property_id FROM public.profiles WHERE id = auth.uid()
    ))
    WITH CHECK (property_id IN (
        SELECT property_id FROM public.profiles WHERE id = auth.uid()
    ));

-- 2. Create daily_cash_balances table
CREATE TABLE IF NOT EXISTS public.daily_cash_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    opening_cash NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (opening_cash >= 0),
    closing_cash NUMERIC(10,2) CHECK (closing_cash >= 0),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (property_id, date)
);

-- Enable Row Level Security (RLS) on daily_cash_balances
ALTER TABLE public.daily_cash_balances ENABLE ROW LEVEL SECURITY;

-- Create policies for daily_cash_balances
CREATE POLICY "Allow authenticated users to manage daily_cash_balances"
    ON public.daily_cash_balances FOR ALL
    TO authenticated
    USING (property_id IN (
        SELECT property_id FROM public.profiles WHERE id = auth.uid()
    ))
    WITH CHECK (property_id IN (
        SELECT property_id FROM public.profiles WHERE id = auth.uid()
    ));
