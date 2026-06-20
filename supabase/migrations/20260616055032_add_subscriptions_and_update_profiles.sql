
-- Create the subscriptions table
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL, -- Optional, if one subscription per user can cover multiple properties or if initial property is linked.
    plan_type TEXT NOT NULL, -- e.g., 'free_trial', '1_month', '3_month', '6_month', '1_year'
    start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    end_date TIMESTAMPTZ NOT NULL,
    grace_period_ends_at TIMESTAMPTZ, -- New column for grace period
    status TEXT NOT NULL DEFAULT 'trialing', -- e.g., 'active', 'trialing', 'cancelled', 'expired'
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add RLS to subscriptions table
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and manage their own subscriptions." ON public.subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Update the profiles table
ALTER TABLE public.profiles
ADD COLUMN current_subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
ADD COLUMN trial_ends_at TIMESTAMPTZ;

-- Optional: Create a function to update `updated_at` column automatically
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;   
END;
$$ language 'plpgsql';

-- Optional: Create a trigger for the subscriptions table to update `updated_at`
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Optional: Create a trigger for the profiles table to update `updated_at` (if it exists)
-- Assuming profiles table already has an updated_at column or you add one.
-- If profiles already has a trigger, merge this logic.
-- ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
-- CREATE TRIGGER update_profiles_updated_at
-- BEFORE UPDATE ON public.profiles
-- FOR EACH ROW
-- EXECUTE FUNCTION public.update_updated_at_column();
