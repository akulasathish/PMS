-- Migration: Multi-Partner PG Property System & Partner Profit Engine
-- Date: 2026-07-29

-- 1. Create Partner Investment Shares Table
CREATE TABLE IF NOT EXISTS public.partner_investments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    partner_name VARCHAR(255) NOT NULL,
    partner_email VARCHAR(255),
    partner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    investment_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (investment_amount >= 0),
    share_percentage NUMERIC(5,2) NOT NULL CHECK (share_percentage >= 0 AND share_percentage <= 100),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Timestamped Expenses Table
CREATE TABLE IF NOT EXISTS public.timestamped_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'miscellaneous',
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(20) NOT NULL DEFAULT 'UPI' CHECK (payment_method IN ('Cash', 'UPI', 'Bank Transfer')),
    expense_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    business_date DATE NOT NULL DEFAULT CURRENT_DATE,
    receipt_url TEXT,
    logged_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create Staff Payroll Table (Chef, Helper, Housekeeping, etc.)
CREATE TABLE IF NOT EXISTS public.staff_payroll (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    staff_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Chef', 'Helper', 'Housekeeping', 'Security', 'Manager')),
    monthly_salary NUMERIC(10,2) NOT NULL CHECK (monthly_salary >= 0),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Paid', 'Partial')),
    paid_amount NUMERIC(10,2) DEFAULT 0.00,
    paid_date DATE,
    payment_method VARCHAR(20) CHECK (payment_method IN ('Cash', 'UPI', 'Bank Transfer')),
    business_month DATE NOT NULL,
    logged_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create PG Tenants Directory Table
CREATE TABLE IF NOT EXISTS public.pg_tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    bed_number VARCHAR(10),
    sharing_capacity INTEGER NOT NULL DEFAULT 2 CHECK (sharing_capacity BETWEEN 2 AND 5),
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    monthly_rent NUMERIC(10,2) NOT NULL,
    security_deposit NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    deposit_status VARCHAR(20) DEFAULT 'Held' CHECK (deposit_status IN ('Held', 'Refunded', 'Adjusted')),
    rent_due_day INTEGER NOT NULL DEFAULT 5 CHECK (rent_due_day BETWEEN 1 AND 31),
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Vacated', 'Notice')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Create Daily Closing Summary Snapshots Table
CREATE TABLE IF NOT EXISTS public.daily_closing_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    total_cash_collected NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total_upi_collected NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total_expenses_cash NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total_expenses_upi NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    net_cash_in_hand NUMERIC(10,2) GENERATED ALWAYS AS (total_cash_collected - total_expenses_cash) STORED,
    net_daily_profit NUMERIC(10,2) GENERATED ALWAYS AS ((total_cash_collected + total_upi_collected) - (total_expenses_cash + total_expenses_upi)) STORED,
    closed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(property_id, snapshot_date)
);

-- RLS POLICIES FOR SECURE ADMIN VS PARTNER ACCESS

ALTER TABLE public.partner_investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timestamped_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pg_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_closing_snapshots ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users associated with the property to read
CREATE POLICY "Allow authenticated property members to read partner_investments"
    ON public.partner_investments FOR SELECT TO authenticated
    USING (property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Allow admin to manage partner_investments"
    ON public.partner_investments FOR ALL TO authenticated
    USING (property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'super_admin')))
    WITH CHECK (property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'super_admin')));

CREATE POLICY "Allow authenticated property members to read expenses"
    ON public.timestamped_expenses FOR SELECT TO authenticated
    USING (property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Allow admin to manage expenses"
    ON public.timestamped_expenses FOR ALL TO authenticated
    USING (property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'super_admin')))
    WITH CHECK (property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'super_admin')));

CREATE POLICY "Allow authenticated property members to read payroll"
    ON public.staff_payroll FOR SELECT TO authenticated
    USING (property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Allow admin to manage payroll"
    ON public.staff_payroll FOR ALL TO authenticated
    USING (property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'super_admin')))
    WITH CHECK (property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'super_admin')));

CREATE POLICY "Allow authenticated property members to read tenants"
    ON public.pg_tenants FOR SELECT TO authenticated
    USING (property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Allow admin to manage tenants"
    ON public.pg_tenants FOR ALL TO authenticated
    USING (property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'super_admin')))
    WITH CHECK (property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'super_admin')));

CREATE POLICY "Allow authenticated property members to read snapshots"
    ON public.daily_closing_snapshots FOR SELECT TO authenticated
    USING (property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Allow admin to manage snapshots"
    ON public.daily_closing_snapshots FOR ALL TO authenticated
    USING (property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'super_admin')))
    WITH CHECK (property_id IN (SELECT property_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'super_admin')));

-- AUTOMATIC DEFAULT PARTNER INITIALIZATION TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.seed_default_partner_shares()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.partner_investments (property_id, partner_name, share_percentage)
    VALUES
        (NEW.id, 'Person 1', 28.30),
        (NEW.id, 'Person 2', 22.64),
        (NEW.id, 'Person 3', 18.87),
        (NEW.id, 'Person 4', 18.87),
        (NEW.id, 'Person 5', 11.32);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_seed_default_partner_shares ON public.properties;
CREATE TRIGGER trigger_seed_default_partner_shares
    AFTER INSERT ON public.properties
    FOR EACH ROW
    EXECUTE FUNCTION public.seed_default_partner_shares();
