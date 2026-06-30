import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  if (typeof window !== 'undefined') {
    console.log('DEBUG: Client-side Supabase URL initialized in browser:', url);
  }
  
  return createBrowserClient(url, anonKey)
}