-- Migration: Add Property Category & Dynamic Partner Capital Investment
-- Date: 2026-07-29

-- 1. Add property_category and total_capital_investment to public.properties
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS property_category VARCHAR(20) DEFAULT 'Hybrid' CHECK (property_category IN ('PG', 'Hotel', 'Hybrid')),
ADD COLUMN IF NOT EXISTS total_capital_investment NUMERIC(14,2) DEFAULT 0.00 CHECK (total_capital_investment >= 0);

-- 2. Enhance partner_investments table with investment_amount
ALTER TABLE public.partner_investments
ADD COLUMN IF NOT EXISTS investment_amount NUMERIC(14,2) DEFAULT 0.00 CHECK (investment_amount >= 0),
ADD COLUMN IF NOT EXISTS partner_phone VARCHAR(20);

-- 3. Automatic Partner Percentage Calculation Trigger
CREATE OR REPLACE FUNCTION public.recalculate_partner_percentages()
RETURNS TRIGGER AS $$
DECLARE
    prop_capital NUMERIC(14,2);
BEGIN
    SELECT total_capital_investment INTO prop_capital 
    FROM public.properties WHERE id = NEW.property_id;

    IF prop_capital IS NOT NULL AND prop_capital > 0 AND NEW.investment_amount IS NOT NULL AND NEW.investment_amount > 0 THEN
        NEW.share_percentage := ROUND((NEW.investment_amount / prop_capital) * 100, 2);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto recalculating partner percentage on insert/update
DROP TRIGGER IF EXISTS trigger_recalculate_partner_percentages ON public.partner_investments;
CREATE TRIGGER trigger_recalculate_partner_percentages
    BEFORE INSERT OR UPDATE ON public.partner_investments
    FOR EACH ROW
    EXECUTE FUNCTION public.recalculate_partner_percentages();
