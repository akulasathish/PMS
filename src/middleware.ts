import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /admin routes (Tier 1)
  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') return NextResponse.next();
    const session = request.cookies.get('admin_session');
    if (!session || session.value !== 'pms_secure_entry_2026') {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // Protect /dashboard routes (Tier 2)
  if (pathname.startsWith('/dashboard')) {
    if (pathname === '/dashboard/login') return NextResponse.next();
    const session = request.cookies.get('owner_session');
    if (!session || session.value !== 'owner_secure_entry_2026') {
      return NextResponse.redirect(new URL('/dashboard/login', request.url));
    }
  }

  // Protect /front-desk routes (Tier 3)
  if (pathname.startsWith('/front-desk')) {
    if (pathname === '/front-desk/login') return NextResponse.next();
    const session = request.cookies.get('frontdesk_session');
    if (!session || session.value !== 'fd_secure_entry_2026') {
      return NextResponse.redirect(new URL('/front-desk/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/front-desk/:path*'],
};
