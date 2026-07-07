import { createBrowserClient } from '@supabase/ssr'

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  if (typeof window === 'undefined') {
    return createBrowserClient(url, anonKey);
  }

  if (!supabaseClient) {
    console.log('DEBUG: Client-side Supabase URL initialized in browser:', url);
    supabaseClient = createBrowserClient(url, anonKey);
  }
  
  return supabaseClient;
}