import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Bypass public static routes instantly without network calls
  const publicPaths = ['/', '/login', '/signup', '/auth/callback'];
  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  // 2. Fast check for protected dashboard routes using session cookie
  if (pathname.startsWith('/dashboard')) {
    const hasAuthCookie = request.cookies.getAll().some(c => c.name.includes('auth-token') || c.name.includes('sb-'));
    if (!hasAuthCookie) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect_to', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
