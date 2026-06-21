-- 1. Remove foreign key constraints and columns related to subscriptions/tiers
ALTER TABLE public.profiles DROP COLUMN IF EXISTS current_subscription_id;
ALTER TABLE public.properties DROP COLUMN IF EXISTS tier;

-- 2. Drop the subscriptions table if it exists
DROP TABLE IF EXISTS public.subscriptions CASCADE;

-- 3. Cleanup RLS policies or triggers if they existed (optional, but good practice)
-- If there were specific triggers for subscriptions, they would be removed by DROP TABLE CASCADE above.
