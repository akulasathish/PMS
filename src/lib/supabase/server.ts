import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// This is your regular client (uses Anon Key)
export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // <--- The Master Key
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