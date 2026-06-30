import { createClient } from '@supabase/supabase-js';

export function getSupabaseAdmin() {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL'] || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Explicitly log the raw environment variables as seen by the server
  console.log('DEBUG: Raw NEXT_PUBLIC_SUPABASE_URL in getSupabaseAdmin:', url);
  console.log('DEBUG: Raw SUPABASE_SERVICE_ROLE_KEY in getSupabaseAdmin:', key);

  if (!url) {
    console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL is missing!');
    throw new Error('Missing Supabase admin URL environment variable');
  }
  if (!key) {
    console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY is missing!');
    throw new Error('Missing Supabase admin service role key environment variable');
  }

  console.log('Server Supabase Admin URL:', url);
  console.log('Server Supabase Service Role Key:', key); // Log FULL key for debugging

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

