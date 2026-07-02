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
  const now = new Date();

  console.log('Middleware Path:', pathname);
  console.log('Middleware User:', user ? user.id : 'No user');

  // Define public paths that don't require authentication
  const publicPaths = ['/', '/login', '/signup', '/auth/callback'];
  
  // Allow access to public paths
  if (publicPaths.includes(pathname)) {
    return response;
  }

  // Handle authenticated users and protected routes
  if (pathname.startsWith('/dashboard')) {
    // If not authenticated, redirect to login
    if (!user) {
      console.log('-> Redirecting unauthenticated user to login.');
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect_to', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('property_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('-> Middleware: Error fetching profile or profile not found:', profileError?.message);
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL('/login?error=profile_missing', request.url));
    }
    
    const propertyId = profile.property_id;

    console.log('Middleware Profile:', profile);
    console.log('Middleware Property ID:', propertyId);

    // If user has no property and is not on property setup page, redirect to property setup
    if (!propertyId && pathname !== '/dashboard/property-setup') {
      console.log('-> Redirecting to property setup: No property found for user.');
      return NextResponse.redirect(new URL('/dashboard/property-setup', request.url));
    }
  }

  // For any other authenticated paths that might be introduced later, redirect if not authenticated
  if (!user && !publicPaths.includes(pathname)) {
    console.log('-> Redirecting unauthenticated user from protected path to login.');
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect_to', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  return response
}

export const config = {
  matcher: ['/', '/login', '/signup', '/auth/callback', '/dashboard/:path*'],
}
