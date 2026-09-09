import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get('host') || '';

  // 1. Handle Subdomain Routing (e.g. pg.staysync.online or pg.localhost:3000)
  const isPgSubdomain = host.startsWith('pg.') || host.includes('pg.staysync');
  if (isPgSubdomain) {
    if (pathname === '/') {
      return NextResponse.rewrite(new URL('/pg', request.url));
    }
    if (!pathname.startsWith('/pg') && !pathname.startsWith('/_next') && !pathname.includes('.')) {
      return NextResponse.rewrite(new URL(`/pg${pathname}`, request.url));
    }
  }

  // 2. Bypass public routes
  const publicPaths = ['/', '/pg', '/login', '/signup', '/auth/callback'];
  if (publicPaths.includes(pathname) || pathname.startsWith('/pg')) {
    return NextResponse.next();
  }

  // 3. Protected dashboard routes
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
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
