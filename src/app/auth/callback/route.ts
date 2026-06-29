import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // if "next" parameter is specified, use that as redirection path
  const next = searchParams.get('next') ?? '/dashboard/property-setup';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Refresh the route group middleware on redirection
      const response = NextResponse.redirect(`${origin}${next}`);
      return response;
    } else {
      console.error('Code exchange failed:', error);
    }
  }

  // Return the user to login page if verification token exchange fails
  return NextResponse.redirect(`${origin}/login?error=Could not verify your email link`);
}
