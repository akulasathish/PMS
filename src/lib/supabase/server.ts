import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// This is your regular client (uses Anon Key)
export function createClient() {
  const cookieStore = cookies()
  
  const url = (process.env['NEXT_PUBLIC_SUPABASE_URL'] || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co').trim();
  const anonKey = (process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key').trim();

  console.log('DEBUG: Server-side createClient URL initialized:', url);

  return createServerClient(
    url,
    anonKey,
    {
      cookies: {
        async get(name: string) { return (await cookieStore).get(name)?.value },
        async set(name: string, value: string, options: CookieOptions) {
          try { (await cookieStore).set({ name, value, ...options }) } catch {}
        },
        async remove(name: string, options: CookieOptions) {
          try { (await cookieStore).set({ name, value: '', ...options }) } catch {}
        },
      },
    }
  )
}

// ADD THIS: The Admin Client (uses Service Role Key)
export function createAdminClient() {
  const cookieStore = cookies()
  const url = (process.env['NEXT_PUBLIC_SUPABASE_URL'] || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-key').trim();
  
  return createServerClient(
    url,
    key, // <--- The Master Key
    {
      cookies: {
        async get(name: string) { return (await cookieStore).get(name)?.value },
        async set(name: string, value: string, options: CookieOptions) {
          try { (await cookieStore).set({ name, value, ...options }) } catch {}
        },
        async remove(name: string, options: CookieOptions) {
          try { (await cookieStore).set({ name, value: '', ...options }) } catch {}
        },
      },
    }
  )
}