import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// This is your regular client (uses Anon Key)
export function createClient() {
  const cookieStore = cookies()
  
  // Use bracket notation to read dynamically from runtime environment if available,
  // bypassing Next.js static build-time baking on the server.
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL'] || process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL'] || process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
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