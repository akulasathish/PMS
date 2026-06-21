-- Force delete any corrupted user state for provider@pms.com
DELETE FROM public.profiles WHERE email = 'provider@pms.com';
DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'provider@pms.com');
DELETE FROM auth.sessions WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'provider@pms.com');
DELETE FROM auth.users WHERE email = 'provider@pms.com';
