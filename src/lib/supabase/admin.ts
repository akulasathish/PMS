import { createClient } from '@supabase/supabase-js';

export function getSupabaseAdmin() {
  const url = (process.env['NEXT_PUBLIC_SUPABASE_URL'] || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const serviceKey = (
    process.env['SUPABASE_SERVICE_ROLE_KEY'] || 
    process.env.SUPABASE_SERVICE_ROLE_KEY || 
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
    ''
  ).trim();

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

