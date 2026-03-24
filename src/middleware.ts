import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Protect /admin routes (Tier 1)
  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') return response
    if (!user || user.user_metadata?.role !== 'admin') {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  // Protect /dashboard routes (Tier 2)
  if (pathname.startsWith('/dashboard')) {
    if (pathname === '/dashboard/login') return response
    if (!user || user.user_metadata?.role !== 'owner') {
      return NextResponse.redirect(new URL('/dashboard/login', request.url))
    }
  }

  // Protect /front-desk routes (Tier 3)
  if (pathname.startsWith('/front-desk')) {
    if (pathname === '/front-desk/login') return response
    if (!user || (user.user_metadata?.role !== 'front-desk' && user.user_metadata?.role !== 'staff')) {
      return NextResponse.redirect(new URL('/front-desk/login', request.url))
    }
  }

  // Check property suspension for non-admin users
  if (user && user.user_metadata?.role !== 'admin' && !pathname.endsWith('/login')) {
    const { data: profile } = await supabase.from('profiles').select('property_id').eq('id', user.id).single()
    if (profile?.property_id) {
      const { data: property } = await supabase.from('properties').select('status').eq('id', profile.property_id).single()
      if (property?.status === 'Suspended') {
        return NextResponse.redirect(new URL('/payment-required', request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/front-desk/:path*'],
}
