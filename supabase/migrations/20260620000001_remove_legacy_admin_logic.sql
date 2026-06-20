-- Drop legacy admin-created owner provisioning trigger and function
DROP TRIGGER IF EXISTS on_owner_provisioned ON public.property_access CASCADE;
DROP FUNCTION IF EXISTS public.notify_owner_provisioned() CASCADE;

-- Drop legacy trial_ends_at column from profiles if it exists
ALTER TABLE public.profiles DROP COLUMN IF EXISTS trial_ends_at CASCADE;
