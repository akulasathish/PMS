import { createClient } from '@supabase/supabase-js';

export function getSupabaseAdmin() {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL'] || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-key';

  // Explicitly log the raw environment variables as seen by the server
  console.log('DEBUG: Raw NEXT_PUBLIC_SUPABASE_URL in getSupabaseAdmin:', url);

  if (url === 'https://dummy.supabase.co') {
    console.warn('WARNING: NEXT_PUBLIC_SUPABASE_URL is missing or using dummy value during build-time!');
  }
  if (key === 'dummy-key') {
    console.warn('WARNING: SUPABASE_SERVICE_ROLE_KEY is missing or using dummy value during build-time!');
  }

  console.log('Server Supabase Admin URL:', url);

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

